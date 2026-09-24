import jwt from 'jsonwebtoken';
import env from '#@/config/env.js';
import cacheService from '#@/platform/cache/index.js';
import TokenRepository from '#@/modules/auth/repositories/TokenRepository.js';
import { hashToken, generateUuid } from '#@/core/utils/crypto.js';
import { AuthError } from '#@/core/errors/AppError.js';
import logger from '#@/platform/logger/index.js';

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60; // 15 minutes
const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

export class TokenService {
  /**
   * Generates a short-lived JWT Access Token and stores session metadata via CacheService.
   */
  async generateAccessToken(user, sessionId) {
    const payload = {
      userId: user._id || user.id,
      organizationId: user.organizationId,
      email: user.email,
      sessionId
    };

    const accessToken = jwt.sign(payload, env.JWT_ACCESS_SECRET, {
      expiresIn: ACCESS_TOKEN_TTL_SECONDS
    });

    // Store active session metadata in CacheService for instant access revocation support
    const cacheKey = `tenant:${user.organizationId}:session:${payload.userId}:${sessionId}`;
    await cacheService.set(
      cacheKey,
      JSON.stringify({
        email: user.email,
        status: user.status,
        loginAt: new Date().toISOString()
      }),
      REFRESH_TOKEN_TTL_SECONDS
    );

    return accessToken;
  }

  /**
   * Generates a cryptographically secure UUIDv4 refresh token, hashes it with SHA-256,
   * and saves it to MongoDB. Returns the PLAINTEXT token for the browser HttpOnly cookie.
   */
  async generateRefreshToken(user, req = {}) {
    const plaintextToken = generateUuid();
    const tokenHash = hashToken(plaintextToken);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000);

    await TokenRepository.createScoped({
      userId: user._id || user.id,
      tokenHash,
      deviceIp: req.ip || '0.0.0.0',
      userAgent: req.headers?.['user-agent'] || 'Unknown',
      expiresAt,
      isRevoked: false
    }, user.organizationId);

    return plaintextToken;
  }

  /**
   * Rotates a refresh token: validates existing token from cookie, revokes it,
   * and issues a new pair of access and refresh tokens.
   */
  async rotateRefreshToken(plaintextToken, req = {}) {
    if (!plaintextToken) {
      throw new AuthError('Refresh token missing from cookie.', 401);
    }

    const tokenHash = hashToken(plaintextToken);
    const storedToken = await TokenRepository.findByTokenHash(tokenHash);

    if (!storedToken) {
      logger.warn('Refresh token replay or invalid token detected during rotation');
      throw new AuthError('Invalid or expired refresh token. Please log in again.', 401);
    }

    if (new Date() > storedToken.expiresAt) {
      await TokenRepository.revokeToken(storedToken._id, storedToken.organizationId);
      throw new AuthError('Refresh token has expired.', 401);
    }

    // Revoke the used refresh token (one-time use rotation)
    await TokenRepository.revokeToken(storedToken._id, storedToken.organizationId);

    // Populate user to get clean profile
    const User = (await import('#@/modules/users/models/User.js')).default;
    const user = await User.findOne({ _id: storedToken.userId, organizationId: storedToken.organizationId });

    if (!user || user.status !== 'ACTIVE') {
      throw new AuthError('User account is locked, suspended, or not found.', 401);
    }

    const newSessionId = generateUuid();
    const newAccessToken = await this.generateAccessToken(user, newSessionId);
    const newRefreshToken = await this.generateRefreshToken(user, req);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        organizationId: user.organizationId
      }
    };
  }

  /**
   * Revokes all active refresh tokens and cache sessions for a user.
   */
  async revokeAllUserSessions(userId, organizationId) {
    await TokenRepository.revokeAllUserTokens(userId, organizationId);
    
    // Delete all active cache session keys for this user
    const pattern = `tenant:${organizationId}:session:${userId}:*`;
    const keys = await cacheService.keys(pattern);
    if (keys && keys.length > 0) {
      await cacheService.delete(...keys);
    }
    logger.info({ userId, organizationId, revokedSessions: keys ? keys.length : 0 }, 'Revoked all user sessions and refresh tokens');
  }
}

export default new TokenService();
