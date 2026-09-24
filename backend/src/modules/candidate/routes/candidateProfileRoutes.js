import { Router } from 'express';
import candidateProfileController from '../controllers/CandidateProfileController.js';
import candidateRequireTenant from '#@/core/middleware/candidateTenant.js';
import candidateAuthenticate from '#@/core/middleware/candidateAuth.js';
import validate from '#@/core/middleware/validator.js';
import { updateProfileSchema } from '../validators/candidateProfileValidator.js';

const router = Router({ mergeParams: true });

router.use(candidateRequireTenant);
router.use(candidateAuthenticate);

router.get('/', candidateProfileController.getProfile);
router.put('/', validate(updateProfileSchema), candidateProfileController.updateProfile);

export default router;
