import AttendanceReconciliationService from '../services/AttendanceReconciliationService.js';
import { ValidationError } from '#@/core/errors/AppError.js';

export const openApiMetadata = {
  reconcileStaleSessions: { summary: 'Reconcile Stale Sessions', description: 'Runs EOD reconciliation to flag open sessions exceeding maximum open hours as MISSING_CLOCK_OUT', tags: ['Attendance Reconciliation'] },
  finalizePayPeriod: { summary: 'Finalize Pay Period', description: 'Atomically locks attendance records for a date range, ensuring no incomplete records exist', tags: ['Attendance Reconciliation'] }
};

export class AttendanceReconciliationController {
  async reconcileStaleSessions(req, res, next) {
    try {
      const { hoursThreshold } = req.body || {};
      const summary = await AttendanceReconciliationService.reconcileStaleSessions(
        req.user.organizationId,
        hoursThreshold !== undefined ? Number(hoursThreshold) : null,
        req.user.userId
      );
      res.status(200).json({ success: true, data: summary, message: 'Stale sessions reconciliation completed.' });
    } catch (error) { next(error); }
  }

  async finalizePayPeriod(req, res, next) {
    try {
      const { startDate, endDate } = req.body || {};
      if (!startDate || !endDate) {
        throw new ValidationError('startDate and endDate are required in YYYY-MM-DD format.');
      }
      const summary = await AttendanceReconciliationService.finalizePayPeriod(
        req.user.organizationId,
        startDate,
        endDate,
        req.user.userId
      );
      res.status(200).json({ success: true, data: summary, message: 'Pay period finalized successfully.' });
    } catch (error) { next(error); }
  }

  async getPayrollFeed(req, res, next) {
    try {
      const { startDate, endDate } = req.query;
      if (!startDate || !endDate) {
        throw new ValidationError('startDate and endDate query parameters are required.');
      }
      const feed = await AttendanceReconciliationService.getPayrollFeed(
        req.user.organizationId,
        startDate,
        endDate
      );
      res.status(200).json({ success: true, data: feed });
    } catch (error) { next(error); }
  }
}

export default new AttendanceReconciliationController();
