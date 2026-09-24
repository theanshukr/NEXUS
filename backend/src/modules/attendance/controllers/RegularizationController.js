import AttendanceRegularizationService from '../services/AttendanceRegularizationService.js';
import AttendanceRegularizationRepository from '../repositories/AttendanceRegularizationRepository.js';

export class RegularizationController {
  
  /**
   * Request a new attendance regularization
   * POST /api/v1/attendance/regularizations
   */
  async requestRegularization(req, res, next) {
    try {
      const organizationId = req.user.organizationId;
      const userId = req.user.userId;
      const payload = req.body;

      const result = await AttendanceRegularizationService.requestRegularization(
        payload,
        organizationId,
        userId
      );

      res.status(201).json({
        success: true,
        message: 'Regularization request submitted successfully.',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Approve a pending regularization request
   * POST /api/v1/attendance/regularizations/:id/approve
   */
  async approveRegularization(req, res, next) {
    try {
      const organizationId = req.user.organizationId;
      const reviewerId = req.user.userId;
      const { id } = req.params;
      const { reviewerComments } = req.body;

      const result = await AttendanceRegularizationService.approveRegularization(
        id,
        reviewerComments,
        organizationId,
        reviewerId
      );

      res.status(200).json({
        success: true,
        message: 'Regularization request approved.',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reject a pending regularization request
   * POST /api/v1/attendance/regularizations/:id/reject
   */
  async rejectRegularization(req, res, next) {
    try {
      const organizationId = req.user.organizationId;
      const reviewerId = req.user.userId;
      const { id } = req.params;
      const { reviewerComments } = req.body;

      const result = await AttendanceRegularizationService.rejectRegularization(
        id,
        reviewerComments,
        organizationId,
        reviewerId
      );

      res.status(200).json({
        success: true,
        message: 'Regularization request rejected.',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get regularizations (for manager to review, or employee to check status)
   * GET /api/v1/attendance/regularizations
   */
  async getRegularizations(req, res, next) {
    try {
      const organizationId = req.user.organizationId;
      const { status, employeeId } = req.query;
      
      const filter = {};
      if (status) filter.status = status;
      if (employeeId) filter.employeeId = employeeId;
      
      const results = await AttendanceRegularizationRepository.model.find({
        ...filter,
        organizationId
      }).sort({ createdAt: -1 });

      res.status(200).json({
        success: true,
        data: results
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new RegularizationController();

RegularizationController.openApiMetadata = {
  requestRegularization: {
    summary: 'Submit a regularization request',
    description: 'Employees can submit a request to correct anomalous attendance records.',
    tags: ['Attendance Regularization']
  },
  approveRegularization: {
    summary: 'Approve regularization',
    description: 'Managers/HR can approve a pending attendance regularization request. Recalculates working hours.',
    tags: ['Attendance Regularization']
  },
  rejectRegularization: {
    summary: 'Reject regularization',
    description: 'Managers/HR can reject a pending attendance regularization request.',
    tags: ['Attendance Regularization']
  },
  getRegularizations: {
    summary: 'List regularization requests',
    description: 'Get a list of regularization requests, optionally filtered by status or employeeId.',
    tags: ['Attendance Regularization']
  }
};
