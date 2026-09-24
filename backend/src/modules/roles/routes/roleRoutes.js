import { Router } from 'express';
import RoleController from '#@/modules/roles/controllers/RoleController.js';
import authenticate from '#@/core/middleware/auth.js';
import requireTenant from '#@/core/middleware/tenant.js';
import hasPermission from '#@/core/middleware/hasPermission.js';
import validate from '#@/core/middleware/validator.js';
import { createRoleSchema, updateRoleSchema, assignRoleSchema } from '#@/core/middleware/validatorSchemas.js';
import PERMISSIONS from '#@/core/constants/permissions/index.js';

const router = Router();

// Apply authentication and tenant isolation globally to all role endpoints
router.use(authenticate, requireTenant);

// System Permission Catalog
router.get('/system-permissions', hasPermission(PERMISSIONS.ROLE.READ), RoleController.getSystemPermissions);

// Dynamic Role Management
router.get('/', hasPermission(PERMISSIONS.ROLE.READ), RoleController.getRoles);
router.post('/', hasPermission(PERMISSIONS.ROLE.CREATE), validate(createRoleSchema), RoleController.createRole);
router.put('/:id', hasPermission(PERMISSIONS.ROLE.UPDATE), validate(updateRoleSchema), RoleController.updateRole);
router.post('/:id/duplicate', hasPermission(PERMISSIONS.ROLE.CREATE), RoleController.duplicateRole);
router.delete('/:id', hasPermission(PERMISSIONS.ROLE.DELETE), RoleController.deleteRole);

// User Role Assignments
router.post('/assign', hasPermission(PERMISSIONS.ROLE.ASSIGN), validate(assignRoleSchema), RoleController.assignRole);
router.post('/remove', hasPermission(PERMISSIONS.ROLE.ASSIGN), validate(assignRoleSchema), RoleController.removeRole);

export default router;
