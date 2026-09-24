import expenseRepo from '../repositories/ExpenseRepository.js';

class ExpenseService {
  async getAllExpenses(organizationId) {
    return expenseRepo.findByOrganization(organizationId, {}, { sort: { createdAt: -1 } });
  }

  async getMyExpenses(organizationId, employeeId) {
    return expenseRepo.findByOrganization(organizationId, { employeeId }, { sort: { createdAt: -1 } });
  }

  async createExpense(organizationId, employeeId, data) {
    return expenseRepo.create({ organizationId, employeeId, ...data });
  }

  async updateExpenseStatus(organizationId, expenseId, status, approverId) {
    const expense = await expenseRepo.findById(expenseId);
    if (!expense || expense.organizationId.toString() !== organizationId.toString()) {
      throw new Error('Expense claim not found');
    }
    expense.status = status;
    expense.approvedBy = approverId;
    return expense.save();
  }
}

export default new ExpenseService();
