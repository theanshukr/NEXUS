import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import mongoose from 'mongoose';
import { startDb, clearDb, stopDb } from '../setup/db.js';
import RoleRepository from '#@/modules/roles/repositories/RoleRepository.js';
import UserRoleRepository from '#@/modules/roles/repositories/UserRoleRepository.js';
import { TenantIsolationError } from '#@/core/errors/AppError.js';
import PERMISSIONS from '#@/core/constants/permissions/index.js';

/**
 * Phase 2 – RoleRepository & UserRoleRepository Integration Tests
 *
 * Runs against Mongo Memory Replica Set (no live Atlas).
 * Verifies:
 * - CRUD with tenant scoping via BaseRepository
 * - Cross-tenant isolation (Org A cannot read/update Org B data)
 * - Unique index on (organizationId, name) is enforced
 * - archiveRole changes status to ARCHIVED
 * - countUsersWithRole, findRolesByUser, findUsersByRole
 * - TenantIsolationError thrown without organizationId
 */
describe('RoleRepository – Integration Tests', () => {
  const ORG_A = new mongoose.Types.ObjectId();
  const ORG_B = new mongoose.Types.ObjectId();

  beforeAll(async () => { await startDb(); });
  afterEach(async () => { await clearDb(); });
  afterAll(async () => { await stopDb(); });

  // ─── createScoped ───────────────────────────────────────────────────────

  it('createScoped creates a role stamped with organizationId', async () => {
    const role = await RoleRepository.createScoped({
      name: 'HR Manager',
      priority: 20,
      permissions: [PERMISSIONS.USER.READ, PERMISSIONS.LEAVE.REQUEST_APPROVE],
      isSystemTemplate: true,
      status: 'ACTIVE'
    }, ORG_A);

    expect(role._id).toBeDefined();
    expect(role.name).toBe('HR Manager');
    expect(role.organizationId.toString()).toBe(ORG_A.toString());
    expect(role.permissions).toContain(PERMISSIONS.USER.READ);
  });

  it('createScoped throws TenantIsolationError without organizationId', async () => {
    await expect(
      RoleRepository.createScoped({ name: 'Bad Role', priority: 50, permissions: [] }, null)
    ).rejects.toThrow(TenantIsolationError);
  });

  // ─── Cross-Tenant Isolation ─────────────────────────────────────────────

  it('findByNameAndTenant scopes to correct organization — Org A role invisible to Org B', async () => {
    await RoleRepository.createScoped({ name: 'Finance', priority: 30, permissions: [PERMISSIONS.PAYROLL.RUN], status: 'ACTIVE' }, ORG_A);

    const fromOrgA = await RoleRepository.findByNameAndTenant('Finance', ORG_A);
    const fromOrgB = await RoleRepository.findByNameAndTenant('Finance', ORG_B);

    expect(fromOrgA).not.toBeNull();
    expect(fromOrgB).toBeNull(); // Cross-tenant isolation enforced
  });

  it('findByIdAndTenant returns null when role belongs to different org', async () => {
    const role = await RoleRepository.createScoped({ name: 'IT Manager', priority: 40, permissions: [], status: 'ACTIVE' }, ORG_A);

    const fromOrgB = await RoleRepository.findByIdAndTenant(role._id, ORG_B);
    expect(fromOrgB).toBeNull();
  });

  it('findActiveRoles returns only ACTIVE roles for the scoped org', async () => {
    await RoleRepository.createScoped({ name: 'Active Role', priority: 50, permissions: [], status: 'ACTIVE' }, ORG_A);
    await RoleRepository.createScoped({ name: 'Archived Role', priority: 60, permissions: [], status: 'ARCHIVED' }, ORG_A);
    // Org B role — must not appear
    await RoleRepository.createScoped({ name: 'B Role', priority: 50, permissions: [], status: 'ACTIVE' }, ORG_B);

    const roles = await RoleRepository.findActiveRoles(ORG_A);
    expect(roles).toHaveLength(1);
    expect(roles[0].name).toBe('Active Role');
  });

  // ─── Unique Index Enforcement ───────────────────────────────────────────

  it('unique index on (organizationId, name) prevents duplicate role names within same org', async () => {
    await RoleRepository.createScoped({ name: 'Duplicate', priority: 50, permissions: [], status: 'ACTIVE' }, ORG_A);
    await expect(
      RoleRepository.createScoped({ name: 'Duplicate', priority: 50, permissions: [], status: 'ACTIVE' }, ORG_A)
    ).rejects.toThrow(); // MongoServerError: duplicate key
  });

  it('same role name is allowed across different organizations', async () => {
    const roleA = await RoleRepository.createScoped({ name: 'Standard Employee', priority: 80, permissions: [PERMISSIONS.ATTENDANCE.MARK], status: 'ACTIVE' }, ORG_A);
    const roleB = await RoleRepository.createScoped({ name: 'Standard Employee', priority: 80, permissions: [PERMISSIONS.ATTENDANCE.MARK], status: 'ACTIVE' }, ORG_B);

    expect(roleA).toBeDefined();
    expect(roleB).toBeDefined();
    expect(roleA._id.toString()).not.toBe(roleB._id.toString());
  });

  // ─── archiveRole ────────────────────────────────────────────────────────

  it('archiveRole transitions status from ACTIVE to ARCHIVED', async () => {
    const role = await RoleRepository.createScoped({ name: 'To Archive', priority: 70, permissions: [], status: 'ACTIVE' }, ORG_A);

    const archived = await RoleRepository.archiveRole(role._id, ORG_A);
    expect(archived.status).toBe('ARCHIVED');
  });

  it('archiveRole does not archive a role from another org', async () => {
    const role = await RoleRepository.createScoped({ name: 'Protected', priority: 70, permissions: [], status: 'ACTIVE' }, ORG_A);

    const result = await RoleRepository.archiveRole(role._id, ORG_B);
    expect(result).toBeNull(); // No-op — wrong org

    // Original role must still be ACTIVE
    const original = await RoleRepository.findByIdAndTenant(role._id, ORG_A);
    expect(original.status).toBe('ACTIVE');
  });

  // ─── updateByIdAndTenant ────────────────────────────────────────────────

  it('updateByIdAndTenant updates permissions within tenant scope', async () => {
    const role = await RoleRepository.createScoped({ name: 'Updatable', priority: 50, permissions: [PERMISSIONS.USER.READ], status: 'ACTIVE' }, ORG_A);

    const updated = await RoleRepository.updateByIdAndTenant(role._id, { permissions: [PERMISSIONS.USER.READ, PERMISSIONS.LEAVE.REQUEST_SUBMIT] }, ORG_A);
    expect(updated.permissions).toContain(PERMISSIONS.LEAVE.REQUEST_SUBMIT);
  });

  // ─── findByIdsAndTenant ─────────────────────────────────────────────────

  it('findByIdsAndTenant returns only active roles matching given IDs within org', async () => {
    const r1 = await RoleRepository.createScoped({ name: 'R1', priority: 40, permissions: [], status: 'ACTIVE' }, ORG_A);
    const r2 = await RoleRepository.createScoped({ name: 'R2', priority: 50, permissions: [], status: 'ARCHIVED' }, ORG_A);
    const r3 = await RoleRepository.createScoped({ name: 'R3', priority: 60, permissions: [], status: 'ACTIVE' }, ORG_A);

    const found = await RoleRepository.findByIdsAndTenant([r1._id, r2._id, r3._id], ORG_A);
    const names = found.map(r => r.name);
    expect(names).toContain('R1');
    expect(names).toContain('R3');
    expect(names).not.toContain('R2'); // ARCHIVED filtered out
  });
});


