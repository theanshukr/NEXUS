import { Router } from 'express';
import AttendanceController from '../controllers/AttendanceController.js';
import authenticate from '#@/core/middleware/auth.js';
import requireTenant from '#@/core/middleware/tenant.js';
import hasPermission from '#@/core/middleware/hasPermission.js';
import validate from '#@/core/middleware/validator.js';
import PERMISSIONS from '#@/core/constants/permissions/index.js';
import {
  clockInSchema,
  clockOutSchema,
  finalizePayPeriodSchema
} from '../validators/attendanceSchemas.js';

import AttendanceReconciliationController from '../controllers/AttendanceReconciliationController.js';

const router = Router();

router.use(authenticate, requireTenant);

// Employee self-service: clock in and out.
router.post('/clock-in',
  hasPermission(PERMISSIONS.ATTENDANCE.MARK),
  validate(clockInSchema),
  AttendanceController.clockIn
);

router.post('/clock-out',
  hasPermission(PERMISSIONS.ATTENDANCE.MARK),
  validate(clockOutSchema),
  AttendanceController.clockOut
);

// Self-service reads (no explicit permission beyond valid session + tenant).
router.get('/today',
  AttendanceController.getToday
);

router.get('/me',
  AttendanceController.getMyAttendance
);

/**
 * @route   POST /api/v1/attendance/finalize
 * @desc    Atomically finalize pay period across a date range
 * @access  Requires attendance.finalize permission
 */
router.post(
  '/finalize',
  hasPermission(PERMISSIONS.ATTENDANCE.FINALIZE),
  validate(finalizePayPeriodSchema),
  AttendanceReconciliationController.finalizePayPeriod.bind(AttendanceReconciliationController)
);

export default router;
