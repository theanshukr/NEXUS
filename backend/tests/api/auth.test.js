import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import request from 'supertest';
import app from '#@/app.js';
import { startDb, clearDb, stopDb } from '../setup/db.js';
import OrganizationService from '#@/modules/organization/services/OrganizationService.js';
import InviteService from '#@/modules/invitations/services/InviteService.js';
import User from '#@/modules/users/models/User.js';

/**
 * Phase 5 – Authentication & Authorization API Tests
 *
 * Verifies implemented endpoints ONLY:
 * - POST /api/v1/auth/login
 * - POST /api/v1/auth/refresh
 * - POST /api/v1/auth/logout
 * - GET  /api/v1/auth/me
 * - POST /api/v1/auth/register-invite
 */
describe('API – Authentication Endpoints (/api/v1/auth)', () => {
  let orgData;
  let adminUser;
  let loginCookie;
  let accessToken;

  const PROVISION_PAYLOAD = {
    name: 'NexusOps Enterprise',
    code: 'NEXUS',
    domain: 'nexusops.io',
    adminEmail: 'admin@nexusops.io',
    adminPassword: 'Secure@Password123',
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

  async function setupTenant() {
    const res = await OrganizationService.createOrganization(PROVISION_PAYLOAD);
    orgData = res.organization;
    adminUser = res.adminUser;
  }

  // ─── POST /api/v1/auth/login ──────────────────────────────────────────────
  describe('POST /api/v1/auth/login', () => {
    it('200: logs in successfully and sets HttpOnly refresh token cookie', async () => {
      await setupTenant();

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: PROVISION_PAYLOAD.adminEmail,
          password: PROVISION_PAYLOAD.adminPassword
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      expect(res.body.data.user.email).toBe(PROVISION_PAYLOAD.adminEmail);

      // Check cookie
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toContain('refreshToken=');
      expect(cookies[0]).toContain('HttpOnly');
    });

    it('400: returns validation error when required fields are missing', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'bad-email' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('ERR_VALIDATION');
    });

    it('401: rejects invalid credentials', async () => {
      await setupTenant();

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: PROVISION_PAYLOAD.adminEmail,
          password: 'WrongPassword123!'
        });

      expect(res.status).toBe(401);
      expect(res.body.error.message).toContain('Invalid email or password');
    });

    it('423: locks account after 5 consecutive failed attempts', async () => {
      await setupTenant();

      for (let i = 0; i < 4; i++) {
        await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: PROVISION_PAYLOAD.adminEmail,
            password: 'WrongPassword123!'
          });
      }

      // 5th attempt triggers lockout
      const lockRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: PROVISION_PAYLOAD.adminEmail,
          password: 'WrongPassword123!'
        });

      expect(lockRes.status).toBe(423);
      expect(lockRes.body.error.code).toBe('ERR_ACCOUNT_LOCKED');
    });

    it('403: rejects login for SUSPENDED user', async () => {
      await setupTenant();
      await User.updateOne({ email: PROVISION_PAYLOAD.adminEmail }, { status: 'SUSPENDED' });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: PROVISION_PAYLOAD.adminEmail,
          password: PROVISION_PAYLOAD.adminPassword
        });

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('suspended');
    });
  });

  // ─── POST /api/v1/auth/refresh ────────────────────────────────────────────
  describe('POST /api/v1/auth/refresh', () => {
    it('200: rotates refresh token and returns new token pair', async () => {
      await setupTenant();
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: PROVISION_PAYLOAD.adminEmail,
          password: PROVISION_PAYLOAD.adminPassword
        });

      const cookies = loginRes.headers['set-cookie'];
      const oldRefreshToken = loginRes.body.data.refreshToken;

      const refreshRes = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', cookies)
        .send({});

      expect(refreshRes.status).toBe(200);
      expect(refreshRes.body.data.accessToken).toBeDefined();
      expect(refreshRes.body.data.refreshToken).toBeDefined();
      expect(refreshRes.body.data.refreshToken).not.toBe(oldRefreshToken);
    });

    it('401: rejects missing refresh token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({});

      expect(res.status).toBe(401);
    });

    it('401: rejects replay attack using old/revoked refresh token', async () => {
      await setupTenant();
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: PROVISION_PAYLOAD.adminEmail,
          password: PROVISION_PAYLOAD.adminPassword
        });

      const cookies = loginRes.headers['set-cookie'];

      // First rotation succeeds
      await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', cookies)
        .send({});

      // Second attempt with same old cookie fails (replay attack)
      const replayRes = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', cookies)
        .send({});

      expect(replayRes.status).toBe(401);
    });
  });

  // ─── GET /api/v1/auth/me ──────────────────────────────────────────────────
  describe('GET /api/v1/auth/me', () => {
    it('200: retrieves authenticated user profile and effective permissions', async () => {
      await setupTenant();
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: PROVISION_PAYLOAD.adminEmail,
          password: PROVISION_PAYLOAD.adminPassword
        });

      const token = loginRes.body.data.accessToken;

      const meRes = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(meRes.status).toBe(200);
      expect(meRes.body.data.user.email).toBe(PROVISION_PAYLOAD.adminEmail);
      expect(meRes.body.data.permissions).toContain('*'); // Super Admin wildcard
    });

    it('401: rejects request without Authorization header', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
    });

    it('401: rejects malformed/invalid JWT token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid.jwt.token');

      expect(res.status).toBe(401);
    });
  });

  // ─── POST /api/v1/auth/logout ─────────────────────────────────────────────
  describe('POST /api/v1/auth/logout', () => {
    it('200: logs out user and invalidates session in cache', async () => {
      await setupTenant();
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: PROVISION_PAYLOAD.adminEmail,
          password: PROVISION_PAYLOAD.adminPassword
        });

      const token = loginRes.body.data.accessToken;
      const cookies = loginRes.headers['set-cookie'];

      const logoutRes = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .set('Cookie', cookies)
        .send({});

      expect(logoutRes.status).toBe(200);
      expect(logoutRes.body.message).toContain('Logged out successfully');

      // Subsequent call to /me with the same access token must fail due to cache session revocation
      const afterLogoutRes = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(afterLogoutRes.status).toBe(401);
      expect(afterLogoutRes.body.error.code).toBe('ERR_SESSION_REVOKED');
    });
  });

  // ─── POST /api/v1/auth/register-invite ────────────────────────────────────
  describe('POST /api/v1/auth/register-invite', () => {
    it('201: registers new user via valid invite token and issues tokens', async () => {
      await setupTenant();
      const adminRole = await (await import('#@/modules/roles/models/Role.js')).default.findOne({ name: 'Standard Employee' });

      const inviteRes = await InviteService.createInvitation({
        email: 'invited@nexusops.io',
        roleIds: [adminRole._id],
        expiresInHours: 24,
        maxUses: 1
      }, { userId: adminUser.id, organizationId: orgData.id });

      const res = await request(app)
        .post('/api/v1/auth/register-invite')
        .send({
          token: inviteRes.token,
          email: 'invited@nexusops.io',
          password: 'NewUser@Pass123',
          firstName: 'John',
          lastName: 'Doe'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.user.email).toBe('invited@nexusops.io');
    });

    it('400: fails validation when invitation token format is invalid (< 64 chars)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register-invite')
        .send({
          token: 'shorttoken',
          email: 'test@nexusops.io',
          password: 'Password@123',
          firstName: 'John',
          lastName: 'Doe'
        });

      expect(res.status).toBe(400);
    });

    it('404: rejects unknown invite token of valid length', async () => {
      const fakeToken = 'a'.repeat(64);
      const res = await request(app)
        .post('/api/v1/auth/register-invite')
        .send({
          token: fakeToken,
          email: 'test@nexusops.io',
          password: 'Password@123',
          firstName: 'John',
          lastName: 'Doe'
        });

      expect(res.status).toBe(404);
    });

    it('409: rejects registration if email is already registered in organization', async () => {
      await setupTenant();
      const role = await (await import('#@/modules/roles/models/Role.js')).default.findOne({ name: 'Standard Employee' });

      const inviteRes = await InviteService.createInvitation({
        email: null,
        roleIds: [role._id],
        expiresInHours: 24,
        maxUses: 5
      }, { userId: adminUser.id, organizationId: orgData.id });

      // First registration succeeds
      await request(app)
        .post('/api/v1/auth/register-invite')
        .send({
          token: inviteRes.token,
          email: 'duplicate@nexusops.io',
          password: 'Password@123',
          firstName: 'First',
          lastName: 'User'
        });

      // Second registration with same email fails with 409
      const dupRes = await request(app)
        .post('/api/v1/auth/register-invite')
        .send({
          token: inviteRes.token,
          email: 'duplicate@nexusops.io',
          password: 'Password@123',
          firstName: 'Second',
          lastName: 'User'
        });

      expect(dupRes.status).toBe(409);
    });
  });
});
