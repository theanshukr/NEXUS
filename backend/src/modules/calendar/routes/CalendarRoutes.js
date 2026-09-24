import { Router } from 'express';
import CalendarController from '../controllers/CalendarController.js';
import authenticate from '#@/core/middleware/auth.js';
import requireTenant from '#@/core/middleware/tenant.js';
import hasPermission from '#@/core/middleware/hasPermission.js';
import PERMISSIONS from '#@/core/constants/permissions/index.js';

const router = Router();

router.use(authenticate);
router.use(requireTenant);

router.post(
  '/',
  hasPermission(PERMISSIONS.CALENDAR?.CREATE || '*'), // Note: we need to add PERMISSIONS.CALENDAR in Phase 6
  CalendarController.createCalendar.bind(CalendarController)
);

router.get(
  '/',
  hasPermission(PERMISSIONS.CALENDAR?.READ || '*'),
  CalendarController.getCalendar.bind(CalendarController)
);

export default router;
