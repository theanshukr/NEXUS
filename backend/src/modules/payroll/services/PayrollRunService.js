import PayrollRunRepository from '../repositories/PayrollRunRepository.js';
import PayslipRepository from '../repositories/PayslipRepository.js';
import PayrollCycleRepository from '../repositories/PayrollCycleRepository.js';
import StatutoryRuleRepository from '../repositories/StatutoryRuleRepository.js';
import PayrollAdjustmentRepository from '../repositories/PayrollAdjustmentRepository.js';
import OrganizationSettingsRepository from '#@/modules/organization/repositories/OrganizationSettingsRepository.js';
import EmployeeRepository from '#@/modules/employees/repositories/EmployeeRepository.js';
import LeaveBalanceSnapshotRepository from '#@/modules/leave/repositories/LeaveBalanceSnapshotRepository.js';
import LeaveSnapshotService from '#@/modules/leave/services/LeaveSnapshotService.js';
import AttendanceReconciliationService from '#@/modules/attendance/services/AttendanceReconciliationService.js';
import PayrollFormulaService from './PayrollFormulaService.js';
import SalaryStructureService from './SalaryStructureService.js';
import PayrollCalculationEngine from './PayrollCalculationEngine.js';
import PayrollStateMachineService from './PayrollStateMachineService.js';
import { runInTransaction } from '#@/platform/database/db.js';
import { AppError, NotFoundError, ConflictError } from '#@/core/errors/AppError.js';
import logger from '#@/platform/logger/index.js';
import EventBus from '#@/core/events/EventBus.js';
import PAYROLL_EVENTS from '#@/core/constants/events/payroll.js';

export class PayrollRunService {
  constructor(
    runRepo = new PayrollRunRepository(),
    payslipRepo = new PayslipRepository(),
    cycleRepo = new PayrollCycleRepository(),
    statutoryRepo = new StatutoryRuleRepository(),
    adjustmentRepo = new PayrollAdjustmentRepository()
  ) {
    this.runRepo = runRepo;
    this.payslipRepo = payslipRepo;
    this.cycleRepo = cycleRepo;
    this.statutoryRepo = statutoryRepo;
    this.adjustmentRepo = adjustmentRepo;
  }

