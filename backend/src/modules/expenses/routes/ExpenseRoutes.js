import express from 'express';
import { authenticate } from '../../../core/middleware/auth.js';
import { requireTenant } from '../../../core/middleware/tenant.js';
import { hasPermission } from '../../../core/middleware/hasPermission.js';
import expenseController from '../controllers/ExpenseController.js';

const router = express.Router();

router.use(authenticate);
router.use(requireTenant);

router.get('/', hasPermission('expenses.view'), expenseController.getAllExpenses);
router.get('/my', expenseController.getMyExpenses);
router.post('/', expenseController.createExpense); // ANY employee can create expense
router.patch('/:id/status', hasPermission('expenses.manage'), expenseController.updateExpenseStatus);

export default router;
