import { Router } from 'express';
import { authenticate } from '#@/core/middleware/auth.js';
import { requireTenant } from '#@/core/middleware/tenant.js';
import { hasPermission } from '#@/core/middleware/hasPermission.js';
import { PERMISSIONS } from '#@/core/constants/permissions/index.js';
import PayrollCycleController from '../controllers/PayrollCycleController.js';

const router = Router();

router.use(authenticate, requireTenant);

router.post(
  '/',
  hasPermission(PERMISSIONS.PAYROLL.MANAGE_CYCLE),
  PayrollCycleController.createCycle
);

router.get(
  '/',
  hasPermission(PERMISSIONS.PAYROLL.VIEW_SALARY),
  PayrollCycleController.listCycles
);

router.get(
  '/:id',
  hasPermission(PERMISSIONS.PAYROLL.VIEW_SALARY),
  PayrollCycleController.getCycle
);

router.patch(
  '/:id/status',
  hasPermission(PERMISSIONS.PAYROLL.MANAGE_CYCLE),
  PayrollCycleController.updateStatus
);

export default router;
