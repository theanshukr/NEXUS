import { Router } from 'express';
import AttendancePolicyController from '../controllers/AttendancePolicyController.js';
import authenticate from '#@/core/middleware/auth.js';
import requireTenant from '#@/core/middleware/tenant.js';
import hasPermission from '#@/core/middleware/hasPermission.js';
import validate from '#@/core/middleware/validator.js';
import PERMISSIONS from '#@/core/constants/permissions/index.js';
import {
  createAttendancePolicySchema,
  updateAttendancePolicySchema,
  getPolicyByIdSchema
} from '../validators/attendanceSchemas.js';

const router = Router();

router.use(authenticate, requireTenant);

router.get('/',
  hasPermission(PERMISSIONS.ATTENDANCE.POLICY_READ),
  AttendancePolicyController.getPolicies
);

router.get('/:id',
  hasPermission(PERMISSIONS.ATTENDANCE.POLICY_READ),
  validate(getPolicyByIdSchema),
  AttendancePolicyController.getPolicyById
);

router.post('/',
  hasPermission(PERMISSIONS.ATTENDANCE.POLICY_CREATE),
  validate(createAttendancePolicySchema),
  AttendancePolicyController.createPolicy
);

router.patch('/:id',
  hasPermission(PERMISSIONS.ATTENDANCE.POLICY_UPDATE),
  validate(updateAttendancePolicySchema),
  AttendancePolicyController.updatePolicy
);

export default router;
