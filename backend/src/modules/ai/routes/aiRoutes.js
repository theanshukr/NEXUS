import { Router } from 'express';
import AIController from '../controllers/AIController.js';
import authenticate from '#@/core/middleware/auth.js';
import requireTenant from '#@/core/middleware/tenant.js';

const router = Router();

// Apply authentication and tenant isolation globally
router.use(authenticate, requireTenant);

// GET /api/v1/ai/history
router.get('/history', AIController.getHistory);

// POST /api/v1/ai/query
router.post('/query', AIController.processQuery);

export default router;