  /**
   * Orchestrates batch payroll execution for a PayrollCycle.
   */
  async createRun(payrollCycleId, actorId, organizationId, options = {}) {
    const cycle = await this.cycleRepo.findByIdAndTenant(payrollCycleId, organizationId, options);
    if (!cycle) throw new AppError('Payroll cycle not found', 404);

    const activeRun = await this.runRepo.findOne({
      payrollCycleId: cycle._id,
      status: { $in: ['DRAFT', 'PROCESSING', 'COMPLETED', 'LOCKED'] }
    }, organizationId, options);
    if (activeRun) {
      throw new ConflictError(`An active payroll run already exists for this cycle in state [${activeRun.status}].`);
    }

    if (cycle.status !== 'OPEN' && cycle.status !== 'PROCESSING') {
      throw new AppError(`Cannot start payroll run for cycle in [${cycle.status}] state`, 400);
    }

    // 1. Verify Attendance Reconciliation Status
    let attendanceRecords = [];
    try {
      await AttendanceReconciliationService.assertAllRecordsFinalized(organizationId, cycle.cycleStart, cycle.cycleEnd);
      attendanceRecords = await AttendanceReconciliationService.getPayrollFeed(organizationId, cycle.cycleStart, cycle.cycleEnd);
    } catch (err) {
      if (err instanceof NotFoundError) {
        logger.info({ organizationId, cycleIdentifier: cycle.cycleIdentifier }, 'No attendance records found for cycle period; proceeding with default attendance assumptions');
      } else {
        throw err; // Rethrow ConflictError if unfinalized records exist
      }
    }

    // 2. Fetch Active Rules, Formula, and Settings
    const formula = await PayrollFormulaService.getActiveFormula(organizationId, options);
    const statutoryRules = await this.statutoryRepo.findActiveRules(organizationId, options);
    let orgSettings = await OrganizationSettingsRepository.findOne({}, organizationId, options);
    if (!orgSettings) orgSettings = { currency: cycle.currency };

    // 3. Construct Run-Level Input Snapshot
    const payrollInputSnapshot = {
      formulaVersion: formula ? formula.version : 1,
      statutoryRuleVersions: statutoryRules.map(r => ({
        name: r.name,
        type: r.type,
        configuration: r.configuration
      })),
      organizationSettings: {
        currency: orgSettings.currency || cycle.currency,
        timezone: orgSettings.timezone || 'UTC'
      },
      generatedAt: new Date()
    };

    // 4. Create PayrollRun in PROCESSING status
    let run;
    try {
      run = await this.runRepo.createScoped({
        payrollCycleId: cycle._id,
        status: 'PROCESSING',
        runByUserId: actorId,
        payrollInputSnapshot,
        totalGross: 0,
        totalNet: 0
      }, organizationId, options);
    } catch (err) {
      if (err.code === 11000) {
        throw new ConflictError('An active payroll run already exists for this payroll cycle.');
      }
      throw err;
    }

    if (cycle.status === 'OPEN') {
      await this.cycleRepo.updateByIdAndTenant(cycle._id, { status: 'PROCESSING' }, organizationId, options);
    }

    // 5. Execute Calculation & Batch Insert inside ACID Transaction
    let totalGross = 0;
    let totalNet = 0;
    let generatedPayslipsCount = 0;

    await runInTransaction(async (session) => {
      // Clean up previous DRAFT payslips if re-running
      await this.payslipRepo.deleteByRunAndDraftStatus(run._id, organizationId, { session });

      const employees = await EmployeeRepository.find({ archivedAt: null }, organizationId, { session });
      const payslipsToInsert = [];
      const adjustmentIdsToProcess = [];

      for (const emp of employees) {
        const structure = await SalaryStructureService.resolveForEmployee(emp, organizationId, { session, effectiveDate: cycle.cycleEnd });
        if (!structure) {
          logger.warn({ employeeId: emp._id }, 'Skipping employee without active salary structure during payroll run');
          continue;
        }

        // Aggregate Attendance for Employee
        const empAttendance = attendanceRecords.filter(r => String(r.employeeId) === String(emp._id));
        const presentDays = empAttendance.length;
        const lopDays = empAttendance.reduce((sum, r) => sum + (r.policySnapshot?.lopDays || 0), 0);
        const overtimeHours = empAttendance.reduce((sum, r) => sum + (r.workingHours > 8 ? r.workingHours - 8 : 0), 0);

        // Fetch Leave Snapshot
        const leaveSnap = await LeaveBalanceSnapshotRepository.getEmployeeSnapshotForCycle(
          organizationId,
          emp._id,
          cycle.cycleIdentifier
        );

        // Fetch Pending Adjustments
        const adjustments = await this.adjustmentRepo.findPendingByEmployeeAndCycle(
          emp._id,
          cycle._id,
          organizationId,
          { session }
        );

        adjustments.forEach(adj => adjustmentIdsToProcess.push(adj._id));

        const salarySnapshot = {
          baseSalary: structure.baseSalary,
          components: structure.components || []
        };
        const attendanceSnapshot = {
          totalWorkingDays: 30,
          presentDays: presentDays > 0 ? presentDays : 30,
          lopDays,
          overtimeHours
        };
        const leaveSnapshot = {
          paidLeaveDays: leaveSnap?.balances?.paid || 0,
          unpaidLeaveDays: leaveSnap?.balances?.unpaid || 0
        };

        const calcResult = PayrollCalculationEngine.calculate({
          salarySnapshot,
          attendanceSnapshot,
          leaveSnapshot,
          statutoryRules,
          formula: formula || {},
          adjustments
        });

        totalGross += calcResult.grossPay;
        totalNet += calcResult.netPay;

        payslipsToInsert.push({
          organizationId,
          payrollRunId: run._id,
          payrollCycleId: cycle._id,
          employeeId: emp._id,
          status: 'DRAFT',
          breakdown: calcResult.breakdown,
          netPay: calcResult.netPay,
          grossPay: calcResult.grossPay,
          currency: cycle.currency,
          salaryStructureSnapshot: salarySnapshot,
          attendanceSnapshot,
          leaveSnapshot,
          taxSnapshot: calcResult.breakdown.deductions,
          formulaVersionSnapshot: formula ? formula.version : 1,
          engineVersion: '1.0.0'
        });
      }

      if (payslipsToInsert.length > 0) {
        await this.payslipRepo.createManyScoped(payslipsToInsert, organizationId, { session });
        generatedPayslipsCount = payslipsToInsert.length;
      }

      if (adjustmentIdsToProcess.length > 0) {
        await this.adjustmentRepo.markProcessed(adjustmentIdsToProcess, organizationId, { session });
      }

      run = await this.runRepo.updateByIdAndTenant(run._id, {
        status: 'COMPLETED',
        totalGross: Math.round(totalGross * 100) / 100,
        totalNet: Math.round(totalNet * 100) / 100
      }, organizationId, { session });

      await this.cycleRepo.updateByIdAndTenant(cycle._id, { status: 'COMPLETED' }, organizationId, { session });
    });

    try {
      EventBus.emit(PAYROLL_EVENTS.RUN_COMPLETED, {
        organizationId,
        runId: run._id,
        payrollCycleId: cycle._id,
        totalGross: run.totalGross,
        totalNet: run.totalNet,
        payslipsCount: generatedPayslipsCount
      });
      EventBus.emit(PAYROLL_EVENTS.PAYSLIPS_GENERATED, {
        organizationId,
        runId: run._id,
        count: generatedPayslipsCount
      });
    } catch (err) {
      logger.error({ err }, 'Failed to emit payroll run completion events');
    }

    return { run, generatedPayslipsCount };
  }

