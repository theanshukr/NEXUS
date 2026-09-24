import { Router } from 'express';
import { authenticate } from '#@/core/middleware/auth.js';
import { requireTenant } from '#@/core/middleware/tenant.js';
import { hasPermission } from '#@/core/middleware/hasPermission.js';
import { PERMISSIONS } from '#@/core/constants/permissions/index.js';
import PayrollRunController from '../controllers/PayrollRunController.js';

const router = Router();

router.use(authenticate, requireTenant);

router.post(
  '/',
  hasPermission(PERMISSIONS.PAYROLL.RUN),
  PayrollRunController.createRun
);

router.get(
  '/',
  hasPermission(PERMISSIONS.PAYROLL.VIEW_SALARY),
  PayrollRunController.listRuns
);

router.get(
  '/:id',
  hasPermission(PERMISSIONS.PAYROLL.VIEW_SALARY),
  PayrollRunController.getRun
);

router.post(
  '/:id/lock',
  hasPermission(PERMISSIONS.PAYROLL.LOCK),
  PayrollRunController.lockRun
);

router.post(
  '/:id/finalize-payslips',
  hasPermission(PERMISSIONS.PAYROLL.RUN),
  PayrollRunController.finalizeAllPayslips
);

export default router;
