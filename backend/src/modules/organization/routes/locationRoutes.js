import { Router } from 'express';
import LocationController from '../controllers/LocationController.js';
import authenticate from '#@/core/middleware/auth.js';
import requireTenant from '#@/core/middleware/tenant.js';
import hasPermission from '#@/core/middleware/hasPermission.js';
import validate from '#@/core/middleware/validator.js';
import PERMISSIONS from '#@/core/constants/permissions/index.js';
import {
  createLocationSchema,
  updateLocationSchema,
  archiveLocationSchema,
  getLocationByIdSchema
} from '../validators/locationSchemas.js';

const router = Router();

router.use(authenticate, requireTenant);

router.post('/',
  hasPermission(PERMISSIONS.LOCATION.CREATE),
  validate(createLocationSchema),
  LocationController.createLocation
);

router.get('/',
  hasPermission(PERMISSIONS.LOCATION.READ),
  LocationController.getLocations
);

router.get('/:id',
  hasPermission(PERMISSIONS.LOCATION.READ),
  validate(getLocationByIdSchema),
  LocationController.getLocationById
);

router.patch('/:id',
  hasPermission(PERMISSIONS.LOCATION.UPDATE),
  validate(updateLocationSchema),
  LocationController.updateLocation
);

router.post('/:id/archive',
  hasPermission(PERMISSIONS.LOCATION.ARCHIVE),
  validate(archiveLocationSchema),
  LocationController.archiveLocation
);

export default router;
