import { Router } from 'express';
import DesignationController from '../controllers/DesignationController.js';
import authenticate from '#@/core/middleware/auth.js';
import requireTenant from '#@/core/middleware/tenant.js';
import hasPermission from '#@/core/middleware/hasPermission.js';
import validate from '#@/core/middleware/validator.js';
import PERMISSIONS from '#@/core/constants/permissions/index.js';
import {
  createDesignationSchema,
  updateDesignationSchema,
  archiveDesignationSchema,
  getDesignationByIdSchema
} from '../validators/designationSchemas.js';

const router = Router();

router.use(authenticate, requireTenant);

router.post('/',
  hasPermission(PERMISSIONS.DESIGNATION.CREATE),
  validate(createDesignationSchema),
  DesignationController.createDesignation
);

router.get('/',
  hasPermission(PERMISSIONS.DESIGNATION.READ),
  DesignationController.getDesignations
);

router.get('/:id',
  hasPermission(PERMISSIONS.DESIGNATION.READ),
  validate(getDesignationByIdSchema),
  DesignationController.getDesignationById
);

router.patch('/:id',
  hasPermission(PERMISSIONS.DESIGNATION.UPDATE),
  validate(updateDesignationSchema),
  DesignationController.updateDesignation
);

router.post('/:id/archive',
  hasPermission(PERMISSIONS.DESIGNATION.ARCHIVE),
  validate(archiveDesignationSchema),
  DesignationController.archiveDesignation
);

export default router;
