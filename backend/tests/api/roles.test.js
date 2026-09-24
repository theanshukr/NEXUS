import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import request from 'supertest';
import app from '#@/app.js';
import { startDb, clearDb, stopDb } from '../setup/db.js';
import { hashPassword } from '#@/core/utils/crypto.js';
import OrganizationService from '#@/modules/organization/services/OrganizationService.js';
import Role from '#@/modules/roles/models/Role.js';
import User from '#@/modules/users/models/User.js';
import UserRole from '#@/modules/roles/models/UserRole.js';
import PERMISSIONS from '#@/core/constants/permissions/index.js';

/**
 * Phase 5 – Roles & RBAC API Tests
 *
 * Verifies implemented endpoints ONLY:
 * - GET    /api/v1/roles/system-permissions
 * - GET    /api/v1/roles
 * - POST   /api/v1/roles
 * - PUT    /api/v1/roles/:id
 * - POST   /api/v1/roles/:id/duplicate
 * - DELETE /api/v1/roles/:id
 * - POST   /api/v1/roles/assign
 * - POST   /api/v1/roles/remove
 */
describe('API – Role & RBAC Endpoints (/api/v1/roles)', () => {
  let orgData;
  let adminUser;
  let superAdminToken;

  const PROVISION_PAYLOAD = {
    name: 'NexusOps RBAC Corp',
    code: 'RBAC',
    domain: 'rbac.io',
    adminEmail: 'admin@rbac.io',
    adminPassword: 'Super@Password123',
    adminFirstName: 'Root',
    adminLastName: 'Admin'
  };

  beforeAll(async () => {
    await startDb();
  });

  afterEach(async () => {
    await clearDb();
  });

  afterAll(async () => {
    await stopDb();
  });

  async function setupTenantAndLogin() {
    const res = await OrganizationService.createOrganization(PROVISION_PAYLOAD);
    orgData = res.organization;
    adminUser = res.adminUser;

    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: PROVISION_PAYLOAD.adminEmail,
        password: PROVISION_PAYLOAD.adminPassword
      });

    superAdminToken = loginRes.body.data.accessToken;
  }

  async function createRestrictedUser(permissions = [PERMISSIONS.ROLE.READ]) {
    // Create custom role with specific permissions
    const customRole = await Role.create({
      organizationId: orgData.id,
      name: `Restricted_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      priority: 50,
      permissions,
      status: 'ACTIVE'
    });

    // Create user
    const user = await User.create({
      organizationId: orgData.id,
      email: `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}@rbac.io`,
      passwordHash: await hashPassword(PROVISION_PAYLOAD.adminPassword),
      firstName: 'Restricted',
      lastName: 'User',
      status: 'ACTIVE'
    });

    // Bind role
    await UserRole.create({
      organizationId: orgData.id,
      userId: user._id,
      roleId: customRole._id,
      assignedBy: adminUser.id
    });

    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: user.email,
        password: PROVISION_PAYLOAD.adminPassword
      });

    return { user, role: customRole, token: loginRes.body.data.accessToken };
  }

  // ─── GET /api/v1/roles/system-permissions ─────────────────────────────────
  describe('GET /api/v1/roles/system-permissions', () => {
    it('200: retrieves baseline atomic permission catalog', async () => {
      await setupTenantAndLogin();

      const res = await request(app)
        .get('/api/v1/roles/system-permissions')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.some(p => p.permission === PERMISSIONS.ROLE.CREATE)).toBe(true);
      expect(res.body.data.some(p => p.permission === PERMISSIONS.USER.CREATE)).toBe(true);
    });

    it('403: rejects user without role.read permission', async () => {
      await setupTenantAndLogin();
      const { token } = await createRestrictedUser([PERMISSIONS.USER.READ]); // Lacks role.read

      const res = await request(app)
        .get('/api/v1/roles/system-permissions')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('ERR_FORBIDDEN');
    });
  });

  // ─── GET /api/v1/roles ────────────────────────────────────────────────────
  describe('GET /api/v1/roles', () => {
    it('200: lists all active roles for the organization', async () => {
      await setupTenantAndLogin();

      const res = await request(app)
        .get('/api/v1/roles')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(5); // 5 system templates
    });
  });

  // ─── POST /api/v1/roles ───────────────────────────────────────────────────
  describe('POST /api/v1/roles', () => {
    it('201: creates custom role when user has role.create permission', async () => {
      await setupTenantAndLogin();
      const { token } = await createRestrictedUser([PERMISSIONS.ROLE.CREATE, PERMISSIONS.ROLE.READ, PERMISSIONS.USER.READ, PERMISSIONS.LEAVE.REQUEST_APPROVE]);

      const res = await request(app)
        .post('/api/v1/roles')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Custom Team Lead',
          description: 'Leads engineering team',
          priority: 60,
          permissions: [PERMISSIONS.USER.READ, PERMISSIONS.LEAVE.REQUEST_APPROVE]
        });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('Custom Team Lead');
      expect(res.body.data.permissions).toContain(PERMISSIONS.LEAVE.REQUEST_APPROVE);
    });

    it('400: fails validation when priority is out of range or permissions empty', async () => {
      await setupTenantAndLogin();

      const res = await request(app)
        .post('/api/v1/roles')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: 'Invalid Role',
          priority: 500, // max 100
          permissions: []
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('ERR_VALIDATION');
    });

    it('403: rejects user without role.create permission', async () => {
      await setupTenantAndLogin();
      const { token } = await createRestrictedUser([PERMISSIONS.ROLE.READ]);

      const res = await request(app)
        .post('/api/v1/roles')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Unauthorized Role',
          priority: 50,
          permissions: [PERMISSIONS.USER.READ]
        });

      expect(res.status).toBe(403);
    });
  });

  // ─── PUT /api/v1/roles/:id ────────────────────────────────────────────────
  describe('PUT /api/v1/roles/:id', () => {
    it('200: updates custom role fields and permissions', async () => {
      await setupTenantAndLogin();
      const role = await Role.findOne({ name: 'Standard Employee' });

      const res = await request(app)
        .put(`/api/v1/roles/${role._id}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          description: 'Updated Standard Employee Description',
          permissions: [PERMISSIONS.ATTENDANCE.MARK, PERMISSIONS.LEAVE.REQUEST_SUBMIT]
        });

      expect(res.status).toBe(200);
      expect(res.body.data.description).toBe('Updated Standard Employee Description');
      expect(res.body.data.permissions).toContain(PERMISSIONS.LEAVE.REQUEST_SUBMIT);
    });

    it('404: returns not found for non-existent role ID', async () => {
      await setupTenantAndLogin();
      const fakeId = '6a44b3f20c92decb0cfd4604';

      const res = await request(app)
        .put(`/api/v1/roles/${fakeId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ name: 'Ghost Role' });

      expect(res.status).toBe(404);
    });
  });

  // ─── POST /api/v1/roles/:id/duplicate ─────────────────────────────────────
  describe('POST /api/v1/roles/:id/duplicate', () => {
    it('201: duplicates an existing role with a new name', async () => {
      await setupTenantAndLogin();
      const role = await Role.findOne({ name: 'HR Manager' });

      const res = await request(app)
        .post(`/api/v1/roles/${role._id}/duplicate`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ newName: 'Senior HR Manager' });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('Senior HR Manager');
      expect(res.body.data.permissions).toEqual(role.permissions);
    });
  });

  // ─── DELETE /api/v1/roles/:id ─────────────────────────────────────────────
  describe('DELETE /api/v1/roles/:id', () => {
    it('200: archives custom role', async () => {
      await setupTenantAndLogin();
      const role = await Role.create({
        organizationId: orgData.id,
        name: 'Temporary Role',
        priority: 60,
        permissions: [PERMISSIONS.USER.READ],
        status: 'ACTIVE'
      });

      const res = await request(app)
        .delete(`/api/v1/roles/${role._id}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('archived');

      const updated = await Role.findById(role._id);
      expect(updated.status).toBe('ARCHIVED');
    });
  });

  // ─── POST /api/v1/roles/assign & /remove ──────────────────────────────────
  describe('POST /api/v1/roles/assign & /remove', () => {
    it('200: assigns a role to user and then removes it', async () => {
      await setupTenantAndLogin();
      const targetUser = await User.create({
        organizationId: orgData.id,
        email: 'target@rbac.io',
        passwordHash: await hashPassword(PROVISION_PAYLOAD.adminPassword),
        firstName: 'Target',
        lastName: 'User',
        status: 'ACTIVE'
      });
      const role = await Role.findOne({ name: 'Department Manager' });

      // Assign
      const assignRes = await request(app)
        .post('/api/v1/roles/assign')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          targetUserId: targetUser._id.toString(),
          roleId: role._id.toString()
        });

      expect(assignRes.status).toBe(200);

      const assignedCount = await UserRole.countDocuments({ userId: targetUser._id, roleId: role._id });
      expect(assignedCount).toBe(1);

      // Remove
      const removeRes = await request(app)
        .post('/api/v1/roles/remove')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          targetUserId: targetUser._id.toString(),
          roleId: role._id.toString()
        });

      expect(removeRes.status).toBe(200);
      const afterRemoveCount = await UserRole.countDocuments({ userId: targetUser._id, roleId: role._id });
      expect(afterRemoveCount).toBe(0);
    });

    it('Tenant Isolation: cannot assign or update role belonging to another organization', async () => {
      await setupTenantAndLogin();

      // Create Org B and a role inside Org B
      const orgBRes = await request(app)
        .post('/api/v1/organizations')
        .send({
          ...PROVISION_PAYLOAD,
          name: 'Beta Org',
          code: 'BETA',
          adminEmail: 'admin@beta.io'
        });

      const orgB = orgBRes.body.data.organization;
      const roleInB = await Role.findOne({ organizationId: orgB.id, name: 'HR Manager' });

      // SuperAdmin of Org A attempts to update role inside Org B
      const updateRes = await request(app)
        .put(`/api/v1/roles/${roleInB._id}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ description: 'Hacked by Org A' });

      expect(updateRes.status).toBe(404); // BaseRepository scopeFilter prevents finding it
    });
  });
});
