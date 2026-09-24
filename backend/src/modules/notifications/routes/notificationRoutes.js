import { Router } from 'express';
import NotificationController from '../controllers/NotificationController.js';
import authenticate from '#@/core/middleware/auth.js';
import requireTenant from '#@/core/middleware/tenant.js';

const router = Router();

// Apply authentication and tenant isolation globally to all notification endpoints
router.use(authenticate, requireTenant);

// GET /api/v1/notifications/my
router.get('/my', NotificationController.getMyNotifications);

// POST /api/v1/notifications/read
router.post('/read', NotificationController.markAsRead);

export default router;
