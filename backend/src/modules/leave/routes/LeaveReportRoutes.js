import { Router } from 'express';
import LeaveReportController from '../controllers/LeaveReportController.js';
import authenticate from '#@/core/middleware/auth.js';
import requireTenant from '#@/core/middleware/tenant.js';
import hasPermission from '#@/core/middleware/hasPermission.js';
import PERMISSIONS from '#@/core/constants/permissions/index.js';

const router = Router();

router.use(authenticate);
router.use(requireTenant);

router.get(
  '/utilization',
  hasPermission(PERMISSIONS.LEAVE?.REPORT_READ || '*'),
  LeaveReportController.getUtilization.bind(LeaveReportController)
);

export default router;
