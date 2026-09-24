import PayrollRunService from '../services/PayrollRunService.js';
import NotificationService from '../../notifications/services/NotificationService.js';
import { ValidationError } from '#@/core/errors/AppError.js';

export const openApiMetadata = {
  createRun: {
    summary: 'Execute Payroll Run',
    description: 'Orchestrates batch calculation and payslip generation for an open payroll cycle',
    tags: ['Payroll Run'],
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['payrollCycleId'],
            properties: {
              payrollCycleId: { type: 'string' }
            }
          }
        }
      }
    }
  },
  getRun: { summary: 'Get Payroll Run', description: 'Retrieves payroll run details and input snapshots', tags: ['Payroll Run'] },
  listRuns: { summary: 'List Payroll Runs', description: 'Lists all payroll runs for the organization', tags: ['Payroll Run'] },
  lockRun: { summary: 'Lock Payroll Run', description: 'Locks completed run, cycle, attendance records, and captures leave snapshots', tags: ['Payroll Run'] },
  finalizeAllPayslips: { summary: 'Finalize All Payslips', description: 'Bulk finalizes all payslips in a completed payroll run', tags: ['Payroll Run'] }
};

export class PayrollRunController {
  async createRun(req, res, next) {
    try {
      const { payrollCycleId } = req.body || {};
      if (!payrollCycleId) throw new ValidationError('payrollCycleId is required');
      const result = await PayrollRunService.createRun(payrollCycleId, req.user.userId, req.user.organizationId);

      // Emit Notification
      await NotificationService.sendNotification(req.user.organizationId, {
        title: 'Payroll Run Initiated',
        message: `A new payroll batch calculation has been executed.`,
        priority: 'warning',
        targetRoles: ['Finance Executive', 'Super Admin']
      }).catch(err => console.error('Notification Error:', err));

      res.status(201).json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  async getRun(req, res, next) {
    try {
      const run = await PayrollRunService.getRunById(req.params.id, req.user.organizationId);
      res.status(200).json({ success: true, data: run });
    } catch (error) { next(error); }
  }

  async listRuns(req, res, next) {
    try {
      const runs = await PayrollRunService.listRuns(req.user.organizationId);
      res.status(200).json({ success: true, data: runs });
    } catch (error) { next(error); }
  }

  async lockRun(req, res, next) {
    try {
      const result = await PayrollRunService.lockRun(req.params.id, req.user.userId, req.user.organizationId);
      res.status(200).json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  async finalizeAllPayslips(req, res, next) {
    try {
      const result = await PayrollRunService.finalizeAllPayslips(req.params.id, req.user.organizationId);
      res.status(200).json({ success: true, data: result });
    } catch (error) { next(error); }
  }
}

export default new PayrollRunController();
