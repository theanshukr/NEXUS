import { Router } from 'express';
import LeavePolicyController from '../controllers/LeavePolicyController.js';
import authenticate from '#@/core/middleware/auth.js';
import requireTenant from '#@/core/middleware/tenant.js';
import hasPermission from '#@/core/middleware/hasPermission.js';
import PERMISSIONS from '#@/core/constants/permissions/index.js';

const router = Router();

router.use(authenticate);
router.use(requireTenant);

router.get(
  '/',
  hasPermission(PERMISSIONS.LEAVE?.POLICY_READ || '*'),
  LeavePolicyController.getActivePolicies.bind(LeavePolicyController)
);

router.put(
  '/:code',
  hasPermission(PERMISSIONS.LEAVE?.POLICY_UPDATE || '*'),
  LeavePolicyController.updatePolicy.bind(LeavePolicyController)
);

export default router;