describe('UserRoleRepository – Integration Tests', () => {
  const ORG = new mongoose.Types.ObjectId();
  const OTHER_ORG = new mongoose.Types.ObjectId();

  beforeAll(async () => { await startDb(); });
  afterEach(async () => { await clearDb(); });
  afterAll(async () => { await stopDb(); });

  async function makeRole(name, org = ORG) {
    return RoleRepository.createScoped({ name, priority: 50, permissions: [PERMISSIONS.USER.READ], status: 'ACTIVE' }, org);
  }

  async function makeUser(org = ORG) {
    const User = (await import('#@/modules/users/models/User.js')).default;
    const user = new User({
      organizationId: org,
      email: `user_${Date.now()}@test.com`,
      passwordHash: 'hash',
      firstName: 'Test',
      lastName: 'User',
      status: 'ACTIVE'
    });
    return user.save();
  }

  it('createScoped assigns a role to a user within the org', async () => {
    const role = await makeRole('Editor');
    const user = await makeUser();

    const assignment = await UserRoleRepository.createScoped({
      userId: user._id,
      roleId: role._id,
      assignedBy: user._id
    }, ORG);

    expect(assignment._id).toBeDefined();
    expect(assignment.organizationId.toString()).toBe(ORG.toString());
  });

  it('findRolesByUser returns only roles from the correct org', async () => {
    const role = await makeRole('Dev Role');
    const user = await makeUser();
    await UserRoleRepository.createScoped({ userId: user._id, roleId: role._id, assignedBy: user._id }, ORG);

    const results = await UserRoleRepository.findRolesByUser(user._id, ORG);
    expect(results).toHaveLength(1);
    expect(results[0].roleId.name).toBe('Dev Role');
  });

  it('countUsersWithRole returns accurate count within org', async () => {
    const role = await makeRole('Counted Role');
    const u1 = await makeUser();
    const u2 = await makeUser();
    await UserRoleRepository.createScoped({ userId: u1._id, roleId: role._id, assignedBy: u1._id }, ORG);
    await UserRoleRepository.createScoped({ userId: u2._id, roleId: role._id, assignedBy: u1._id }, ORG);

    const count = await UserRoleRepository.countUsersWithRole(role._id, ORG);
    expect(count).toBe(2);
  });

  it('removeRoleFromUser removes only the matching assignment', async () => {
    const role = await makeRole('To Remove');
    const user = await makeUser();
    await UserRoleRepository.createScoped({ userId: user._id, roleId: role._id, assignedBy: user._id }, ORG);

    const removed = await UserRoleRepository.removeRoleFromUser(user._id, role._id, ORG);
    expect(removed).not.toBeNull();

    const remaining = await UserRoleRepository.findRolesByUser(user._id, ORG);
    expect(remaining).toHaveLength(0);
  });

  it('cross-tenant: findRolesByUser for Org A user returns nothing for Org B query', async () => {
    const role = await makeRole('Org A Exclusive', ORG);
    const user = await makeUser(ORG);
    await UserRoleRepository.createScoped({ userId: user._id, roleId: role._id, assignedBy: user._id }, ORG);

    // Query with wrong org
    const results = await UserRoleRepository.findRolesByUser(user._id, OTHER_ORG);
    expect(results).toHaveLength(0);
  });

  it('countUsersWithRole returns 0 when queried from wrong org', async () => {
    const role = await makeRole('Isolated Role', ORG);
    const user = await makeUser(ORG);
    await UserRoleRepository.createScoped({ userId: user._id, roleId: role._id, assignedBy: user._id }, ORG);

    const count = await UserRoleRepository.countUsersWithRole(role._id, OTHER_ORG);
    expect(count).toBe(0);
  });
});
