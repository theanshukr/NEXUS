import { Router } from 'express';
import { authenticate } from '#@/core/middleware/auth.js';
import { requireTenant } from '#@/core/middleware/tenant.js';
import { hasPermission } from '#@/core/middleware/hasPermission.js';
import { PERMISSIONS } from '#@/core/constants/permissions/index.js';
import SalaryStructureController from '../controllers/SalaryStructureController.js';

const router = Router();

router.use(authenticate, requireTenant);

router.post(
  '/',
  hasPermission(PERMISSIONS.PAYROLL.CREATE_STRUCTURE),
  SalaryStructureController.createStructure
);

router.get(
  '/',
  hasPermission(PERMISSIONS.PAYROLL.VIEW_SALARY),
  SalaryStructureController.listStructures
);

router.get(
  '/:id',
  hasPermission(PERMISSIONS.PAYROLL.VIEW_SALARY),
  SalaryStructureController.getStructure
);

export default router;
