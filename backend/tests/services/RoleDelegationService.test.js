import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import mongoose from 'mongoose';
import RoleDelegationService from '#@/modules/roles/services/RoleDelegationService.js';
import RoleDelegationRepository from '#@/modules/roles/repositories/RoleDelegationRepository.js';
import RoleRepository from '#@/modules/roles/repositories/RoleRepository.js';
import UserRoleRepository from '#@/modules/roles/repositories/UserRoleRepository.js';
import RbacService from '#@/modules/roles/services/RbacService.js';
import cacheService from '#@/platform/cache/index.js';
import { ForbiddenError, ConflictError, ValidationError } from '#@/core/errors/AppError.js';
import PERMISSIONS from '#@/core/constants/permissions/index.js';

describe('RoleDelegationService – Enterprise Dynamic Role Assignment Policy', () => {
  const orgId = new mongoose.Types.ObjectId().toString();
  const actorId = new mongoose.Types.ObjectId().toString();
  const sourceRoleId = new mongoose.Types.ObjectId().toString();
  const targetRoleId1 = new mongoose.Types.ObjectId().toString();
  const targetRoleId2 = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('bypasses delegation policy check if actor holds wildcard "*" permission', async () => {
    vi.spyOn(RbacService, 'getEffectivePermissions').mockResolvedValue(new Set(['*']));
    const allowed = await RoleDelegationService.canAssignRoles({ userId: actorId, organizationId: orgId }, [targetRoleId1]);
    expect(allowed).toBe(true);
  });

  it('returns false if actor holds no roles', async () => {
    vi.spyOn(RbacService, 'getEffectivePermissions').mockResolvedValue(new Set([PERMISSIONS.INVITE.CREATE]));
    vi.spyOn(UserRoleRepository, 'findRolesByUser').mockResolvedValue([]);
    const allowed = await RoleDelegationService.canAssignRoles({ userId: actorId, organizationId: orgId }, [targetRoleId1]);
    expect(allowed).toBe(false);
  });

  it('allows delegation when requested role is within allowed target roles of user roles', async () => {
    vi.spyOn(RbacService, 'getEffectivePermissions').mockResolvedValue(new Set([PERMISSIONS.INVITE.CREATE]));
    vi.spyOn(UserRoleRepository, 'findRolesByUser').mockResolvedValue([{ roleId: sourceRoleId }]);
    vi.spyOn(cacheService, 'get').mockResolvedValue([targetRoleId1, targetRoleId2]);
    vi.spyOn(cacheService, 'set').mockResolvedValue('OK');

    const allowed = await RoleDelegationService.canAssignRoles({ userId: actorId, organizationId: orgId }, [targetRoleId1]);
    expect(allowed).toBe(true);
  });

  it('forbids delegation if even one requested target role is unauthorized (multiple roles)', async () => {
    vi.spyOn(RbacService, 'getEffectivePermissions').mockResolvedValue(new Set([PERMISSIONS.INVITE.CREATE]));
    vi.spyOn(UserRoleRepository, 'findRolesByUser').mockResolvedValue([{ roleId: sourceRoleId }]);
    vi.spyOn(cacheService, 'get').mockResolvedValue([targetRoleId1]); // targetRoleId2 is missing
    vi.spyOn(cacheService, 'set').mockResolvedValue('OK');

    const allowed = await RoleDelegationService.canAssignRoles({ userId: actorId, organizationId: orgId }, [targetRoleId1, targetRoleId2]);
    expect(allowed).toBe(false);
  });

  it('invalidates both roleDelegation and roleAssignment cache keys on cache invalidation', async () => {
    const deleteSpy = vi.spyOn(cacheService, 'delete').mockResolvedValue(1);
    await RoleDelegationService.invalidateCache(orgId, sourceRoleId);
    expect(deleteSpy).toHaveBeenCalledWith(`roleDelegation:${orgId}:${sourceRoleId}`);
    expect(deleteSpy).toHaveBeenCalledWith(`roleAssignment:${orgId}:${sourceRoleId}`);
  });
});
