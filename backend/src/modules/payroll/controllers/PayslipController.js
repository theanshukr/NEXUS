import PayrollRunService from '../services/PayrollRunService.js';
import EmployeeRepository from '#@/modules/employees/repositories/EmployeeRepository.js';
import { ValidationError, NotFoundError } from '#@/core/errors/AppError.js';

export const openApiMetadata = {
  getPayslip: { summary: 'Get Payslip', description: 'Retrieves immutable payslip with embedded snapshots', tags: ['Payslip'] },
  listByRun: { summary: 'List Run Payslips', description: 'Lists all payslips generated in a specific payroll run', tags: ['Payslip'] },
  listByEmployee: { summary: 'List Employee Payslips', description: 'Lists historical payslips for a specific employee', tags: ['Payslip'] },
  getMyPayslips: { summary: 'Get My Payslips', description: 'Lists historical payslips for the authenticated employee', tags: ['Payslip'] },
  finalizePayslip: { summary: 'Finalize Payslip', description: 'Transitions individual payslip from DRAFT to FINALIZED status', tags: ['Payslip'] }
};

export class PayslipController {
  async getPayslip(req, res, next) {
    try {
      const payslip = await PayrollRunService.getPayslipById(req.params.id, req.user.organizationId);
      res.status(200).json({ success: true, data: payslip });
    } catch (error) { next(error); }
  }

  async getMyPayslips(req, res, next) {
    try {
      const { organizationId, userId } = req.user;
      const employee = await EmployeeRepository.findByUserId(userId, organizationId);
      if (!employee) throw new NotFoundError('Employee profile not found.');

      const payslips = await PayrollRunService.listEmployeePayslips(employee._id, organizationId);
      res.status(200).json({ success: true, data: payslips });
    } catch (error) { next(error); }
  }

  async listByRun(req, res, next) {
    try {
      const payslips = await PayrollRunService.listPayslipsForRun(req.params.runId, req.user.organizationId);
      res.status(200).json({ success: true, data: payslips });
    } catch (error) { next(error); }
  }

  async listByEmployee(req, res, next) {
    try {
      const payslips = await PayrollRunService.listEmployeePayslips(req.params.employeeId, req.user.organizationId);
      res.status(200).json({ success: true, data: payslips });
    } catch (error) { next(error); }
  }

  async finalizePayslip(req, res, next) {
    try {
      const updated = await PayrollRunService.finalizePayslip(req.params.id, req.user.organizationId);
      res.status(200).json({ success: true, data: updated });
    } catch (error) { next(error); }
  }
}

export default new PayslipController();
