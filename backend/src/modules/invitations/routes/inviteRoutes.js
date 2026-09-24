import { Router } from 'express';
import InviteController from '#@/modules/invitations/controllers/InviteController.js';
import authenticate from '#@/core/middleware/auth.js';
import requireTenant from '#@/core/middleware/tenant.js';
import { hasPermission, hasAnyPermission } from '#@/core/middleware/hasPermission.js';
import validate from '#@/core/middleware/validator.js';
import { createInviteSchema } from '#@/core/middleware/validatorSchemas.js';
import PERMISSIONS from '#@/core/constants/permissions/index.js';

const router = Router();

// Public endpoint for frontend invite token verification (pre-registration screen)
router.get('/validate/:token', InviteController.validateToken);

// Protected endpoints for generating and revoking invitations
router.use(authenticate, requireTenant);
router.post('/', hasPermission(PERMISSIONS.INVITE.CREATE), validate(createInviteSchema), InviteController.createInvite);
router.get('/', hasAnyPermission([PERMISSIONS.INVITE.READ, PERMISSIONS.INVITE.CREATE]), InviteController.getInvites);
router.delete('/:id', hasPermission(PERMISSIONS.INVITE.REVOKE), InviteController.revokeInvite);

export default router;