  /**
   * Finalizes individual payslip.
   */
  async finalizePayslip(payslipId, organizationId, options = {}) {
    const payslip = await this.payslipRepo.findByIdAndTenant(payslipId, organizationId, options);
    if (!payslip) throw new AppError('Payslip not found', 404);

    PayrollStateMachineService.validateTransition('Payslip', payslip.status, 'FINALIZED');

    const updated = await this.payslipRepo.updateByIdAndTenant(payslip._id, {
      status: 'FINALIZED'
    }, organizationId, options);

    try {
      EventBus.emit(PAYROLL_EVENTS.PAYSLIP_FINALIZED, {
        organizationId,
        payslipId: updated._id,
        employeeId: updated.employeeId,
        netPay: updated.netPay
      });
    } catch (err) {
      logger.error({ err }, 'Failed to emit PAYROLL.PAYSLIP_FINALIZED event');
    }

    return updated;
  }

  /**
   * Finalizes all payslips in a completed payroll run.
   */
  async finalizeAllPayslips(payrollRunId, organizationId, options = {}) {
    const run = await this.runRepo.findByIdAndTenant(payrollRunId, organizationId, options);
    if (!run) throw new AppError('Payroll run not found', 404);

    if (run.status !== 'COMPLETED') {
      throw new AppError(`Cannot finalize payslips for a run in [${run.status}] state`, 400);
    }

    const payslips = await this.payslipRepo.findByRun(run._id, organizationId, options);
    let finalizedCount = 0;

    await runInTransaction(async (session) => {
      for (const p of payslips) {
        if (p.status !== 'FINALIZED') {
          await this.payslipRepo.updateByIdAndTenant(p._id, { status: 'FINALIZED' }, organizationId, { session });
          finalizedCount++;
        }
      }
    });

    return { success: true, finalizedCount };
  }

  /**
   * Locks the payroll run, payroll cycle, attendance records, and captures leave balance snapshots.
   */
  async lockRun(payrollRunId, actorId, organizationId, options = {}) {
    const run = await this.runRepo.findByIdAndTenant(payrollRunId, organizationId, options);
    if (!run) throw new AppError('Payroll run not found', 404);

    PayrollStateMachineService.validateTransition('PayrollRun', run.status, 'LOCKED');

    const cycle = await this.cycleRepo.findByIdAndTenant(run.payrollCycleId, organizationId, options);
    if (!cycle) throw new AppError('Associated payroll cycle not found', 404);

    PayrollStateMachineService.validateTransition('PayrollCycle', cycle.status, 'LOCKED');

    // Ensure all payslips in the run are finalized before locking
    const payslips = await this.payslipRepo.findByRun(run._id, organizationId, options);
    const unfinalized = payslips.filter(p => p.status !== 'FINALIZED');
    if (unfinalized.length > 0) {
      throw new ConflictError(`Cannot lock payroll run: ${unfinalized.length} payslips are still DRAFT. Finalize all payslips first.`);
    }

    await runInTransaction(async (session) => {
      await this.runRepo.updateByIdAndTenant(run._id, { status: 'LOCKED' }, organizationId, { session });
      await this.cycleRepo.updateByIdAndTenant(cycle._id, { status: 'LOCKED' }, organizationId, { session });

      // Lock M-05 Attendance Pay Period
      try {
        await AttendanceReconciliationService.lockPayPeriod(organizationId, cycle.cycleStart, cycle.cycleEnd, run._id, actorId);
      } catch (err) {
        if (!(err instanceof NotFoundError)) throw err;
      }

      // Take M-06 Leave Snapshots
      try {
        await LeaveSnapshotService.takeSnapshotForPayrollCycle(organizationId, cycle.cycleIdentifier, new Date(cycle.cycleStart), new Date(cycle.cycleEnd));
      } catch (err) {
        logger.warn({ err }, 'Leave snapshot failed during payroll run lock');
      }
    });

    try {
      EventBus.emit(PAYROLL_EVENTS.RUN_LOCKED, {
        organizationId,
        runId: run._id,
        payrollCycleId: cycle._id,
        actorId
      });
    } catch (err) {
      logger.error({ err }, 'Failed to emit PAYROLL.RUN_LOCKED event');
    }

    return { success: true, status: 'LOCKED' };
  }

  async getRunById(runId, organizationId, options = {}) {
    const run = await this.runRepo.findByIdAndTenant(runId, organizationId, options);
    if (!run) throw new AppError('Payroll run not found', 404);
    return run;
  }

  async listRuns(organizationId, options = {}) {
    return await this.runRepo.find({}, organizationId, { sort: { createdAt: -1 }, ...options });
  }

  async getPayslipById(payslipId, organizationId, options = {}) {
    const payslip = await this.payslipRepo.findByIdAndTenant(payslipId, organizationId, options);
    if (!payslip) throw new AppError('Payslip not found', 404);
    return payslip;
  }

  async listPayslipsForRun(payrollRunId, organizationId, options = {}) {
    return await this.payslipRepo.findByRun(payrollRunId, organizationId, options);
  }

  async listEmployeePayslips(employeeId, organizationId, options = {}) {
    return await this.payslipRepo.findByEmployee(employeeId, organizationId, options);
  }
}

export default new PayrollRunService();
