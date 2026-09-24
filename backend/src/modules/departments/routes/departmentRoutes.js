import { Router } from 'express';
import DepartmentController from '../controllers/DepartmentController.js';
import authenticate from '#@/core/middleware/auth.js';
import requireTenant from '#@/core/middleware/tenant.js';
import hasPermission from '#@/core/middleware/hasPermission.js';
import validate from '#@/core/middleware/validator.js';
import {
  createDepartmentSchema,
  updateDepartmentSchema,
  moveDepartmentSchema,
  archiveDepartmentSchema,
  getDepartmentByIdSchema
} from '../validators/departmentSchemas.js';
import PERMISSIONS from '#@/core/constants/permissions/index.js';

const router = Router();

// Apply authentication and tenant isolation globally to all department endpoints
router.use(authenticate, requireTenant);

// Queries
router.get('/', hasPermission(PERMISSIONS.DEPARTMENT.READ), DepartmentController.getDepartments);
router.get('/tree', hasPermission(PERMISSIONS.DEPARTMENT.READ), DepartmentController.getDepartmentTree);
router.get('/select-options', hasPermission(PERMISSIONS.DEPARTMENT.READ), DepartmentController.getSelectOptions);
router.get('/options', hasPermission(PERMISSIONS.DEPARTMENT.READ), DepartmentController.getSelectOptions);
router.get('/:id', hasPermission(PERMISSIONS.DEPARTMENT.READ), validate(getDepartmentByIdSchema), DepartmentController.getDepartmentById);

// Mutations
router.post('/', hasPermission(PERMISSIONS.DEPARTMENT.CREATE), validate(createDepartmentSchema), DepartmentController.createDepartment);
router.put('/:id', hasPermission(PERMISSIONS.DEPARTMENT.UPDATE), validate(updateDepartmentSchema), DepartmentController.updateDepartment);
router.post('/:id/move', hasPermission(PERMISSIONS.DEPARTMENT.MANAGE_HIERARCHY), validate(moveDepartmentSchema), DepartmentController.moveDepartment);
router.delete('/:id', hasPermission(PERMISSIONS.DEPARTMENT.DELETE), validate(archiveDepartmentSchema), DepartmentController.archiveDepartment);

export default router;
