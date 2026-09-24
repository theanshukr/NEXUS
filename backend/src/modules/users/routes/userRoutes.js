import { Router } from 'express';
import UserController from '../controllers/UserController.js';
import authenticate from '#@/core/middleware/auth.js';
import requireTenant from '#@/core/middleware/tenant.js';

const router = Router();

// All user management routes are protected and require tenant context
router.use(authenticate, requireTenant);

// GET /api/v1/users/pending -> List all pending users
router.get('/pending', UserController.getPending);

// POST /api/v1/users/:userId/approve -> Approve a pending user
router.post('/:userId/approve', UserController.approveUser);

// POST /api/v1/users/:userId/reject -> Reject a pending user
router.post('/:userId/reject', UserController.rejectUser);

// Admin actions
router.post('/:userId/revoke-tokens', UserController.revokeTokens);
router.patch('/:userId/suspend', UserController.suspendUser);
router.post('/:userId/reset-password', UserController.resetPassword);

export default router;
