import jwt from 'jsonwebtoken';
import env from '#@/config/env.js';
import cacheService from '#@/platform/cache/index.js';
import { AuthError } from '#@/core/errors/AppError.js';

/**
 * Candidate Authentication Middleware (`candidateAuthenticate`)
 * Verifies short-lived Bearer JWT access token using the CANDIDATE secret.
 * Validates session existence via CacheService.
 * Employee tokens will fail verification here due to the different secret.
 */
export const candidateAuthenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthError('Missing or malformed Authorization Bearer header.', 401);
    }

    const token = authHeader.split(' ')[1];

    // 1. Verify JWT signature and expiration using CANDIDATE secret
    const decoded = jwt.verify(token, env.JWT_CANDIDATE_ACCESS_SECRET);

    // 2. Validate live session in CacheService
    if (decoded.sessionId) {
      const sessionKey = `candidateSession:${decoded.organizationId}:${decoded.candidateId}:${decoded.sessionId}`;
      const sessionExists = await cacheService.exists(sessionKey);
      if (!sessionExists) {
        throw new AuthError('Session expired or revoked. Please log in again.', 401, 'ERR_SESSION_REVOKED');
      }
    }

    // 3. Bind principal identity to request context
    req.candidate = {
      candidateId: decoded.candidateId,
      organizationId: decoded.organizationId,
      email: decoded.email,
      sessionId: decoded.sessionId
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      next(new AuthError('Access token has expired.', 401, 'ERR_TOKEN_EXPIRED'));
    } else if (error.name === 'JsonWebTokenError') {
      next(new AuthError('Invalid or malformed candidate access token.', 401));
    } else {
      next(error);
    }
  }
};

export default candidateAuthenticate;
