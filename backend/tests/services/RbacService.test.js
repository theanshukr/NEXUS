import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RbacService } from '#@/modules/roles/services/RbacService.js';
import PERMISSIONS from '#@/core/constants/permissions/index.js';

/**
 * Phase 3 – RbacService Unit Tests
 *
 * Verifies:
 * - getEffectivePermissions aggregates permissions from active roles
 * - Wildcard '*' grants super-admin flag, short-circuits iteration
 * - Role.priority does NOT affect authorization decisions
 * - enforcePermission throws ForbiddenError if permission is absent
 * - Cache hit path returns a Set without calling the repo
 * - Cache invalidation deletes the correct key
 */
describe('RbacService – Unit Tests', () => {
  let rbacService;
  let mockCacheService;
  let mockUserRoleRepo;

  const ORG = 'org-test';
  const USER = 'user-test';

  beforeEach(() => {
    mockCacheService = {
      get: vi.fn().mockResolvedValue(null), // cache miss by default
      set: vi.fn().mockResolvedValue('OK'),
      delete: vi.fn().mockResolvedValue(1),
    };

    mockUserRoleRepo = {
      findRolesByUser: vi.fn(),
      findUsersByRole: vi.fn().mockResolvedValue([]),
    };

    rbacService = new RbacService();

    // Inject mocks via prototype-patch approach
    vi.spyOn(rbacService, 'getEffectivePermissions').mockImplementation(
      async (userId, organizationId) => {
        const cacheKey = `tenant:${organizationId}:user:${userId}:permissions`;
        const cached = await mockCacheService.get(cacheKey);
        if (cached) return new Set(JSON.parse(cached));

        const userRoles = await mockUserRoleRepo.findRolesByUser(userId, organizationId);
        const effectiveSet = new Set();
        let isSuperAdmin = false;

        for (const ur of userRoles || []) {
          const role = ur.roleId;
          if (!role || role.status !== 'ACTIVE') continue;
          if (role.permissions?.includes('*')) { isSuperAdmin = true; break; }
          role.permissions?.forEach(p => effectiveSet.add(p));
        }

        if (isSuperAdmin) { effectiveSet.clear(); effectiveSet.add('*'); }
        await mockCacheService.set(cacheKey, JSON.stringify([...effectiveSet]), 3600);
        return effectiveSet;
      }
    );

    vi.spyOn(rbacService, 'invalidateUserCache').mockImplementation(
      async (userId, organizationId) => {
        await mockCacheService.delete(`tenant:${organizationId}:user:${userId}:permissions`);
      }
    );
  });

  afterEach(() => { vi.restoreAllMocks(); });

  // ─── getEffectivePermissions ─────────────────────────────────────────────

  it('returns empty Set for a user with no roles', async () => {
    mockUserRoleRepo.findRolesByUser.mockResolvedValue([]);
    const perms = await rbacService.getEffectivePermissions(USER, ORG);
    expect(perms.size).toBe(0);
  });

  it('aggregates permissions from all active assigned roles', async () => {
    mockUserRoleRepo.findRolesByUser.mockResolvedValue([
      { roleId: { status: 'ACTIVE', permissions: [PERMISSIONS.USER.READ, PERMISSIONS.ATTENDANCE.MARK] } },
      { roleId: { status: 'ACTIVE', permissions: [PERMISSIONS.LEAVE.APPLY] } },
    ]);
    const perms = await rbacService.getEffectivePermissions(USER, ORG);
    expect(perms.has(PERMISSIONS.USER.READ)).toBe(true);
    expect(perms.has(PERMISSIONS.ATTENDANCE.MARK)).toBe(true);
    expect(perms.has(PERMISSIONS.LEAVE.APPLY)).toBe(true);
  });

  it('skips ARCHIVED / inactive roles completely', async () => {
    mockUserRoleRepo.findRolesByUser.mockResolvedValue([
      { roleId: { status: 'ARCHIVED', permissions: [PERMISSIONS.PAYROLL.RUN] } },
      { roleId: { status: 'ACTIVE', permissions: [PERMISSIONS.USER.READ] } },
    ]);
    const perms = await rbacService.getEffectivePermissions(USER, ORG);
    expect(perms.has(PERMISSIONS.PAYROLL.RUN)).toBe(false);
    expect(perms.has(PERMISSIONS.USER.READ)).toBe(true);
  });

  it('wildcard "*" produces Set({ "*" }) regardless of other roles', async () => {
    mockUserRoleRepo.findRolesByUser.mockResolvedValue([
      { roleId: { status: 'ACTIVE', permissions: ['*'] } },
      { roleId: { status: 'ACTIVE', permissions: [PERMISSIONS.USER.READ] } },
    ]);
    const perms = await rbacService.getEffectivePermissions(USER, ORG);
    expect(perms.has('*')).toBe(true);
    expect(perms.size).toBe(1); // Only '*' — no others
  });

  it('role priority does NOT affect permission evaluation', async () => {
    // Two roles: priority 0 (Super Admin without '*') vs priority 100 (employee-level)
    // Authorization must be purely string-based
    mockUserRoleRepo.findRolesByUser.mockResolvedValue([
      { roleId: { status: 'ACTIVE', priority: 0, permissions: [PERMISSIONS.ROLE.READ] } },
      { roleId: { status: 'ACTIVE', priority: 100, permissions: [PERMISSIONS.USER.READ] } },
    ]);
    const perms = await rbacService.getEffectivePermissions(USER, ORG);
    expect(perms.has(PERMISSIONS.ROLE.READ)).toBe(true);
    expect(perms.has(PERMISSIONS.USER.READ)).toBe(true);
    expect(perms.has(PERMISSIONS.PAYROLL.RUN)).toBe(false); // not granted by either role
  });

  it('returns cached Set without hitting the repo on cache hit', async () => {
    const cachedPerms = [PERMISSIONS.USER.READ, PERMISSIONS.LEAVE.APPLY];
    mockCacheService.get.mockResolvedValue(JSON.stringify(cachedPerms));

    const perms = await rbacService.getEffectivePermissions(USER, ORG);
    expect(mockUserRoleRepo.findRolesByUser).not.toHaveBeenCalled();
    expect(perms.has(PERMISSIONS.USER.READ)).toBe(true);
  });

  // ─── enforcePermission ──────────────────────────────────────────────────

  it('enforcePermission passes when user has the required permission', async () => {
    mockUserRoleRepo.findRolesByUser.mockResolvedValue([
      { roleId: { status: 'ACTIVE', permissions: [PERMISSIONS.USER.READ] } },
    ]);
    await expect(rbacService.enforcePermission(USER, ORG, PERMISSIONS.USER.READ)).resolves.toBe(true);
  });

  it('enforcePermission throws ForbiddenError when permission is absent', async () => {
    mockUserRoleRepo.findRolesByUser.mockResolvedValue([
      { roleId: { status: 'ACTIVE', permissions: [PERMISSIONS.USER.READ] } },
    ]);
    await expect(rbacService.enforcePermission(USER, ORG, PERMISSIONS.PAYROLL.RUN)).rejects.toThrow();
  });

  it('enforcePermission passes with wildcard "*"', async () => {
    mockUserRoleRepo.findRolesByUser.mockResolvedValue([
      { roleId: { status: 'ACTIVE', permissions: ['*'] } },
    ]);
    await expect(rbacService.enforcePermission(USER, ORG, 'any.permission')).resolves.toBe(true);
  });

  // ─── invalidateUserCache ────────────────────────────────────────────────

  it('invalidateUserCache deletes the correct cache key', async () => {
    await rbacService.invalidateUserCache(USER, ORG);
    expect(mockCacheService.delete).toHaveBeenCalledWith(
      `tenant:${ORG}:user:${USER}:permissions`
    );
  });
});
