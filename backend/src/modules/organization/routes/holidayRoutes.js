import { Router } from 'express';
import HolidayCalendarController from '../controllers/HolidayCalendarController.js';
import authenticate from '#@/core/middleware/auth.js';
import requireTenant from '#@/core/middleware/tenant.js';
import hasPermission from '#@/core/middleware/hasPermission.js';
import validate from '#@/core/middleware/validator.js';
import PERMISSIONS from '#@/core/constants/permissions/index.js';
import {
  createOrUpdateHolidayCalendarSchema,
  getHolidayCalendarSchema
} from '../validators/holidaySchemas.js';

const router = Router();

router.use(authenticate, requireTenant);

router.get('/:locationId/holidays/:year',
  hasPermission(PERMISSIONS.HOLIDAY.READ),
  validate(getHolidayCalendarSchema),
  HolidayCalendarController.getHolidayCalendar
);

router.put('/:locationId/holidays/:year',
  hasPermission(PERMISSIONS.HOLIDAY.UPDATE),
  validate(createOrUpdateHolidayCalendarSchema),
  HolidayCalendarController.createOrUpdateHolidayCalendar
);

export default router;
