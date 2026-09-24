import { Router } from 'express';
import AttendanceReconciliationController from '../controllers/AttendanceReconciliationController.js';
import authenticate from '#@/core/middleware/auth.js';
import requireTenant from '#@/core/middleware/tenant.js';
import hasPermission from '#@/core/middleware/hasPermission.js';
import PERMISSIONS from '#@/core/constants/permissions/index.js';

const router = Router();

// All routes require authentication and a valid tenant context.
router.use(authenticate);
router.use(requireTenant);

/**
 * @route   POST /api/v1/attendance/reconciliation
 * @desc    Run EOD reconciliation for stale open sessions
 * @access  Requires attendance.reconcile permission
 */
router.post(
  '/',
  hasPermission(PERMISSIONS.ATTENDANCE.RECONCILE),
  AttendanceReconciliationController.reconcileStaleSessions.bind(AttendanceReconciliationController)
);

/**
 * @route   POST /api/v1/attendance/reconciliation/stale
 * @desc    Alias for EOD reconciliation of stale open sessions
 * @access  Requires attendance.reconcile permission
 */
router.post(
  '/stale',
  hasPermission(PERMISSIONS.ATTENDANCE.RECONCILE),
  AttendanceReconciliationController.reconcileStaleSessions.bind(AttendanceReconciliationController)
);



router.get(
  '/payroll-feed',
  hasPermission(PERMISSIONS.ATTENDANCE.PAYROLL_FEED),
  AttendanceReconciliationController.getPayrollFeed.bind(AttendanceReconciliationController)
);

export default router;
