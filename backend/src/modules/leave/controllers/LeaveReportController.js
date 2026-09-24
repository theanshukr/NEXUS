import LeaveReportService from '../services/LeaveReportService.js';
import { ValidationError } from '#@/core/errors/AppError.js';

export const openApiMetadata = {
  getUtilization: { summary: 'Get Leave Utilization', description: 'Returns aggregated leave utilization grouped by leave code for a specific year', tags: ['Leave Reports'] }
};

class LeaveReportController {
  async getUtilization(req, res, next) {
    try {
      const { year } = req.query;
      if (!year) throw new ValidationError('Year parameter is required');

      const data = await LeaveReportService.getLeaveUtilization(req.user.organizationId, Number(year));
      res.status(200).json({ success: true, data });
    } catch (error) { next(error); }
  }
}

export default new LeaveReportController();
