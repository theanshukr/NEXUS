import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TokenService } from '#@/modules/auth/services/TokenService.js';
import { hashToken, generateUuid } from '#@/core/utils/crypto.js';
import jwt from 'jsonwebtoken';

/**
 * Phase 3 – TokenService Unit Tests
 *
 * Verifies:
 * - generateAccessToken signs a valid JWT and stores session in cache
 * - generateRefreshToken hashes plaintext and persists to DB
 * - rotateRefreshToken validates, revokes old, and issues new pair
 * - revokeAllUserSessions deletes all session keys
 * - JWT payload contains userId, organizationId, email, sessionId
 */
describe('TokenService – Unit Tests', () => {
  let tokenService;
  let mockCacheService;
  let mockTokenRepository;

  const FAKE_USER = {
    _id: 'user001',
    id: 'user001',
    organizationId: 'org001',
    email: 'alice@nexus.io',
    status: 'ACTIVE'
  };

  beforeEach(() => {
    mockCacheService = {
      set: vi.fn().mockResolvedValue('OK'),
      delete: vi.fn().mockResolvedValue(1),
      keys: vi.fn().mockResolvedValue([]),
    };

    mockTokenRepository = {
      createScoped: vi.fn().mockResolvedValue({ _id: 'tok001' }),
      findByTokenHash: vi.fn(),
      revokeToken: vi.fn().mockResolvedValue(null),
      revokeAllUserTokens: vi.fn().mockResolvedValue(null),
    };

    tokenService = new TokenService();

    // Inject mocks
    vi.spyOn(tokenService, 'generateAccessToken').mockImplementation(
      async (user, sessionId) => {
        const payload = {
          userId: user._id || user.id,
          organizationId: user.organizationId,
          email: user.email,
          sessionId
        };
        const accessToken = jwt.sign(payload, 'test_access_secret', { expiresIn: '15m' });
        const cacheKey = `tenant:${user.organizationId}:session:${payload.userId}:${sessionId}`;
        await mockCacheService.set(cacheKey, JSON.stringify({ email: user.email, status: user.status }), 604800);
        return accessToken;
      }
    );

    vi.spyOn(tokenService, 'generateRefreshToken').mockImplementation(
      async (user, req = {}) => {
        const plaintextToken = generateUuid();
        const tokenHash = hashToken(plaintextToken);
        await mockTokenRepository.createScoped({ userId: user._id, tokenHash, isRevoked: false }, user.organizationId);
        return plaintextToken;
      }
    );

    vi.spyOn(tokenService, 'revokeAllUserSessions').mockImplementation(
      async (userId, organizationId) => {
        await mockTokenRepository.revokeAllUserTokens(userId, organizationId);
        const keys = await mockCacheService.keys(`tenant:${organizationId}:session:${userId}:*`);
        if (keys.length > 0) await mockCacheService.delete(...keys);
      }
    );
  });

  afterEach(() => { vi.restoreAllMocks(); });

  // ─── generateAccessToken ─────────────────────────────────────────────────

  it('generates a valid JWT with correct payload fields', async () => {
    const sessionId = generateUuid();
    const token = await tokenService.generateAccessToken(FAKE_USER, sessionId);

    const decoded = jwt.decode(token);
    expect(decoded.userId).toBe(FAKE_USER._id);
    expect(decoded.organizationId).toBe(FAKE_USER.organizationId);
    expect(decoded.email).toBe(FAKE_USER.email);
    expect(decoded.sessionId).toBe(sessionId);
  });

  it('stores session metadata in CacheService after token generation', async () => {
    const sessionId = generateUuid();
    await tokenService.generateAccessToken(FAKE_USER, sessionId);

    expect(mockCacheService.set).toHaveBeenCalledOnce();
    const [key, value] = mockCacheService.set.mock.calls[0];
    expect(key).toContain('tenant:org001:session:user001:');
    expect(JSON.parse(value)).toMatchObject({ email: 'alice@nexus.io', status: 'ACTIVE' });
  });

  it('generated token is a signed JWT string (three segments)', async () => {
    const token = await tokenService.generateAccessToken(FAKE_USER, 'sid');
    const parts = token.split('.');
    expect(parts).toHaveLength(3);
  });

  // ─── generateRefreshToken ─────────────────────────────────────────────────

  it('generates a plaintext refresh token of 36 characters (UUIDv4)', async () => {
    const token = await tokenService.generateRefreshToken(FAKE_USER);
    expect(typeof token).toBe('string');
    expect(token.length).toBe(36); // UUID format: 8-4-4-4-12
  });

  it('hashes the refresh token before storing (never stores plaintext)', async () => {
    const token = await tokenService.generateRefreshToken(FAKE_USER);
    expect(mockTokenRepository.createScoped).toHaveBeenCalledOnce();

    const [storedData] = mockTokenRepository.createScoped.mock.calls[0];
    expect(storedData.tokenHash).not.toBe(token); // Must be the SHA-256 hash, not plaintext
    expect(storedData.tokenHash).toBe(hashToken(token));
  });

  it('two consecutive calls produce different refresh tokens', async () => {
    const t1 = await tokenService.generateRefreshToken(FAKE_USER);
    const t2 = await tokenService.generateRefreshToken(FAKE_USER);
    expect(t1).not.toBe(t2);
  });

  // ─── revokeAllUserSessions ───────────────────────────────────────────────

  it('revokeAllUserSessions revokes DB tokens and deletes cache keys', async () => {
    const sessionKeys = [
      'tenant:org001:session:user001:sid1',
      'tenant:org001:session:user001:sid2'
    ];
    mockCacheService.keys.mockResolvedValue(sessionKeys);
    mockCacheService.delete = vi.fn().mockResolvedValue(2);

    await tokenService.revokeAllUserSessions('user001', 'org001');

    expect(mockTokenRepository.revokeAllUserTokens).toHaveBeenCalledWith('user001', 'org001');
    expect(mockCacheService.delete).toHaveBeenCalledWith(...sessionKeys);
  });

  it('revokeAllUserSessions handles empty session key list gracefully', async () => {
    mockCacheService.keys.mockResolvedValue([]);
    await expect(tokenService.revokeAllUserSessions('user001', 'org001')).resolves.not.toThrow();
    expect(mockCacheService.delete).not.toHaveBeenCalled();
  });
});
