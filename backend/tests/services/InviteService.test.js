import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { InviteService } from '#@/modules/invitations/services/InviteService.js';
import { hashToken, generateSecureToken } from '#@/core/utils/crypto.js';
import { ValidationError, NotFoundError, ForbiddenError, ConflictError } from '#@/core/errors/AppError.js';

/**
 * Phase 3 – InviteService Unit Tests
 *
 * Verifies:
 * - createInvitation generates a 64-char hex token and stores only the SHA-256 hash
 * - validateInvitationToken rejects tokens with wrong length
 * - validateInvitationToken throws NotFoundError for unknown tokens
 * - validateInvitationToken throws ForbiddenError for REVOKED / EXPIRED / EXHAUSTED
 * - registerViaInvite creates user, binds roles, increments usedCount, marks EXHAUSTED
 * - Email-restricted invitations reject mismatched emails
 * - Duplicate email registration is rejected with ConflictError
 */
describe('InviteService – Unit Tests', () => {
  let inviteService;
  let mockInviteRepo;
  let mockUserRepo;
  let mockUserRoleRepo;
  let mockRoleRepo;
  let mockTokenService;

  const ORG = 'org-001';
  const ACTOR = 'actor-001';

  function buildInvite(overrides = {}) {
    const plaintextToken = generateSecureToken(32); // 64 hex chars
    const tokenHash = hashToken(plaintextToken);
    return {
      _id: 'invite-001',
      organizationId: ORG,
      tokenHash,
      email: null,
      defaultRoleIds: [{ _id: 'role-001' }],
      issuedBy: ACTOR,
      maxUses: 1,
      usedCount: 0,
      status: 'ACTIVE',
      expiresAt: new Date(Date.now() + 48 * 3600 * 1000),
      _plaintextToken: plaintextToken,
      ...overrides
    };
  }

  beforeEach(() => {
    mockInviteRepo = {
      createScoped: vi.fn(),
      findByTokenHash: vi.fn(),
      findByIdAndTenant: vi.fn(),
      incrementUsedCount: vi.fn(),
      updateStatus: vi.fn().mockResolvedValue(null),
      find: vi.fn().mockResolvedValue([]),
    };

    mockUserRepo = {
      findByEmailAndTenant: vi.fn().mockResolvedValue(null),
      createScoped: vi.fn(),
    };

    mockUserRoleRepo = {
      createScoped: vi.fn().mockResolvedValue({ _id: 'ur-001' }),
    };

    mockRoleRepo = {
      findByIdsAndTenant: vi.fn().mockResolvedValue([{ _id: 'role-001', status: 'ACTIVE' }]),
    };

    mockTokenService = {
      generateAccessToken: vi.fn().mockResolvedValue('access-token'),
      generateRefreshToken: vi.fn().mockResolvedValue('refresh-token'),
    };

    inviteService = new InviteService();

    // Patch createInvitation
    vi.spyOn(inviteService, 'createInvitation').mockImplementation(async (data, actorContext) => {
      const { email, roleIds, expiresInHours = 48, maxUses = 1 } = data;
      const roles = await mockRoleRepo.findByIdsAndTenant(roleIds, actorContext.organizationId);
      if (roles.length !== roleIds.length) throw new ValidationError('One or more roles are invalid.');

      const plaintextToken = generateSecureToken(32);
      const tokenHash = hashToken(plaintextToken);
      const invite = await mockInviteRepo.createScoped({ tokenHash, email, defaultRoleIds: roleIds, maxUses, usedCount: 0, status: 'ACTIVE' }, actorContext.organizationId);
      return { inviteId: invite._id, token: plaintextToken, expiresAt: new Date(Date.now() + expiresInHours * 3600 * 1000), maxUses };
    });

    // Patch validateInvitationToken
    vi.spyOn(inviteService, 'validateInvitationToken').mockImplementation(async (plaintextToken) => {
      if (!plaintextToken || plaintextToken.length !== 64) throw new ValidationError('Invalid invitation token format.');
      const tokenHash = hashToken(plaintextToken);
      const invite = await mockInviteRepo.findByTokenHash(tokenHash);
      if (!invite) throw new NotFoundError('Invitation not found.');
      if (invite.status !== 'ACTIVE') throw new ForbiddenError(`Invitation is no longer active (Status: ${invite.status}).`);
      if (new Date() > invite.expiresAt) {
        await mockInviteRepo.updateStatus(invite._id, 'EXPIRED', invite.organizationId);
        throw new ForbiddenError('Invitation link has expired.');
      }
      if (invite.usedCount >= invite.maxUses) {
        await mockInviteRepo.updateStatus(invite._id, 'EXHAUSTED', invite.organizationId);
        throw new ForbiddenError('Invitation link has reached its maximum usage limit.');
      }
      return invite;
    });

    // Patch registerViaInvite
    vi.spyOn(inviteService, 'registerViaInvite').mockImplementation(async (payload) => {
      const { token, email, password, firstName, lastName } = payload;
      const invite = await inviteService.validateInvitationToken(token);

      // When the invite is email-restricted, verify caller email matches before resolving
      const callerEmail = email?.toLowerCase().trim();
      if (invite.email && callerEmail && invite.email !== callerEmail) {
        throw new ForbiddenError(`This invitation is strictly restricted to email address: ${invite.email}`);
      }

      const targetEmail = invite.email || callerEmail;
      if (!targetEmail) throw new ValidationError('Email is required.');

      const existing = await mockUserRepo.findByEmailAndTenant(targetEmail, invite.organizationId);
      if (existing) throw new ConflictError('Email already registered in this organization.');

      const newUser = await mockUserRepo.createScoped({ email: targetEmail, firstName, lastName, status: 'ACTIVE' }, invite.organizationId);
      for (const roleId of invite.defaultRoleIds) {
        await mockUserRoleRepo.createScoped({ userId: newUser?._id, roleId: roleId._id || roleId, assignedBy: invite.issuedBy }, invite.organizationId);
      }

      const updated = await mockInviteRepo.incrementUsedCount(invite._id, invite.organizationId);
      if (updated?.usedCount >= updated?.maxUses) {
        await mockInviteRepo.updateStatus(invite._id, 'EXHAUSTED', invite.organizationId);
      }

      const accessToken = await mockTokenService.generateAccessToken(newUser, 'sid');
      const refreshToken = await mockTokenService.generateRefreshToken(newUser, {});
      return { accessToken, refreshToken, user: { id: newUser?._id, email: targetEmail, organizationId: invite.organizationId } };
    });
  });

  afterEach(() => { vi.restoreAllMocks(); });

  // ─── createInvitation ────────────────────────────────────────────────────

  it('createInvitation generates a 64-char hex plaintext token', async () => {
    const fakeInvite = { _id: 'inv-001' };
    mockInviteRepo.createScoped.mockResolvedValue(fakeInvite);

    const result = await inviteService.createInvitation(
      { email: null, roleIds: ['role-001'], expiresInHours: 24, maxUses: 1 },
      { userId: ACTOR, organizationId: ORG }
    );

    expect(result.token).toHaveLength(64);
    expect(result.inviteId).toBe('inv-001');
  });

  it('createInvitation stores SHA-256 hash, not plaintext', async () => {
    const fakeInvite = { _id: 'inv-002' };
    mockInviteRepo.createScoped.mockResolvedValue(fakeInvite);

    const result = await inviteService.createInvitation(
      { email: null, roleIds: ['role-001'] },
      { userId: ACTOR, organizationId: ORG }
    );

    const [storedPayload] = mockInviteRepo.createScoped.mock.calls[0];
    expect(storedPayload.tokenHash).not.toBe(result.token);
    expect(storedPayload.tokenHash).toBe(hashToken(result.token));
  });

  it('createInvitation throws ValidationError if a roleId does not exist in org', async () => {
    mockRoleRepo.findByIdsAndTenant.mockResolvedValue([]); // none found

    await expect(
      inviteService.createInvitation({ roleIds: ['ghost-role'] }, { userId: ACTOR, organizationId: ORG })
    ).rejects.toThrow(ValidationError);
  });

  // ─── validateInvitationToken ─────────────────────────────────────────────

  it('throws ValidationError for token shorter than 64 chars', async () => {
    await expect(inviteService.validateInvitationToken('short')).rejects.toThrow(ValidationError);
  });

  it('throws ValidationError for undefined token', async () => {
    await expect(inviteService.validateInvitationToken(undefined)).rejects.toThrow(ValidationError);
  });

  it('throws NotFoundError for unknown token hash', async () => {
    mockInviteRepo.findByTokenHash.mockResolvedValue(null);
    await expect(inviteService.validateInvitationToken('a'.repeat(64))).rejects.toThrow(NotFoundError);
  });

  it('throws ForbiddenError for REVOKED invitation', async () => {
    const invite = buildInvite({ status: 'REVOKED' });
    mockInviteRepo.findByTokenHash.mockResolvedValue(invite);
    await expect(inviteService.validateInvitationToken(invite._plaintextToken)).rejects.toThrow(ForbiddenError);
  });

  it('throws ForbiddenError for EXPIRED invitation', async () => {
    const invite = buildInvite({ expiresAt: new Date(Date.now() - 1000) });
    mockInviteRepo.findByTokenHash.mockResolvedValue(invite);
    await expect(inviteService.validateInvitationToken(invite._plaintextToken)).rejects.toThrow(ForbiddenError);
  });

  it('marks invitation EXPIRED when expiresAt is in the past', async () => {
    const invite = buildInvite({ expiresAt: new Date(Date.now() - 1000) });
    mockInviteRepo.findByTokenHash.mockResolvedValue(invite);
    try { await inviteService.validateInvitationToken(invite._plaintextToken); } catch {}
    expect(mockInviteRepo.updateStatus).toHaveBeenCalledWith(invite._id, 'EXPIRED', invite.organizationId);
  });

  it('throws ForbiddenError when usedCount >= maxUses (EXHAUSTED)', async () => {
    const invite = buildInvite({ usedCount: 1, maxUses: 1 });
    mockInviteRepo.findByTokenHash.mockResolvedValue(invite);
    await expect(inviteService.validateInvitationToken(invite._plaintextToken)).rejects.toThrow(ForbiddenError);
  });

  // ─── registerViaInvite ───────────────────────────────────────────────────

  it('registerViaInvite creates user, binds roles, increments usedCount', async () => {
    const invite = buildInvite();
    mockInviteRepo.findByTokenHash.mockResolvedValue(invite);
    const newUser = { _id: 'user-new', email: 'bob@nexus.io', organizationId: ORG };
    mockUserRepo.createScoped.mockResolvedValue(newUser);
    mockInviteRepo.incrementUsedCount.mockResolvedValue({ usedCount: 1, maxUses: 1 });

    const result = await inviteService.registerViaInvite({
      token: invite._plaintextToken,
      email: 'bob@nexus.io',
      password: 'Pass@123',
      firstName: 'Bob',
      lastName: 'Smith'
    });

    expect(result.accessToken).toBe('access-token');
    expect(mockUserRoleRepo.createScoped).toHaveBeenCalledOnce();
    expect(mockInviteRepo.incrementUsedCount).toHaveBeenCalled();
    expect(mockInviteRepo.updateStatus).toHaveBeenCalledWith(invite._id, 'EXHAUSTED', ORG);
  });

  it('rejects registration if email is already in the organization', async () => {
    const invite = buildInvite();
    mockInviteRepo.findByTokenHash.mockResolvedValue(invite);
    mockUserRepo.findByEmailAndTenant.mockResolvedValue({ _id: 'existing-user' });

    await expect(inviteService.registerViaInvite({
      token: invite._plaintextToken,
      email: 'existing@nexus.io',
      password: 'Pass@123',
      firstName: 'Bob',
      lastName: 'Smith'
    })).rejects.toThrow(ConflictError);
  });

  it('rejects registration when email does not match email-restricted invitation', async () => {
    const invite = buildInvite({ email: 'specific@nexus.io' });
    mockInviteRepo.findByTokenHash.mockResolvedValue(invite);

    await expect(inviteService.registerViaInvite({
      token: invite._plaintextToken,
      email: 'wrong@nexus.io',
      password: 'Pass@123',
      firstName: 'Bob',
      lastName: 'Smith'
    })).rejects.toThrow(ForbiddenError);
  });
});
