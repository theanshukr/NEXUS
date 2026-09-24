import { Router } from 'express';
import AuthController from '#@/modules/auth/controllers/AuthController.js';
import authenticate from '#@/core/middleware/auth.js';
import requireTenant from '#@/core/middleware/tenant.js';
import validate from '#@/core/middleware/validator.js';
import { loginSchema, registerViaInviteSchema, employeeSignupSchema } from '#@/core/middleware/validatorSchemas.js';

const router = Router();

// Public Authentication Endpoints
router.post('/login', validate(loginSchema), AuthController.login);
router.post('/refresh', AuthController.refresh);
router.post('/register-invite', validate(registerViaInviteSchema), AuthController.registerViaInvite);
router.post('/employee-signup', validate(employeeSignupSchema), AuthController.employeeSignup);

// Protected Authentication Endpoints
router.post('/logout', authenticate, AuthController.logout);
router.get('/me', authenticate, requireTenant, AuthController.getMe);

export default router;
