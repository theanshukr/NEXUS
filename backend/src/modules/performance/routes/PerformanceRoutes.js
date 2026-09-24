import express from 'express';
import { authenticate } from '../../../core/middleware/auth.js';
import { requireTenant } from '../../../core/middleware/tenant.js';
import { hasPermission } from '../../../core/middleware/hasPermission.js';
import performanceController from '../controllers/PerformanceController.js';

const router = express.Router();

router.use(authenticate);
router.use(requireTenant);

// Goals
router.get('/goals', performanceController.getAllGoals); // Usually filtered by 'my goals' vs 'all goals' in controller
router.post('/goals', hasPermission('performance.manage'), performanceController.createGoal);
router.patch('/goals/:id', hasPermission('performance.manage'), performanceController.updateGoal);

// Reviews
router.get('/reviews', performanceController.getAllReviews);
router.post('/reviews', hasPermission('performance.manage'), performanceController.createReview);

export default router;
