import { Router } from 'express';
import RoleDelegationController from '#@/modules/roles/controllers/RoleDelegationController.js';
import authenticate from '#@/core/middleware/auth.js';
import requireTenant from '#@/core/middleware/tenant.js';
import { hasAnyPermission } from '#@/core/middleware/hasPermission.js';
import validate from '#@/core/middleware/validator.js';
import { createRoleDelegationPolicySchema } from '#@/core/middleware/validatorSchemas.js';
import PERMISSIONS from '#@/core/constants/permissions/index.js';

const router = Router();

router.use(authenticate, requireTenant);

router.get('/', hasAnyPermission([PERMISSIONS.ROLE.READ, PERMISSIONS.ROLE.ASSIGN, PERMISSIONS.ROLE.CREATE, PERMISSIONS.ROLE.UPDATE, PERMISSIONS.USER.READ]), RoleDelegationController.getPolicies);
router.post('/', hasAnyPermission([PERMISSIONS.ROLE.ASSIGN, PERMISSIONS.ROLE.UPDATE, PERMISSIONS.ROLE.CREATE]), validate(createRoleDelegationPolicySchema), RoleDelegationController.createPolicy);
router.delete('/:id', hasAnyPermission([PERMISSIONS.ROLE.ASSIGN, PERMISSIONS.ROLE.UPDATE, PERMISSIONS.ROLE.DELETE]), RoleDelegationController.deletePolicy);

export default router;
