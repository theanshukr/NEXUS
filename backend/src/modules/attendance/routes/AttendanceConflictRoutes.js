import { Router } from 'express';
import { authenticate } from '#@/core/middleware/auth.js';
import { requireTenant } from '#@/core/middleware/tenant.js';
import { hasPermission } from '#@/core/middleware/hasPermission.js';
import { PERMISSIONS } from '#@/core/constants/permissions/index.js';
import AttendanceConflictController from '../controllers/AttendanceConflictController.js';

const router = Router();

// Only HR/Admins with attendance update permissions can resolve conflicts
router.put(
  '/:id/resolve-conflict',
  authenticate,
  requireTenant,
  hasPermission(PERMISSIONS.ATTENDANCE.UPDATE),
  AttendanceConflictController.resolveConflict
);

export default router;
