import { catchAsync } from '../../../core/utils/catchAsync.js';
import { successResponse } from '../../../core/utils/response.js';
import expenseService from '../services/ExpenseService.js';

class ExpenseController {
  getAllExpenses = catchAsync(async (req, res) => {
    const { organizationId } = req.user;
    const expenses = await expenseService.getAllExpenses(organizationId);
    return successResponse(res, expenses);
  });

  getMyExpenses = catchAsync(async (req, res) => {
    const { organizationId, id: employeeId } = req.user;
    const expenses = await expenseService.getMyExpenses(organizationId, employeeId);
    return successResponse(res, expenses);
  });

  createExpense = catchAsync(async (req, res) => {
    const { organizationId, id: employeeId } = req.user;
    const expense = await expenseService.createExpense(organizationId, employeeId, req.body);
    return successResponse(res, expense, 'Expense created', 201);
  });

  updateExpenseStatus = catchAsync(async (req, res) => {
    const { organizationId, id: approverId } = req.user;
    const { id } = req.params;
    const { status } = req.body;
    const expense = await expenseService.updateExpenseStatus(organizationId, id, status, approverId);
    return successResponse(res, expense, 'Expense status updated');
  });
}

export default new ExpenseController();
