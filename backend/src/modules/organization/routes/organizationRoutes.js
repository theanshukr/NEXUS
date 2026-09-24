import { Router } from 'express';
import OrganizationController from '#@/modules/organization/controllers/OrganizationController.js';
import authenticate from '#@/core/middleware/auth.js';
import requireTenant from '#@/core/middleware/tenant.js';
import validate from '#@/core/middleware/validator.js';
import { createOrganizationSchema } from '#@/core/middleware/validatorSchemas.js';

const router = Router();

// Public endpoint for tenant provisioning (SaaS signup)
router.post('/', validate(createOrganizationSchema), OrganizationController.createOrganization);

// Protected endpoint to retrieve tenant metadata
router.get('/me', authenticate, requireTenant, OrganizationController.getMyOrganization);

export default router;
