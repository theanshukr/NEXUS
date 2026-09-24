import { Router } from 'express';
import NexusProfileController from '../controllers/NexusProfileController.js';
import authenticate from '../../../core/middleware/auth.js';
import requireTenant from '../../../core/middleware/tenant.js';

const router = Router();

// Apply authentication and tenant isolation globally
router.use(authenticate, requireTenant);

// ---------------------------------------------------------------------------
// Employee Intelligence Profiles (Phase 1)
// ---------------------------------------------------------------------------

// GET /api/v1/nexus/employees/:id/profile
router.get('/employees/:id/profile', NexusProfileController.getProfile);

// PUT /api/v1/nexus/employees/:id/profile
router.put('/employees/:id/profile', NexusProfileController.updateProfile);

// POST /api/v1/nexus/employees/:id/skills
router.post('/employees/:id/skills', NexusProfileController.addSkill);

// PATCH /api/v1/nexus/employees/:id/skills/:skillId
router.patch('/employees/:id/skills/:skillId', NexusProfileController.updateSkill);

// DELETE /api/v1/nexus/employees/:id/skills/:skillId
router.delete('/employees/:id/skills/:skillId', NexusProfileController.removeSkill);

// GET /api/v1/nexus/samples/workforce (Sample Indian Engineering Workforce)
router.get('/samples/workforce', NexusProfileController.getSampleWorkforce);

export default router;
