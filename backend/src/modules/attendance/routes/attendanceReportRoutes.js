import { Router } from 'express';
import AttendanceReportController from '../controllers/AttendanceReportController.js';
import authenticate from '#@/core/middleware/auth.js';
import requireTenant from '#@/core/middleware/tenant.js';
import hasPermission from '#@/core/middleware/hasPermission.js';
import validate from '#@/core/middleware/validator.js';
import PERMISSIONS from '#@/core/constants/permissions/index.js';
import { reportQuerySchema } from '../validators/attendanceReportSchemas.js';

const router = Router();

router.use(authenticate, requireTenant);

// Unified reporting endpoint (AI and Frontend)
router.get('/reports',
  hasPermission(PERMISSIONS.ATTENDANCE.READ),
  validate(reportQuerySchema, 'query'),
  AttendanceReportController.getReports
);

// Dashboard composed widgets
router.get('/dashboard',
  hasPermission(PERMISSIONS.ATTENDANCE.READ),
  validate(reportQuerySchema, 'query'),
  AttendanceReportController.getDashboard
);

// Streaming exports
router.get('/export',
  hasPermission(PERMISSIONS.ATTENDANCE.READ),
  validate(reportQuerySchema, 'query'),
  AttendanceReportController.exportReport
);

export default router;
