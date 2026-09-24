import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import env from '#@/config/env.js';
import cacheService from '#@/platform/cache/index.js';
import { AuthError, ValidationError, NotFoundError } from '#@/core/errors/AppError.js';
import Candidate from '../models/Candidate.js';
import CandidateProfile from '../models/CandidateProfile.js';
import { runInTransaction } from '#@/platform/database/db.js';

export class CandidateAuthService {
  /**
   * Register a new candidate
   */
  async register(organizationId, payload) {
    const { email, password, firstName, lastName, phone } = payload;
    
    // Check if candidate already exists
    const existing = await Candidate.findOne({ organizationId, email: email.toLowerCase() });
    if (existing) {
      throw new ValidationError('A candidate with this email already exists for this organization.');
    }
    
    const passwordHash = await bcrypt.hash(password, 12);
    
    // Create candidate and profile inside a transaction
    return await runInTransaction(async (session) => {
      const candidate = new Candidate({
        organizationId,
        email: email.toLowerCase(),
        passwordHash
      });
      await candidate.save({ session });
      
      const profile = new CandidateProfile({
        candidateId: candidate._id,
        organizationId,
        firstName,
        lastName,
        phone: phone || ''
      });
      await profile.save({ session });
      
      return this._generateTokensAndSession(candidate._id, organizationId, email.toLowerCase());
    });
  }

  /**
   * Login candidate
   */
  async login(organizationId, email, password, requestInfo = {}) {
    const candidate = await Candidate.findOne({ organizationId, email: email.toLowerCase() }).select('+passwordHash');
    if (!candidate) {
      throw new AuthError('Invalid email or password.', 401);
    }
    
    if (candidate.status === 'LOCKED') {
      throw new AuthError('Account is locked. Please contact support.', 403);
    }
    
    const isValid = await bcrypt.compare(password, candidate.passwordHash);
    if (!isValid) {
      throw new AuthError('Invalid email or password.', 401);
    }
    
    candidate.lastLogin = new Date();
    await candidate.save();
    
    return this._generateTokensAndSession(candidate._id, organizationId, candidate.email, requestInfo);
  }

  /**
   * Logout candidate
   */
  async logout(organizationId, candidateId, sessionId) {
    const sessionKey = `candidateSession:${organizationId}:${candidateId}:${sessionId}`;
    await cacheService.delete(sessionKey);
  }

  /**
   * Internal helper to generate tokens and session
   */
  async _generateTokensAndSession(candidateId, organizationId, email, requestInfo = {}) {
    const sessionId = crypto.randomBytes(16).toString('hex');
    
    // JWT Payload
    const payload = {
      candidateId: candidateId.toString(),
      organizationId: organizationId.toString(),
      email,
      sessionId
    };
    
    // Access token (15 mins)
    const accessToken = jwt.sign(payload, env.JWT_CANDIDATE_ACCESS_SECRET, { expiresIn: '15m' });
    
    // Refresh token (7 days)
    const refreshToken = jwt.sign(payload, env.JWT_CANDIDATE_REFRESH_SECRET, { expiresIn: '7d' });
    
    // Session tracking in Redis for revocation and device management
    const sessionKey = `candidateSession:${organizationId}:${candidateId}:${sessionId}`;
    const sessionData = {
      candidateId: candidateId.toString(),
      email,
      createdAt: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      deviceName: requestInfo.deviceName || 'Unknown Device',
      deviceId: requestInfo.deviceId || 'Unknown ID',
      ip: requestInfo.ip || 'Unknown IP',
      userAgent: requestInfo.userAgent || 'Unknown Agent'
    };
    
    // TTL matches refresh token (7 days)
    await cacheService.set(sessionKey, JSON.stringify(sessionData), 7 * 24 * 60 * 60);
    
    return {
      accessToken,
      refreshToken,
      candidate: {
        id: candidateId,
        email
      }
    };
  }
}

export default new CandidateAuthService();
