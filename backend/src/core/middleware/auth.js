import jwt from 'jsonwebtoken';
import env from '#@/config/env.js';
import cacheService from '#@/platform/cache/index.js';
import { AuthError } from '#@/core/errors/AppError.js';

/**
 * Authentication Middleware (`authenticate`)
 * Verifies short-lived Bearer JWT access token and validates session existence via CacheService.
 * Separates identity verification from authorization rules.
 */
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthError('Missing or malformed Authorization Bearer header.', 401);
    }

    const token = authHeader.split(' ')[1];

    // 1. Verify JWT signature and expiration
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);

    // 2. Validate live session in CacheService (catches revoked tokens / logged out users instantly)
    if (decoded.sessionId) {
      const sessionKey = `tenant:${decoded.organizationId}:session:${decoded.userId}:${decoded.sessionId}`;
      const sessionExists = await cacheService.exists(sessionKey);
      if (!sessionExists) {
        throw new AuthError('Session expired or revoked by security administrator. Please log in again.', 401, 'ERR_SESSION_REVOKED');
      }
    }

    // 3. Bind principal identity to request context
    req.user = {
      userId: decoded.userId,
      organizationId: decoded.organizationId,
      email: decoded.email,
      sessionId: decoded.sessionId
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      next(new AuthError('Access token has expired.', 401, 'ERR_TOKEN_EXPIRED'));
    } else if (error.name === 'JsonWebTokenError') {
      next(new AuthError('Invalid or malformed access token.', 401));
    } else {
      next(error);
    }
  }
};

export default authenticate;
