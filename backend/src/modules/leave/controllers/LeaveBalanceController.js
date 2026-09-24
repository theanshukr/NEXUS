import LeaveBalanceService from '../services/LeaveBalanceService.js';
import { ValidationError } from '#@/core/errors/AppError.js';

export const openApiMetadata = {
  getEmployeeBalance: { summary: 'Get Leave Balance', description: 'Retrieves the leave balance for a specific employee and year', tags: ['Leave Management'] }
};

class LeaveBalanceController {
  async getEmployeeBalance(req, res, next) {
    try {
      const { employeeId, year } = req.query;
      const targetEmployeeId = employeeId || req.user.userId;
      const targetYear = year ? Number(year) : new Date().getFullYear();

      const balance = await LeaveBalanceService.getOrInitializeBalance(
        req.user.organizationId,
        targetEmployeeId,
        targetYear
      );

      res.status(200).json({ success: true, data: balance });
    } catch (error) { next(error); }
  }
}

export default new LeaveBalanceController();
