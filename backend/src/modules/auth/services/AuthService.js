import logger from '#@/platform/logger/index.js';
import cacheService from '#@/platform/cache/index.js';
import UserRepository from '#@/modules/users/repositories/UserRepository.js';
import OrganizationRepository from '#@/modules/organization/repositories/OrganizationRepository.js';
import TokenRepository from '#@/modules/auth/repositories/TokenRepository.js';
import TokenService from '#@/modules/auth/services/TokenService.js';
import { comparePassword, hashToken, generateUuid, hashPassword } from '#@/core/utils/crypto.js';
import { AuthError, ForbiddenError } from '#@/core/errors/AppError.js';
import User from '#@/modules/users/models/User.js';

const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export class AuthService {
  /**
   * Authenticates user credentials and issues short-lived JWT access tokens and rotated refresh tokens.
   * Enforces brute-force lockout rules (5 consecutive failures = 15m lockout).
   */
  async login(email, password, organizationCode = null, req = {}) {
    const targetEmail = email.toLowerCase().trim();
    let user;

    if (organizationCode) {
      const org = await OrganizationRepository.findByCode(organizationCode);
      if (!org || org.status !== 'ACTIVE') {
        throw new AuthError('Invalid or inactive organization code.', 401);
      }
      user = await UserRepository.findByEmailAndTenant(targetEmail, org._id);
    } else {
      const matchedUsers = await User.find({ email: targetEmail });
      if (matchedUsers.length === 0) {
        console.log("No matched users found for email:", targetEmail);
        throw new AuthError('Invalid email or password.', 401);
      }
      if (matchedUsers.length > 1) {
        throw new AuthError('Multiple organization accounts associated with this email. Please specify your organization code.', 400, 'ERR_ORG_CODE_REQUIRED');
      }
      user = matchedUsers[0];
    }

    if (!user) {
      console.log("User is undefined after matching");
      throw new AuthError('Invalid email or password.', 401);
    }

    if (user.status === 'SUSPENDED') {
      throw new ForbiddenError('Your account has been suspended by an organization administrator.');
    }

    if (user.status === 'LOCKED') {
      if (user.lockoutUntil && new Date() < user.lockoutUntil && process.env.NODE_ENV === 'production') {
        const remainingMin = Math.ceil((user.lockoutUntil - new Date()) / 60000);
        throw new AuthError(`Account is temporarily locked due to consecutive failed login attempts. Try again in ${remainingMin} minutes.`, 423, 'ERR_ACCOUNT_LOCKED');
      }
      await UserRepository.resetFailedLogins(user._id, user.organizationId);
      user.status = 'ACTIVE';
      user.failedLoginAttempts = 0;
    }

    const isPasswordValid = await comparePassword(password, user.passwordHash);

    if (!isPasswordValid) {
      const updatedUser = await UserRepository.incrementFailedLogins(user._id, user.organizationId);
      // Skip locking out in local development for easier testing
      if (updatedUser.failedLoginAttempts >= MAX_FAILED_LOGIN_ATTEMPTS && process.env.NODE_ENV !== 'development') {
        const lockoutUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
        await UserRepository.lockAccount(user._id, lockoutUntil, user.organizationId);
        logger.warn({ userId: user._id, organizationId: user.organizationId }, 'Account locked out after 5 consecutive failed login attempts');
        throw new AuthError('Account has been locked for 15 minutes due to 5 consecutive failed login attempts.', 423, 'ERR_ACCOUNT_LOCKED');
      }
      console.log("Password invalid for user:", user.email, password, user.passwordHash);
      throw new AuthError('Invalid email or password.', 401);
    }

    await UserRepository.resetFailedLogins(user._id, user.organizationId);

    const sessionId = generateUuid();
    const accessToken = await TokenService.generateAccessToken(user, sessionId);
    const refreshToken = await TokenService.generateRefreshToken(user, req);

    logger.info({ userId: user._id, organizationId: user.organizationId, sessionId }, 'User logged in successfully');

    await import('#@/modules/roles/models/Role.js');
    const UserRoleRepository = (await import('#@/modules/roles/repositories/UserRoleRepository.js')).default;
    const userRolesDocs = await UserRoleRepository.findRolesByUser(user._id, user.organizationId);
    const roles = userRolesDocs.map(ur => ur.roleId?.name).filter(Boolean);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        organizationId: user.organizationId,
        roles: roles
      }
    };
  }

  /**
   * Terminates active session: revokes refresh token in DB and deletes session metadata via CacheService.
   */
  async logout(userContext, refreshTokenCookie) {
    const { userId, organizationId, sessionId } = userContext;

    if (sessionId) {
      const cacheKey = `tenant:${organizationId}:session:${userId}:${sessionId}`;
      await cacheService.delete(cacheKey);
    }

    if (refreshTokenCookie) {
      const tokenHash = hashToken(refreshTokenCookie);
      const storedToken = await TokenRepository.findByTokenHash(tokenHash);
      if (storedToken) {
        await TokenRepository.revokeToken(storedToken._id, organizationId);
      }
    }

    logger.info({ userId, organizationId, sessionId }, 'User logged out successfully');
    return true;
  }

  /**
   * Revokes all active sessions for a user (called during employee suspension or termination).
   */
  async revokeAllSessions(userId, organizationId) {
    await TokenService.revokeAllUserSessions(userId, organizationId);
  }

  /**
   * Register a new employee user associated with a domain. Status is PENDING_APPROVAL.
   */
  async employeeSignup(payload) {
    const { firstName, lastName, email, password } = payload;
    const targetEmail = email.toLowerCase().trim();
    const parts = targetEmail.split('@');
    if (parts.length !== 2) {
      throw new AuthError('Invalid email format.', 400);
    }
    const domain = parts[1];

    const org = await OrganizationRepository.findByDomain(domain);
    if (!org || org.status !== 'ACTIVE') {
      throw new AuthError('Your company is not registered on this platform or is inactive.', 400);
    }

    const existingUser = await UserRepository.findByEmailAndTenant(targetEmail, org._id);
    if (existingUser) {
      throw new AuthError('An account with this email already exists.', 409);
    }

    const passwordHash = await hashPassword(password);

    const user = await UserRepository.createScoped({
      email: targetEmail,
      passwordHash,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      status: 'PENDING_APPROVAL'
    }, org._id);

    logger.info({ userId: user._id, organizationId: org._id }, 'New employee signup requested (Pending Approval)');
    return user;
  }
}

export default new AuthService();
