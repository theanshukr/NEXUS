import BaseRepository from '../../../core/repositories/BaseRepository.js';
import ExpenseClaim from '../models/ExpenseClaim.js';

class ExpenseRepository extends BaseRepository {
  constructor() {
    super(ExpenseClaim);
  }

  async findByOrganization(organizationId, filter = {}, options = {}) {
    return this.find(filter, organizationId, options);
  }

  async findMyExpenses(organizationId, userId, options = {}) {
    return this.find({ employeeId: userId }, organizationId, options);
  }
}

export default new ExpenseRepository();
