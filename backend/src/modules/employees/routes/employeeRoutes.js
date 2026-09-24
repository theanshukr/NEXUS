import { Router } from 'express';
import EmployeeController from '../controllers/EmployeeController.js';
import authenticate from '#@/core/middleware/auth.js';
import requireTenant from '#@/core/middleware/tenant.js';
import hasPermission from '#@/core/middleware/hasPermission.js';
import validate from '#@/core/middleware/validator.js';
import PERMISSIONS from '#@/core/constants/permissions/index.js';
import {
  createEmployeeSchema,
  updateProfileSchema,
  changeStatusSchema,
  changeManagerSchema,
  inviteEmployeeSchema,
  archiveEmployeeSchema,
  employeeIdParamSchema
} from '../validators/employeeSchemas.js';

const router = Router();

// Apply authentication and tenant isolation globally to all employee endpoints
router.use(authenticate, requireTenant);

// ---------------------------------------------------------------------------
// Read Endpoints
// ---------------------------------------------------------------------------

// GET /api/v1/employees — Paginated list with keyword search & archive filters
router.get('/',
  hasPermission(PERMISSIONS.EMPLOYEE.READ),
  EmployeeController.getEmployees
);

// GET /api/v1/employees/org-chart — Hierarchical org chart
// NOTE: Must be defined before /:id to avoid 'org-chart' being parsed as an ObjectId
router.get('/org-chart',
  hasPermission(PERMISSIONS.EMPLOYEE.READ),
  EmployeeController.getOrgChart
);

// GET /api/v1/employees/:id
router.get('/:id',
  hasPermission(PERMISSIONS.EMPLOYEE.READ),
  validate(employeeIdParamSchema),
  EmployeeController.getEmployeeById
);

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

// POST /api/v1/employees
router.post('/',
  hasPermission(PERMISSIONS.EMPLOYEE.CREATE),
  validate(createEmployeeSchema),
  EmployeeController.createEmployee
);

// ---------------------------------------------------------------------------
// Workflow Endpoints (dedicated per business operation)
// ---------------------------------------------------------------------------

// PATCH /api/v1/employees/:id/profile — Editable profile fields only
router.patch('/:id/profile',
  hasPermission(PERMISSIONS.EMPLOYEE.UPDATE),
  validate(updateProfileSchema),
  EmployeeController.updateEmployeeProfile
);

// PUT /api/v1/employees/:id/status — Status lifecycle transition
router.put('/:id/status',
  hasPermission(PERMISSIONS.EMPLOYEE.CHANGE_STATUS),
  validate(changeStatusSchema),
  EmployeeController.changeStatus
);

// PUT /api/v1/employees/:id/manager — Reporting line reassignment
router.put('/:id/manager',
  hasPermission(PERMISSIONS.EMPLOYEE.CHANGE_MANAGER),
  validate(changeManagerSchema),
  EmployeeController.changeManager
);

// POST /api/v1/employees/:id/invite — Issue M-01 invitation
router.post('/:id/invite',
  hasPermission(PERMISSIONS.EMPLOYEE.INVITE),
  validate(inviteEmployeeSchema),
  EmployeeController.inviteEmployee
);

// POST /api/v1/employees/:id/archive — Soft-delete
router.post('/:id/archive',
  hasPermission(PERMISSIONS.EMPLOYEE.ARCHIVE),
  validate(archiveEmployeeSchema),
  EmployeeController.archiveEmployee
);

// POST /api/v1/employees/:id/restore — Restore from soft-delete
router.post('/:id/restore',
  hasPermission(PERMISSIONS.EMPLOYEE.RESTORE),
  validate(employeeIdParamSchema),
  EmployeeController.restoreEmployee
);

export default router;
