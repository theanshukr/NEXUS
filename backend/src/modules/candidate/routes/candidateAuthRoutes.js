import { Router } from 'express';
import candidateAuthController from '../controllers/CandidateAuthController.js';
import candidateRequireTenant from '#@/core/middleware/candidateTenant.js';
import candidateAuthenticate from '#@/core/middleware/candidateAuth.js';

const router = Router({ mergeParams: true }); // Important: mergeParams to access :slug from parent router

// Apply tenant resolution to all routes in this router
router.use(candidateRequireTenant);

// Public candidate authentication routes
router.post('/register', candidateAuthController.register);
router.post('/login', candidateAuthController.login);

// Protected candidate routes (require candidate token)
router.post('/logout', candidateAuthenticate, candidateAuthController.logout);

export default router;
