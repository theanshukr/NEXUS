import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest';
import mongoose from 'mongoose';
import { startDb, clearDb, stopDb } from '../../setup/db.js';

import {
  PayrollCycleService,
  SalaryStructureService,
  PayrollRunService
} from '#@/modules/payroll/services/index.js';
import EmployeeRepository from '#@/modules/employees/repositories/EmployeeRepository.js';
import { ConflictError } from '#@/core/errors/AppError.js';

vi.mock('#@/modules/audit/services/AuditService.js');
vi.mock('#@/core/events/EventBus.js');

describe('E2E Payroll Engine Lifecycle Integration Test', () => {
  const orgId = new mongoose.Types.ObjectId().toString();
  const actorId = new mongoose.Types.ObjectId().toString();

  beforeAll(async () => {
    await startDb();
  });

  afterEach(async () => {
    await clearDb();
    vi.clearAllMocks();
  });

  afterAll(async () => {
    await stopDb();
  });

  it('should complete a full payroll lifecycle: Structure ➔ Cycle ➔ Run ➔ Finalize ➔ Lock', async () => {
    // 1. Create an Employee
    const emp = await EmployeeRepository.createScoped({
      firstName: 'John',
      lastName: 'Doe',
      workEmail: 'john.doe@enterprise.com',
      employeeCode: 'EMP-001',
      joiningDate: new Date('2025-01-01'),
      status: 'ACTIVE',
      departmentId: new mongoose.Types.ObjectId(),
      designationId: new mongoose.Types.ObjectId(),
      locationId: new mongoose.Types.ObjectId(),
      shiftId: new mongoose.Types.ObjectId()
    }, orgId);

    // 2. Create Salary Structure (Employee Override)
    const { structure } = await SalaryStructureService.createStructure({
      employeeId: emp._id,
      baseSalary: 50000,
      components: [
        { name: 'HRA', type: 'EARNING', calculationType: 'PERCENTAGE_OF_BASE', amount: 40 },
        { name: 'Professional Tax', type: 'DEDUCTION', calculationType: 'FIXED', amount: 200 }
      ],
      reason: 'INITIAL_ONBOARDING',
      effectiveFrom: new Date('2026-01-01')
    }, actorId, orgId);

    expect(structure.status).toBe('ACTIVE');
    expect(structure.version).toBe(1);

    // 3. Create Payroll Cycle
    const cycle = await PayrollCycleService.createCycle({
      cycleIdentifier: '2026-M01',
      cycleStart: '2026-01-01',
      cycleEnd: '2026-01-31',
      payFrequency: 'MONTHLY',
      payDate: '2026-01-31'
    }, orgId);

    expect(cycle.status).toBe('OPEN');

    // 4. Execute Payroll Run
    const { run, generatedPayslipsCount } = await PayrollRunService.createRun(cycle._id, actorId, orgId);

    expect(run.status).toBe('COMPLETED');
    expect(generatedPayslipsCount).toBe(1);

    // Base: 50000, HRA (40%): 20000 ➔ Gross Pay: 70000
    // Deductions: Professional Tax: 200 ➔ Net Pay: 69800
    expect(run.totalGross).toBe(70000);
    expect(run.totalNet).toBe(69800);

    // 5. Verify Generated Payslip
    const payslips = await PayrollRunService.listPayslipsForRun(run._id, orgId);
    expect(payslips).toHaveLength(1);
    expect(payslips[0].status).toBe('DRAFT');
    expect(payslips[0].grossPay).toBe(70000);
    expect(payslips[0].netPay).toBe(69800);
    expect(payslips[0].engineVersion).toBe('1.0.0');

    // 6. Bulk Finalize Payslips
    const finRes = await PayrollRunService.finalizeAllPayslips(run._id, orgId);
    expect(finRes.finalizedCount).toBe(1);

    const updatedPayslips = await PayrollRunService.listPayslipsForRun(run._id, orgId);
    expect(updatedPayslips[0].status).toBe('FINALIZED');

    // 7. Lock Payroll Run & Cycle
    const lockRes = await PayrollRunService.lockRun(run._id, actorId, orgId);
    expect(lockRes.status).toBe('LOCKED');

    const lockedRun = await PayrollRunService.getRunById(run._id, orgId);
    const lockedCycle = await PayrollCycleService.getCycleById(cycle._id, orgId);

    expect(lockedRun.status).toBe('LOCKED');
    expect(lockedCycle.status).toBe('LOCKED');
  });

  it('should enforce concurrency safety by rejecting a second active PayrollRun for the same cycle with 409 Conflict', async () => {
    const cycle = await PayrollCycleService.createCycle({
      cycleIdentifier: '2026-M07',
      cycleStart: '2026-07-01',
      cycleEnd: '2026-07-31',
      payFrequency: 'MONTHLY',
      payDate: '2026-07-31'
    }, orgId);

    // First manager starts run successfully
    const { run } = await PayrollRunService.createRun(cycle._id, actorId, orgId);
    expect(run.status).toBe('COMPLETED');

    // Second manager attempts run for the same cycle
    await expect(PayrollRunService.createRun(cycle._id, actorId, orgId))
      .rejects.toThrow(ConflictError);
  });

  it('should resolve point-in-time salary structure effective as of the payroll cycle end date (Cross-cycle resolution)', async () => {
    const emp = await EmployeeRepository.createScoped({
      firstName: 'Jane',
      lastName: 'Smith',
      workEmail: 'jane.smith@enterprise.com',
      employeeCode: 'EMP-002',
      joiningDate: new Date('2025-01-01'),
      status: 'ACTIVE',
      departmentId: new mongoose.Types.ObjectId(),
      designationId: new mongoose.Types.ObjectId(),
      locationId: new mongoose.Types.ObjectId(),
      shiftId: new mongoose.Types.ObjectId()
    }, orgId);

    // Salary v1 Effective Jan 1 ($50,000)
    await SalaryStructureService.createStructure({
      employeeId: emp._id,
      baseSalary: 50000,
      components: [],
      reason: 'JAN_SALARY',
      effectiveFrom: new Date('2026-01-01')
    }, actorId, orgId);

    // Salary v2 Effective Jul 15 ($80,000) - supersedes v1 setting effectiveTo = Jul 15
    await SalaryStructureService.createStructure({
      employeeId: emp._id,
      baseSalary: 80000,
      components: [],
      reason: 'JUL_PROMOTION',
      effectiveFrom: new Date('2026-07-15')
    }, actorId, orgId);

    // Create June Cycle (ending June 30)
    const juneCycle = await PayrollCycleService.createCycle({
      cycleIdentifier: '2026-M06',
      cycleStart: '2026-06-01',
      cycleEnd: '2026-06-30',
      payFrequency: 'MONTHLY',
      payDate: '2026-06-30'
    }, orgId);

    // Execute Payroll Run for June cycle
    // Even though v2 ($80,000) is currently ACTIVE, the June run must resolve v1 ($50,000) active on June 30
    const juneRunRes = await PayrollRunService.createRun(juneCycle._id, actorId, orgId);
    expect(juneRunRes.run.totalGross).toBe(50000);

    // Create July Cycle (ending July 31)
    const julyCycle = await PayrollCycleService.createCycle({
      cycleIdentifier: '2026-M07-PROMO',
      cycleStart: '2026-07-01',
      cycleEnd: '2026-07-31',
      payFrequency: 'MONTHLY',
      payDate: '2026-07-31'
    }, orgId);

    // Execute Payroll Run for July cycle
    // Must resolve v2 ($80,000) active on July 31
    const julyRunRes = await PayrollRunService.createRun(julyCycle._id, actorId, orgId);
    expect(julyRunRes.run.totalGross).toBe(80000);
  });
});
