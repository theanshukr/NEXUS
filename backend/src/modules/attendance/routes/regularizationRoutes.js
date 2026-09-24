import { Router } from 'express';
import RegularizationController from '../controllers/RegularizationController.js';
import authenticate from '#@/core/middleware/auth.js';
import requireTenant from '#@/core/middleware/tenant.js';
import hasPermission from '#@/core/middleware/hasPermission.js';
import validate from '#@/core/middleware/validator.js';
import { requestRegularizationSchema, reviewRegularizationSchema } from '../validators/regularizationSchemas.js';
import PERMISSIONS from '#@/core/constants/permissions/index.js';

const router = Router();

// All routes require authentication and a valid tenant context.
router.use(authenticate);
router.use(requireTenant);

/**
 * @route   POST /api/v1/attendance/regularizations
 * @desc    Submit a new regularization request
 * @access  Requires attendance.regularization.request permission
 */
router.post(
  '/',
  hasPermission(PERMISSIONS.ATTENDANCE.REGULARIZATION_REQUEST),
  validate(requestRegularizationSchema),
  RegularizationController.requestRegularization.bind(RegularizationController)
);

/**
 * @route   GET /api/v1/attendance/regularizations
 * @desc    List regularization requests
 * @access  Requires attendance.read permission
 */
router.get(
  '/',
  hasPermission(PERMISSIONS.ATTENDANCE.READ),
  RegularizationController.getRegularizations.bind(RegularizationController)
);

/**
 * @route   POST /api/v1/attendance/regularizations/:id/approve
 * @desc    Approve a pending regularization request
 * @access  Requires attendance.regularization.approve permission
 */
router.post(
  '/:id/approve',
  hasPermission(PERMISSIONS.ATTENDANCE.REGULARIZATION_APPROVE),
  validate(reviewRegularizationSchema),
  RegularizationController.approveRegularization.bind(RegularizationController)
);

/**
 * @route   POST /api/v1/attendance/regularizations/:id/reject
 * @desc    Reject a pending regularization request
 * @access  Requires attendance.regularization.approve permission
 */
router.post(
  '/:id/reject',
  hasPermission(PERMISSIONS.ATTENDANCE.REGULARIZATION_APPROVE),
  validate(reviewRegularizationSchema),
  RegularizationController.rejectRegularization.bind(RegularizationController)
);

export default router;
