import LeaveRequestService from '../services/LeaveRequestService.js';
import NotificationService from '../../notifications/services/NotificationService.js';
import { ValidationError } from '#@/core/errors/AppError.js';

export const openApiMetadata = {
  submitRequest: { summary: 'Submit Leave Request', description: 'Submits a new leave request for an employee', tags: ['Leave Management'] },
  approveRequest: { summary: 'Approve Leave Request', description: 'Approves a pending leave request', tags: ['Leave Management'] },
  rejectRequest: { summary: 'Reject Leave Request', description: 'Rejects a pending leave request', tags: ['Leave Management'] },
  cancelRequest: { summary: 'Cancel Leave Request', description: 'Cancels a pending or approved leave request', tags: ['Leave Management'] }
};

class LeaveRequestController {
  async submitRequest(req, res, next) {
    try {
      const { leaveCode, startDate, endDate, isHalfDay, halfDayPeriod, reason, attachmentIds, locationId } = req.body;
      if (!leaveCode || !startDate || !endDate || !reason) {
        throw new ValidationError('leaveCode, startDate, endDate, and reason are required.');
      }

      const request = await LeaveRequestService.submitRequest(
        req.user.organizationId,
        req.user.userId,
        { leaveCode, startDate, endDate, isHalfDay, halfDayPeriod, reason, attachmentIds, locationId }
      );

      // Emit Notification
      await NotificationService.sendNotification(req.user.organizationId, {
        title: 'Leave Request Submitted',
        message: `A new leave request has been submitted and is awaiting approval.`,
        priority: 'info',
        targetRoles: ['HR Manager', 'Super Admin']
      }).catch(err => console.error('Notification Error:', err));

      res.status(201).json({ success: true, data: request, message: 'Leave request submitted successfully.' });
    } catch (error) { next(error); }
  }

  async getTenantRequests(req, res, next) {
    try {
      const { status } = req.query;
      const filter = {};
      if (status) filter.status = status;
      const requests = await LeaveRequestService.getTenantRequests(req.user.organizationId, filter);
      res.status(200).json({ success: true, data: requests });
    } catch (error) { next(error); }
  }

  async getEmployeeRequests(req, res, next) {
    try {
      const { status } = req.query;
      const filter = {};
      if (status) filter.status = status;
      const requests = await LeaveRequestService.getEmployeeRequests(req.user.organizationId, req.user.userId, filter);
      res.status(200).json({ success: true, data: requests });
    } catch (error) { next(error); }
  }

  async approveRequest(req, res, next) {
    try {
      const { id } = req.params;
      const request = await LeaveRequestService.approveRequest(req.user.organizationId, id, req.user.userId);
      res.status(200).json({ success: true, data: request, message: 'Leave request approved.' });
    } catch (error) { next(error); }
  }

  async rejectRequest(req, res, next) {
    try {
      const { id } = req.params;
      const { rejectionReason } = req.body;
      const request = await LeaveRequestService.rejectRequest(req.user.organizationId, id, rejectionReason, req.user.userId);
      res.status(200).json({ success: true, data: request, message: 'Leave request rejected.' });
    } catch (error) { next(error); }
  }

  async cancelRequest(req, res, next) {
    try {
      const { id } = req.params;
      const request = await LeaveRequestService.cancelRequest(req.user.organizationId, id, req.user.userId);
      res.status(200).json({ success: true, data: request, message: 'Leave request cancelled.' });
    } catch (error) { next(error); }
  }
}

export default new LeaveRequestController();
