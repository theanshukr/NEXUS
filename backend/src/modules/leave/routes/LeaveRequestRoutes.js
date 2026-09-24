import { Router } from 'express';
import LeaveRequestController from '../controllers/LeaveRequestController.js';
import authenticate from '#@/core/middleware/auth.js';
import requireTenant from '#@/core/middleware/tenant.js';
import hasPermission from '#@/core/middleware/hasPermission.js';
import PERMISSIONS from '#@/core/constants/permissions/index.js';

const router = Router();

router.use(authenticate);
router.use(requireTenant);

router.get(
  '/',
  hasPermission(PERMISSIONS.LEAVE.REQUEST_APPROVE),
  LeaveRequestController.getTenantRequests.bind(LeaveRequestController)
);

router.get(
  '/me',
  LeaveRequestController.getEmployeeRequests.bind(LeaveRequestController)
);

router.post(
  '/',
  hasPermission(PERMISSIONS.LEAVE.REQUEST_SUBMIT),
  LeaveRequestController.submitRequest.bind(LeaveRequestController)
);

router.post(
  '/:id/approve',
  hasPermission(PERMISSIONS.LEAVE.REQUEST_APPROVE),
  LeaveRequestController.approveRequest.bind(LeaveRequestController)
);

router.post(
  '/:id/reject',
  hasPermission(PERMISSIONS.LEAVE.REQUEST_APPROVE),
  LeaveRequestController.rejectRequest.bind(LeaveRequestController)
);

router.post(
  '/:id/cancel',
  LeaveRequestController.cancelRequest.bind(LeaveRequestController)
);

export default router;
