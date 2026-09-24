import { Router } from 'express';
import ShiftController from '../controllers/ShiftController.js';
import authenticate from '#@/core/middleware/auth.js';
import requireTenant from '#@/core/middleware/tenant.js';
import hasPermission from '#@/core/middleware/hasPermission.js';
import validate from '#@/core/middleware/validator.js';
import PERMISSIONS from '#@/core/constants/permissions/index.js';
import {
  createShiftSchema,
  updateShiftSchema,
  archiveShiftSchema,
  getShiftByIdSchema
} from '../validators/shiftSchemas.js';

const router = Router();

router.use(authenticate, requireTenant);

router.post('/',
  hasPermission(PERMISSIONS.SHIFT.CREATE),
  validate(createShiftSchema),
  ShiftController.createShift
);

router.get('/',
  hasPermission(PERMISSIONS.SHIFT.READ),
  ShiftController.getShifts
);

router.get('/:id',
  hasPermission(PERMISSIONS.SHIFT.READ),
  validate(getShiftByIdSchema),
  ShiftController.getShiftById
);

router.patch('/:id',
  hasPermission(PERMISSIONS.SHIFT.UPDATE),
  validate(updateShiftSchema),
  ShiftController.updateShift
);

router.post('/:id/archive',
  hasPermission(PERMISSIONS.SHIFT.ARCHIVE),
  validate(archiveShiftSchema),
  ShiftController.archiveShift
);

export default router;
