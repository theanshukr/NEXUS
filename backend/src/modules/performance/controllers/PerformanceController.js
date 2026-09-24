import { catchAsync } from '../../../core/utils/catchAsync.js';
import { successResponse } from '../../../core/utils/response.js';
import performanceService from '../services/PerformanceService.js';

class PerformanceController {
  getAllGoals = catchAsync(async (req, res) => {
    const { organizationId, id: userId, role } = req.user;
    // If not admin, maybe only see their own goals, but keeping simple for now
    const goals = await performanceService.getAllGoals(organizationId, req.query.employeeId);
    return successResponse(res, goals);
  });

  createGoal = catchAsync(async (req, res) => {
    const { organizationId } = req.user;
    const goal = await performanceService.createGoal(organizationId, req.body);
    return successResponse(res, goal, 'Goal created', 201);
  });

  updateGoal = catchAsync(async (req, res) => {
    const { organizationId } = req.user;
    const { id } = req.params;
    const goal = await performanceService.updateGoal(organizationId, id, req.body);
    return successResponse(res, goal, 'Goal updated');
  });

  getAllReviews = catchAsync(async (req, res) => {
    const { organizationId } = req.user;
    const reviews = await performanceService.getAllReviews(organizationId);
    return successResponse(res, reviews);
  });

  createReview = catchAsync(async (req, res) => {
    const { organizationId } = req.user;
    const review = await performanceService.createReview(organizationId, req.body);
    return successResponse(res, review, 'Review created', 201);
  });
}

export default new PerformanceController();
