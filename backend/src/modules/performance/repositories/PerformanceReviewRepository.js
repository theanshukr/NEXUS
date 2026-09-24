import BaseRepository from '../../../core/repositories/BaseRepository.js';
import PerformanceReview from '../models/PerformanceReview.js';

class PerformanceReviewRepository extends BaseRepository {
  constructor() {
    super(PerformanceReview);
  }

  async findByOrganization(organizationId, filter = {}, options = {}) {
    return this.find(filter, organizationId, options);
  }

  async findMyReviews(organizationId, userId, options = {}) {
    return this.find({ employeeId: userId }, organizationId, options);
  }
}

export default new PerformanceReviewRepository();
