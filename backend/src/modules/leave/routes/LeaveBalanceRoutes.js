import { Router } from 'express';
import LeaveBalanceController from '../controllers/LeaveBalanceController.js';
import authenticate from '#@/core/middleware/auth.js';
import requireTenant from '#@/core/middleware/tenant.js';
import hasPermission from '#@/core/middleware/hasPermission.js';
import PERMISSIONS from '#@/core/constants/permissions/index.js';

const router = Router();

router.use(authenticate);
router.use(requireTenant);

router.get(
  '/',
  hasPermission(PERMISSIONS.LEAVE?.BALANCE_READ || '*'),
  LeaveBalanceController.getEmployeeBalance.bind(LeaveBalanceController)
);

export default router;
