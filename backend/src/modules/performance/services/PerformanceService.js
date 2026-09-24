import goalRepo from '../repositories/GoalRepository.js';
import reviewRepo from '../repositories/PerformanceReviewRepository.js';

class PerformanceService {
  async getAllGoals(organizationId, employeeId = null) {
    const filter = employeeId ? { employeeId } : {};
    return goalRepo.findByOrganization(organizationId, filter, { sort: { createdAt: -1 } });
  }

  async createGoal(organizationId, data) {
    return goalRepo.create({ organizationId, ...data });
  }

  async updateGoal(organizationId, id, data) {
    return goalRepo.updateById(id, data);
  }

  async getAllReviews(organizationId) {
    return reviewRepo.findByOrganization(organizationId, {}, { sort: { createdAt: -1 } });
  }

  async createReview(organizationId, data) {
    return reviewRepo.create({ organizationId, ...data });
  }
}

export default new PerformanceService();
