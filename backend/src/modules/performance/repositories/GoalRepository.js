import BaseRepository from '../../../core/repositories/BaseRepository.js';
import Goal from '../models/Goal.js';

class GoalRepository extends BaseRepository {
  constructor() {
    super(Goal);
  }

  async findByOrganization(organizationId, filter = {}, options = {}) {
    return this.find(filter, organizationId, options);
  }

  async findMyGoals(organizationId, userId, options = {}) {
    return this.find({ employeeId: userId }, organizationId, options);
  }
}

export default new GoalRepository();
