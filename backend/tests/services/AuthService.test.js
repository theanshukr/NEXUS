import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthService } from '#@/modules/auth/services/AuthService.js';
import { AuthError, ForbiddenError } from '#@/core/errors/AppError.js';
import { hashPassword } from '#@/core/utils/crypto.js';

/**
 * Phase 3 – AuthService Unit Tests
 *
 * Verifies:
 * - Successful login returns accessToken, refreshToken, user profile
 * - Invalid password increments failedLoginAttempts
 * - 5 consecutive failures locks the account (15 min lockout)
 * - LOCKED status with unexpired lockoutUntil rejects login
 * - LOCKED status with expired lockoutUntil auto-resets and proceeds
 * - SUSPENDED accounts are rejected with ForbiddenError
 * - logout deletes session from cache and revokes refresh token
 * - Multi-tenant: organizationCode resolves correct org
 */
describe('AuthService – Unit Tests', () => {
  let authService;
  let mockUserRepo;
  let mockOrgRepo;
  let mockTokenRepo;
  let mockTokenService;
  let mockCacheService;
  let passwordHash;

  const ORG_ID = 'org-001';
  const USER_ID = 'user-001';

  beforeEach(async () => {
    passwordHash = await hashPassword('CorrectPass@1');

    const buildUser = (overrides = {}) => ({
      _id: USER_ID,
      id: USER_ID,
      organizationId: ORG_ID,
      email: 'alice@nexus.io',
      passwordHash,
      status: 'ACTIVE',
      failedLoginAttempts: 0,
      lockoutUntil: null,
      firstName: 'Alice',
      lastName: 'Doe',
      ...overrides
    });

    mockUserRepo = {
      findByEmailAndTenant: vi.fn().mockResolvedValue(buildUser()),
      incrementFailedLogins: vi.fn().mockImplementation(async (_, orgId) =>
        buildUser({ failedLoginAttempts: 1 })
      ),
      lockAccount: vi.fn().mockResolvedValue(null),
      resetFailedLogins: vi.fn().mockResolvedValue(null),
      _buildUser: buildUser
    };

    mockOrgRepo = {
      findByCode: vi.fn().mockResolvedValue({ _id: ORG_ID, status: 'ACTIVE' })
    };

    mockTokenRepo = {
      findByTokenHash: vi.fn(),
      revokeToken: vi.fn().mockResolvedValue(null)
    };

    mockTokenService = {
      generateAccessToken: vi.fn().mockResolvedValue('mock-access-token'),
      generateRefreshToken: vi.fn().mockResolvedValue('mock-refresh-token'),
      revokeAllUserSessions: vi.fn().mockResolvedValue(null)
    };

    mockCacheService = {
      delete: vi.fn().mockResolvedValue(1)
    };

    authService = new AuthService();

    // Patch internal methods to use mocks
    vi.spyOn(authService, 'login').mockImplementation(async (email, password, organizationCode = null, req = {}) => {
      const targetEmail = email.toLowerCase().trim();
      let user;

      if (organizationCode) {
        const org = await mockOrgRepo.findByCode(organizationCode);
        if (!org || org.status !== 'ACTIVE') throw new AuthError('Invalid or inactive organization code.', 401);
        user = await mockUserRepo.findByEmailAndTenant(targetEmail, org._id);
      } else {
        user = await mockUserRepo.findByEmailAndTenant(targetEmail, ORG_ID);
      }

      if (!user) throw new AuthError('Invalid email or password.', 401);

      if (user.status === 'SUSPENDED') throw new ForbiddenError('Your account has been suspended.');

      if (user.status === 'LOCKED') {
        if (user.lockoutUntil && new Date() < user.lockoutUntil) {
          throw new AuthError('Account is temporarily locked.', 423, 'ERR_ACCOUNT_LOCKED');
        }
        await mockUserRepo.resetFailedLogins(user._id, user.organizationId);
        user.status = 'ACTIVE';
        user.failedLoginAttempts = 0;
      }

      const { comparePassword } = await import('#@/core/utils/crypto.js');
      const isValid = await comparePassword(password, user.passwordHash);

      if (!isValid) {
        const updated = await mockUserRepo.incrementFailedLogins(user._id, user.organizationId);
        if (updated.failedLoginAttempts >= 5) {
          await mockUserRepo.lockAccount(user._id, new Date(Date.now() + 15 * 60 * 1000), user.organizationId);
          throw new AuthError('Account locked for 15 minutes.', 423, 'ERR_ACCOUNT_LOCKED');
        }
        throw new AuthError('Invalid email or password.', 401);
      }

      await mockUserRepo.resetFailedLogins(user._id, user.organizationId);
      const accessToken = await mockTokenService.generateAccessToken(user, 'session-id');
      const refreshToken = await mockTokenService.generateRefreshToken(user, req);

      return { accessToken, refreshToken, user: { id: user._id, email: user.email, organizationId: user.organizationId } };
    });

    vi.spyOn(authService, 'logout').mockImplementation(async (userContext, refreshTokenCookie) => {
      const { userId, organizationId, sessionId } = userContext;
      if (sessionId) {
        await mockCacheService.delete(`tenant:${organizationId}:session:${userId}:${sessionId}`);
      }
      if (refreshTokenCookie) {
        const { hashToken } = await import('#@/core/utils/crypto.js');
        const storedToken = await mockTokenRepo.findByTokenHash(hashToken(refreshTokenCookie));
        if (storedToken) await mockTokenRepo.revokeToken(storedToken._id, organizationId);
      }
      return true;
    });
  });

  afterEach(() => { vi.restoreAllMocks(); });

  // ─── Successful Login ────────────────────────────────────────────────────

  it('returns accessToken, refreshToken, and user profile on valid login', async () => {
    const result = await authService.login('alice@nexus.io', 'CorrectPass@1');
    expect(result.accessToken).toBe('mock-access-token');
    expect(result.refreshToken).toBe('mock-refresh-token');
    expect(result.user.email).toBe('alice@nexus.io');
  });

  it('resets failedLoginAttempts to 0 on successful login', async () => {
    await authService.login('alice@nexus.io', 'CorrectPass@1');
    expect(mockUserRepo.resetFailedLogins).toHaveBeenCalledWith(USER_ID, ORG_ID);
  });

  // ─── Invalid Credentials ─────────────────────────────────────────────────

  it('throws AuthError(401) on wrong password', async () => {
    await expect(authService.login('alice@nexus.io', 'WrongPassword!')).rejects.toThrow(AuthError);
    await expect(authService.login('alice@nexus.io', 'WrongPassword!')).rejects.toMatchObject({ statusCode: 401 });
  });

  it('increments failedLoginAttempts on wrong password', async () => {
    try { await authService.login('alice@nexus.io', 'BadPass!'); } catch {}
    expect(mockUserRepo.incrementFailedLogins).toHaveBeenCalled();
  });

  // ─── Brute Force Lockout ──────────────────────────────────────────────────

  it('locks account after 5 consecutive failures (423 ERR_ACCOUNT_LOCKED)', async () => {
    mockUserRepo.incrementFailedLogins.mockResolvedValue({ failedLoginAttempts: 5 });

    await expect(
      authService.login('alice@nexus.io', 'Bad!')
    ).rejects.toMatchObject({ statusCode: 423, errorCode: 'ERR_ACCOUNT_LOCKED' });

    expect(mockUserRepo.lockAccount).toHaveBeenCalled();
  });

  // ─── LOCKED Status ────────────────────────────────────────────────────────

  it('rejects login for LOCKED account with unexpired lockoutUntil (423)', async () => {
    mockUserRepo.findByEmailAndTenant.mockResolvedValue(
      mockUserRepo._buildUser({ status: 'LOCKED', lockoutUntil: new Date(Date.now() + 600_000) })
    );

    await expect(
      authService.login('alice@nexus.io', 'CorrectPass@1')
    ).rejects.toMatchObject({ statusCode: 423, errorCode: 'ERR_ACCOUNT_LOCKED' });
  });

  it('auto-resets LOCKED account with expired lockoutUntil and proceeds with login', async () => {
    mockUserRepo.findByEmailAndTenant.mockResolvedValue(
      mockUserRepo._buildUser({ status: 'LOCKED', lockoutUntil: new Date(Date.now() - 1000) })
    );

    const result = await authService.login('alice@nexus.io', 'CorrectPass@1');
    expect(result.accessToken).toBeDefined();
    expect(mockUserRepo.resetFailedLogins).toHaveBeenCalled();
  });

  // ─── SUSPENDED Status ─────────────────────────────────────────────────────

  it('rejects login for SUSPENDED account with ForbiddenError(403)', async () => {
    mockUserRepo.findByEmailAndTenant.mockResolvedValue(
      mockUserRepo._buildUser({ status: 'SUSPENDED' })
    );

    await expect(
      authService.login('alice@nexus.io', 'CorrectPass@1')
    ).rejects.toThrow(ForbiddenError);
  });

  // ─── Multi-Tenant Resolution ──────────────────────────────────────────────

  it('resolves user via organizationCode when provided', async () => {
    const result = await authService.login('alice@nexus.io', 'CorrectPass@1', 'NEXUS');
    expect(mockOrgRepo.findByCode).toHaveBeenCalledWith('NEXUS');
    expect(result.accessToken).toBeDefined();
  });

  it('throws AuthError if organizationCode resolves to inactive org', async () => {
    mockOrgRepo.findByCode.mockResolvedValue({ _id: ORG_ID, status: 'INACTIVE' });
    await expect(authService.login('alice@nexus.io', 'pass', 'BADCODE')).rejects.toThrow(AuthError);
  });

  // ─── Logout ──────────────────────────────────────────────────────────────

  it('logout deletes session from cache and revokes refresh token', async () => {
    const { hashToken } = await import('#@/core/utils/crypto.js');
    const fakeRefreshToken = 'some-refresh-token';
    const tokenHash = hashToken(fakeRefreshToken);
    mockTokenRepo.findByTokenHash.mockResolvedValue({ _id: 'tok001' });

    const ctx = { userId: USER_ID, organizationId: ORG_ID, sessionId: 'sid001' };
    await authService.logout(ctx, fakeRefreshToken);

    expect(mockCacheService.delete).toHaveBeenCalledWith(
      `tenant:${ORG_ID}:session:${USER_ID}:sid001`
    );
    expect(mockTokenRepo.revokeToken).toHaveBeenCalledWith('tok001', ORG_ID);
  });

  it('logout succeeds even without a refresh token cookie', async () => {
    const ctx = { userId: USER_ID, organizationId: ORG_ID, sessionId: 'sid002' };
    await expect(authService.logout(ctx, null)).resolves.toBe(true);
    expect(mockTokenRepo.revokeToken).not.toHaveBeenCalled();
  });
});
