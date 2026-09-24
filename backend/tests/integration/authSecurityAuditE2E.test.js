import request from 'supertest';
import app from '#@/app.js';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { vi, describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { startDb, clearDb, stopDb } from '../setup/db.js';
import OrganizationService from '#@/modules/organization/services/OrganizationService.js';
import InviteService from '#@/modules/invitations/services/InviteService.js';
import User from '#@/modules/users/models/User.js';
import Role from '#@/modules/roles/models/Role.js';
import UserRole from '#@/modules/roles/models/UserRole.js';
import Invitation from '#@/modules/invitations/models/Invitation.js';
import RefreshToken from '#@/modules/auth/models/RefreshToken.js';
import AuditLog from '#@/modules/audit/models/AuditLog.js';
import UserRoleRepository from '#@/modules/roles/repositories/UserRoleRepository.js';
import PERMISSIONS from '#@/core/constants/permissions/index.js';
import { hashToken } from '#@/core/utils/crypto.js';

describe('API – Final Authentication & Security Audit E2E Test Suite (M-01 Freeze)', () => {
  let orgData;
  let adminUser;
  let superAdminToken;

  const PROVISION_PAYLOAD = {
    name: 'NexusOps Security Corp',
    code: 'SEC',
    domain: 'sec.io',
    adminEmail: 'admin@sec.io',
    adminPassword: 'Super@Password123',
    adminFirstName: 'Root',
    adminLastName: 'Admin'
  };

  beforeAll(async () => {
    await startDb();
  });

  afterEach(async () => {
    await clearDb();
    vi.clearAllMocks();
  });

  afterAll(async () => {
    await stopDb();
  });

  async function setupTenantAndLogin(customPayload = PROVISION_PAYLOAD) {
    const res = await OrganizationService.createOrganization(customPayload);
    orgData = res.organization;
    adminUser = res.adminUser;

    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: customPayload.adminEmail,
        password: customPayload.adminPassword
      });

    superAdminToken = loginRes.body.data.accessToken;
    return { orgData, adminUser, superAdminToken };
  }

  // ─── PHASE 2: CUSTOM ROLE END-TO-END FLOW ───────────────────────────────
  describe('Phase 2: Custom Role End-to-End Flow', () => {
    it('proves dynamic architecture by creating custom role, delegating, inviting, registering, and verifying all layers', async () => {
      await setupTenantAndLogin();
      const superAdminRole = await Role.findOne({ organizationId: orgData.id, name: 'Super Admin' });

      // 1. Create Custom Role via API
      const createRoleRes = await request(app)
        .post('/api/v1/roles')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: 'Custom AI Lead',
          description: 'Custom dynamic role for AI workforce management',
          priority: 45,
          permissions: [PERMISSIONS.AI.USE, PERMISSIONS.AI.EXECUTE_TOOL, PERMISSIONS.USER.READ_SELF]
        });
      expect(createRoleRes.status).toBe(201);
      const customRole = createRoleRes.body.data;

      // 2. Create Role Delegation Policy via API
      const delegationRes = await request(app)
        .post('/api/v1/role-delegation-policies')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          sourceRoleId: superAdminRole._id.toString(),
          targetRoleId: customRole._id.toString()
        });
      expect(delegationRes.status).toBe(201);

      // 3. Invite User using Custom Role
      const inviteRes = await request(app)
        .post('/api/v1/invites')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          email: 'ailead@sec.io',
          roleIds: [customRole._id.toString()]
        });
      expect(inviteRes.status).toBe(201);
      const token = inviteRes.body.data.token;
      const inviteId = inviteRes.body.data.inviteId;

      // 4. Validate Invitation
      const valRes = await request(app).get(`/api/v1/invites/validate/${token}`);
      expect(valRes.status).toBe(200);
      const returnedRole = valRes.body.data.defaultRoles[0];
      expect((returnedRole._id || returnedRole).toString()).toBe(customRole._id.toString());

      // 5. Register via Invite
      const regRes = await request(app)
        .post('/api/v1/auth/register-invite')
        .send({
          token,
          email: 'ailead@sec.io',
          password: 'Secure@Password2026',
          firstName: 'AI',
          lastName: 'Leader'
        });
      expect(regRes.status).toBe(201);
      const newUserId = regRes.body.data.user.id;

      // 6. Login as new user
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'ailead@sec.io',
          password: 'Secure@Password2026'
        });
      expect(loginRes.status).toBe(200);
      const userToken = loginRes.body.data.accessToken;

      // 7. Verify Permissions via observable endpoint
      const meRes = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${userToken}`);
      expect(meRes.status).toBe(200);
      expect(meRes.body.data.permissions).toContain(PERMISSIONS.AI.USE);
      expect(meRes.body.data.permissions).toContain(PERMISSIONS.AI.EXECUTE_TOOL);
      expect(meRes.body.data.permissions).toContain(PERMISSIONS.USER.READ_SELF);

      // 8. Verify UserRole in MongoDB
      const dbUserRole = await UserRole.findOne({ userId: newUserId, roleId: customRole._id });
      expect(dbUserRole).not.toBeNull();
      expect(dbUserRole.organizationId.toString()).toBe(orgData.id.toString());

      // 9. Verify Audit in MongoDB
      const dbAudit = await AuditLog.findOne({ action: 'INVITATION_REDEEMED', entityId: inviteId });
      expect(dbAudit).not.toBeNull();
      expect(dbAudit.actorId.toString()).toBe(newUserId.toString());

      // 10. Verify effective permissions persistence via observable profile API
      const meResAfter = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${userToken}`);
      expect(meResAfter.status).toBe(200);
      expect(meResAfter.body.data.permissions).toContain(PERMISSIONS.AI.USE);

      // 11. Verify Tenant Isolation
      const orgBPayload = {
        name: 'Isolated Tenant Corp',
        code: 'ISO',
        domain: 'iso.io',
        adminEmail: 'admin@iso.io',
        adminPassword: 'Super@Password123',
        adminFirstName: 'Iso',
        adminLastName: 'Admin'
      };
      const resB = await OrganizationService.createOrganization(orgBPayload);
      const loginB = await request(app).post('/api/v1/auth/login').send({ email: 'admin@iso.io', password: 'Super@Password123' });
      const tokenB = loginB.body.data.accessToken;

      const crossTry = await request(app)
        .get(`/api/v1/roles/${customRole._id}`)
        .set('Authorization', `Bearer ${tokenB}`);
      expect(crossTry.status).toBe(404);
    }, 15000);
  });

  // ─── PHASE 3: MULTI-ROLE INVITATION ─────────────────────────────────────
  describe('Phase 3: Multi-Role Invitation Verification', () => {
    it('assigns multiple roles in a single invite and verifies UserRole records and union of permissions', async () => {
      await setupTenantAndLogin();
      const hrRole = await Role.findOne({ organizationId: orgData.id, name: 'HR Manager' });
      const finRole = await Role.findOne({ organizationId: orgData.id, name: 'Finance Executive' });
      const empRole = await Role.findOne({ organizationId: orgData.id, name: 'Standard Employee' });

      const inviteRes = await request(app)
        .post('/api/v1/invites')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          email: 'multirole@sec.io',
          roleIds: [hrRole._id.toString(), finRole._id.toString(), empRole._id.toString()]
        });
      expect(inviteRes.status).toBe(201);
      const token = inviteRes.body.data.token;

      const regRes = await request(app)
        .post('/api/v1/auth/register-invite')
        .send({
          token,
          email: 'multirole@sec.io',
          password: 'Secure@Password2026',
          firstName: 'Multi',
          lastName: 'RoleUser'
        });
      expect(regRes.status).toBe(201);
      const newUserId = regRes.body.data.user.id;

      // Verify User and 3 UserRole records in MongoDB
      const dbUser = await User.findById(newUserId);
      expect(dbUser).not.toBeNull();

      const userRoles = await UserRole.find({ userId: newUserId });
      expect(userRoles).toHaveLength(3);
      userRoles.forEach(ur => {
        expect(ur.organizationId.toString()).toBe(orgData.id.toString());
      });
      const boundRoleIds = userRoles.map(ur => ur.roleId.toString());
      expect(boundRoleIds).toContain(hrRole._id.toString());
      expect(boundRoleIds).toContain(finRole._id.toString());
      expect(boundRoleIds).toContain(empRole._id.toString());

      // Login and verify effective permissions are union of all 3 roles
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'multirole@sec.io', password: 'Secure@Password2026' });
      expect(loginRes.status).toBe(200);
      const userToken = loginRes.body.data.accessToken;
      const meRes = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${userToken}`);
      const perms = meRes.body.data.permissions;
      expect(perms).toContain(PERMISSIONS.PAYROLL.RUN); // From Finance Executive
      expect(perms).toContain(PERMISSIONS.INVITE.CREATE); // From HR Manager
      expect(perms).toContain(PERMISSIONS.ATTENDANCE.MARK); // From Standard Employee
    }, 15000);
  });

  // ─── PHASE 4: PERMISSION UNION ──────────────────────────────────────────
  describe('Phase 4: Permission Union Verification', () => {
    it('verifies RBAC permission merging across multiple assigned custom roles and denial of ungranted permissions', async () => {
      await setupTenantAndLogin();

      // Create 3 custom roles with distinct permissions
      const roleA = (await request(app).post('/api/v1/roles').set('Authorization', `Bearer ${superAdminToken}`).send({ name: 'Role A', priority: 60, permissions: [PERMISSIONS.USER.READ] })).body.data;
      const roleB = (await request(app).post('/api/v1/roles').set('Authorization', `Bearer ${superAdminToken}`).send({ name: 'Role B', priority: 61, permissions: [PERMISSIONS.LEAVE.REQUEST_SUBMIT] })).body.data;
      const roleC = (await request(app).post('/api/v1/roles').set('Authorization', `Bearer ${superAdminToken}`).send({ name: 'Role C', priority: 62, permissions: [PERMISSIONS.ATTENDANCE.MARK] })).body.data;

      const inviteRes = await request(app)
        .post('/api/v1/invites')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          email: 'unionuser@sec.io',
          roleIds: [roleA._id, roleB._id, roleC._id]
        });
      const token = inviteRes.body.data.token;

      await request(app)
        .post('/api/v1/auth/register-invite')
        .send({
          token,
          email: 'unionuser@sec.io',
          password: 'Secure@Password2026',
          firstName: 'Union',
          lastName: 'Tester'
        });

      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'unionuser@sec.io', password: 'Secure@Password2026' });
      const userToken = loginRes.body.data.accessToken;
      const meRes = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${userToken}`);
      const perms = meRes.body.data.permissions;

      expect(perms).toContain(PERMISSIONS.USER.READ);
      expect(perms).toContain(PERMISSIONS.LEAVE.REQUEST_SUBMIT);
      expect(perms).toContain(PERMISSIONS.ATTENDANCE.MARK);
      expect(perms).not.toContain(PERMISSIONS.PAYROLL.RUN);
      expect(perms).not.toContain(PERMISSIONS.INVITE.CREATE);

      // Verify ungranted action returns 403 Forbidden
      const forbidRes = await request(app)
        .post('/api/v1/invites')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ email: 'hack@sec.io', roleIds: [roleA._id] });
      expect(forbidRes.status).toBe(403);
    }, 15000);
  });

  // ─── PHASE 5: INVITATION REUSE ──────────────────────────────────────────
  describe('Phase 5: Invitation Reuse Prevention', () => {
    it('rejects second registration attempt using an already redeemed single-use token with 403 and leaves DB unchanged', async () => {
      await setupTenantAndLogin();
      const empRole = await Role.findOne({ organizationId: orgData.id, name: 'Standard Employee' });

      const inviteRes = await request(app)
        .post('/api/v1/invites')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          email: 'singleuse@sec.io',
          roleIds: [empRole._id.toString()],
          maxUses: 1
        });
      const token = inviteRes.body.data.token;

      // First registration succeeds
      const reg1 = await request(app)
        .post('/api/v1/auth/register-invite')
        .send({
          token,
          email: 'singleuse@sec.io',
          password: 'Secure@Password2026',
          firstName: 'First',
          lastName: 'Redeemer'
        });
      expect(reg1.status).toBe(201);

      const userCountBefore = await User.countDocuments();
      const userRoleCountBefore = await UserRole.countDocuments();

      // Second registration attempt with same token fails with 403 Forbidden
      const reg2 = await request(app)
        .post('/api/v1/auth/register-invite')
        .send({
          token,
          email: 'second@sec.io',
          password: 'Secure@Password2026',
          firstName: 'Second',
          lastName: 'Redeemer'
        });
      expect(reg2.status).toBe(403);

      // Verify DB unchanged
      expect(await User.countDocuments()).toBe(userCountBefore);
      expect(await UserRole.countDocuments()).toBe(userRoleCountBefore);
    });
  });

  // ─── PHASE 6: EXPIRED INVITATION ────────────────────────────────────────
  describe('Phase 6: Expired Invitation Rejection', () => {
    it('rejects registration with expired invitation token with 403 and creates no database records', async () => {
      await setupTenantAndLogin();
      const empRole = await Role.findOne({ organizationId: orgData.id, name: 'Standard Employee' });

      const inviteRes = await request(app)
        .post('/api/v1/invites')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          email: 'expired@sec.io',
          roleIds: [empRole._id.toString()]
        });
      const token = inviteRes.body.data.token;
      const inviteId = inviteRes.body.data.inviteId;

      // Expire invitation directly in database
      await Invitation.findByIdAndUpdate(inviteId, { expiresAt: new Date(Date.now() - 3600000) });

      const userCountBefore = await User.countDocuments();

      const regRes = await request(app)
        .post('/api/v1/auth/register-invite')
        .send({
          token,
          email: 'expired@sec.io',
          password: 'Secure@Password2026',
          firstName: 'Late',
          lastName: 'User'
        });
      expect(regRes.status).toBe(403);
      expect(regRes.body.error.message).toContain('expired');

      expect(await User.countDocuments()).toBe(userCountBefore);
      const createdUser = await User.findOne({ email: 'expired@sec.io' });
      expect(createdUser).toBeNull();
    });
  });

  // ─── PHASE 7: REVOKED INVITATION ────────────────────────────────────────
  describe('Phase 7: Revoked Invitation Rejection', () => {
    it('rejects registration with revoked invitation token with 403 and creates no database records', async () => {
      await setupTenantAndLogin();
      const empRole = await Role.findOne({ organizationId: orgData.id, name: 'Standard Employee' });

      const inviteRes = await request(app)
        .post('/api/v1/invites')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          email: 'revoked@sec.io',
          roleIds: [empRole._id.toString()]
        });
      const token = inviteRes.body.data.token;
      const inviteId = inviteRes.body.data.inviteId;

      // Revoke invitation via API
      const revokeRes = await request(app)
        .delete(`/api/v1/invites/${inviteId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(revokeRes.status).toBe(200);

      const userCountBefore = await User.countDocuments();

      const regRes = await request(app)
        .post('/api/v1/auth/register-invite')
        .send({
          token,
          email: 'revoked@sec.io',
          password: 'Secure@Password2026',
          firstName: 'Revoked',
          lastName: 'User'
        });
      expect(regRes.status).toBe(403);
      expect(regRes.body.error.message).toContain('no longer active');

      expect(await User.countDocuments()).toBe(userCountBefore);
    });
  });

  // ─── PHASE 8: PASSWORD HASH VERIFICATION ────────────────────────────────
  describe('Phase 8: Cryptographic Password Hash Verification', () => {
    it('verifies stored password in MongoDB is hashed with bcrypt and not plaintext', async () => {
      await setupTenantAndLogin();
      const empRole = await Role.findOne({ organizationId: orgData.id, name: 'Standard Employee' });

      const inviteRes = await request(app)
        .post('/api/v1/invites')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          email: 'hashuser@sec.io',
          roleIds: [empRole._id.toString()]
        });
      const token = inviteRes.body.data.token;

      const plaintextPassword = 'Super@SecretPassword2026!';
      await request(app)
        .post('/api/v1/auth/register-invite')
        .send({
          token,
          email: 'hashuser@sec.io',
          password: plaintextPassword,
          firstName: 'Hash',
          lastName: 'Tester'
        });

      // Query MongoDB directly
      const dbUser = await User.findOne({ email: 'hashuser@sec.io' });
      expect(dbUser).not.toBeNull();
      expect(dbUser.passwordHash).toBeDefined();
      expect(dbUser.passwordHash).not.toBe(plaintextPassword);
      expect(dbUser.passwordHash).toMatch(/^\$2[abxy]\$\d{2}\$/);

      // Verify bcrypt comparison succeeds
      const isMatch = await bcrypt.compare(plaintextPassword, dbUser.passwordHash);
      expect(isMatch).toBe(true);

      const isWrongMatch = await bcrypt.compare('WrongPassword123!', dbUser.passwordHash);
      expect(isWrongMatch).toBe(false);
    });
  });

  // ─── PHASE 9: REFRESH TOKEN SECURITY ────────────────────────────────────
  describe('Phase 9: Refresh Token Storage Security Verification', () => {
    it('verifies refresh token documents in MongoDB store SHA-256 hashes instead of plaintext strings', async () => {
      await setupTenantAndLogin();

      // Login returns a plaintext refresh token in response body / cookie
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: PROVISION_PAYLOAD.adminEmail,
          password: PROVISION_PAYLOAD.adminPassword
        });
      expect(loginRes.status).toBe(200);
      const plaintextRefreshToken = loginRes.body.data.refreshToken;
      expect(plaintextRefreshToken).toBeDefined();

      // Query RefreshToken collection directly from MongoDB
      const dbTokens = await RefreshToken.find({ userId: adminUser.id });
      expect(dbTokens.length).toBeGreaterThan(0);
      const latestTokenDoc = dbTokens[dbTokens.length - 1];

      // Assert stored value is hashed and not plaintext
      expect(latestTokenDoc.tokenHash).toBeDefined();
      expect(latestTokenDoc.tokenHash).not.toBe(plaintextRefreshToken);
      expect(latestTokenDoc.tokenHash).toMatch(/^[0-9a-f]{64}$/); // Hexadecimal SHA-256 hash length

      // Verify hash algorithm correctness
      const expectedHash = hashToken(plaintextRefreshToken);
      expect(latestTokenDoc.tokenHash).toBe(expectedHash);
    });
  });

  // ─── PHASE 10: TRANSACTION ROLLBACK ─────────────────────────────────────
  describe('Phase 10: ACID Transaction Rollback Verification', () => {
    it('rolls back all database mutations when a failure occurs during multi-document registration transaction', async () => {
      await setupTenantAndLogin();
      const empRole = await Role.findOne({ organizationId: orgData.id, name: 'Standard Employee' });

      const inviteRes = await request(app)
        .post('/api/v1/invites')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          email: 'rollback@sec.io',
          roleIds: [empRole._id.toString()]
        });
      const token = inviteRes.body.data.token;
      const inviteId = inviteRes.body.data.inviteId;

      const userCountBefore = await User.countDocuments();
      const userRoleCountBefore = await UserRole.countDocuments();
      const refreshTokenCountBefore = await RefreshToken.countDocuments();

      // Inject controlled failure during UserRole creation inside transaction
      const spy = vi.spyOn(UserRoleRepository, 'createScoped').mockRejectedValueOnce(new Error('Simulated ACID Transaction Failure'));

      const regRes = await request(app)
        .post('/api/v1/auth/register-invite')
        .send({
          token,
          email: 'rollback@sec.io',
          password: 'Secure@Password2026',
          firstName: 'Rollback',
          lastName: 'Tester'
        });

      // Assert request failed
      expect(regRes.status).toBeGreaterThanOrEqual(400);

      // Verify ACID rollback left database cleanly consistent and unchanged
      expect(await User.countDocuments()).toBe(userCountBefore);
      expect(await UserRole.countDocuments()).toBe(userRoleCountBefore);
      expect(await RefreshToken.countDocuments()).toBe(refreshTokenCountBefore);
      expect(await User.findOne({ email: 'rollback@sec.io' })).toBeNull();

      // Verify invitation status remains ACTIVE and usedCount remains 0
      const dbInvite = await Invitation.findById(inviteId);
      expect(dbInvite.status).toBe('ACTIVE');
      expect(dbInvite.usedCount).toBe(0);

      spy.mockRestore();
    });
  });
});
