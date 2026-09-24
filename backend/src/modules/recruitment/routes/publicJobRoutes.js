import { Router } from 'express';
import jobPostingController from '../controllers/JobPostingController.js';
import candidateRequireTenant from '#@/core/middleware/candidateTenant.js';

const router = Router({ mergeParams: true });

router.use(candidateRequireTenant);

router.get('/', jobPostingController.getPublicJobs);
router.get('/:idOrSlug', jobPostingController.getPublicJobByIdOrSlug);

export default router;
