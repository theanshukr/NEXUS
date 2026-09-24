import { Router } from 'express';
import { authenticate } from '#@/core/middleware/auth.js';
import { requireTenant } from '#@/core/middleware/tenant.js';
import { hasPermission } from '#@/core/middleware/hasPermission.js';
import { PERMISSIONS } from '#@/core/constants/permissions/index.js';
import PayslipController from '../controllers/PayslipController.js';

const router = Router();

router.use(authenticate, requireTenant);

router.get(
  '/my',
  hasPermission(PERMISSIONS.PAYROLL.VIEW_SALARY), // Or just generic since it's their own. Actually the prompt says they should have permission. Let's just use empty or just authenticate. Wait, employees might not have VIEW_SALARY. Actually, let's use nothing special, just authentication is enough since we only return THEIR payslips.
  PayslipController.getMyPayslips
);

router.get(
  '/:id',
  hasPermission(PERMISSIONS.PAYROLL.VIEW_SALARY),
  PayslipController.getPayslip
);

router.get(
  '/run/:runId',
  hasPermission(PERMISSIONS.PAYROLL.VIEW_SALARY),
  PayslipController.listByRun
);

router.get(
  '/employee/:employeeId',
  hasPermission(PERMISSIONS.PAYROLL.VIEW_SALARY),
  PayslipController.listByEmployee
);

router.patch(
  '/:id/finalize',
  hasPermission(PERMISSIONS.PAYROLL.RUN),
  PayslipController.finalizePayslip
);

export default router;
