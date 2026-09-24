import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import request from 'supertest';
import app from '#@/app.js';
import { startDb, clearDb, stopDb } from '../setup/db.js';
import OrganizationService from '#@/modules/organization/services/OrganizationService.js';
import Role from '#@/modules/roles/models/Role.js';
import Invitation from '#@/modules/invitations/models/Invitation.js';

/**
 * Phase 5 – Invitations API Tests
 *
 * Verifies implemented endpoints ONLY:
 * - GET    /api/v1/invites/validate/:token
 * - POST   /api/v1/invites
 * - GET    /api/v1/invites
 * - DELETE /api/v1/invites/:id
 */
describe('API – Invitation Endpoints (/api/v1/invites)', () => {
  let orgData;
  let adminUser;
  let superAdminToken;

  const PROVISION_PAYLOAD = {
    name: 'NexusOps Invites Corp',
    code: 'INVITE',
    domain: 'invite.io',
    adminEmail: 'admin@invite.io',
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

  // ─── POST /api/v1/invites ─────────────────────────────────────────────────
  describe('POST /api/v1/invites', () => {
    it('201: creates an invitation when user has invite.create permission', async () => {
      await setupTenantAndLogin();
      const role = await Role.findOne({ name: 'Standard Employee' });

      const res = await request(app)
        .post('/api/v1/invites')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          email: 'newhire@invite.io',
          roleIds: [role._id.toString()],
          expiresInHours: 48,
          maxUses: 1
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();

      const dbInvite = await Invitation.findById(res.body.data.inviteId);
      expect(dbInvite).toBeDefined();
    });

    it('400: rejects invitation creation with invalid roleIds format or empty array', async () => {
      await setupTenantAndLogin();

      const res = await request(app)
        .post('/api/v1/invites')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          roleIds: []
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('ERR_VALIDATION');
    });

    it('401: rejects request without Authorization header', async () => {
      const res = await request(app)
        .post('/api/v1/invites')
        .send({ roleIds: ['6a44b3f20c92decb0cfd4604'] });

      expect(res.status).toBe(401);
    });
  });

  // ─── GET /api/v1/invites ──────────────────────────────────────────────────
  describe('GET /api/v1/invites', () => {
    it('200: retrieves list of active invitations for the organization', async () => {
      await setupTenantAndLogin();
      const role = await Role.findOne({ name: 'Standard Employee' });

      await request(app)
        .post('/api/v1/invites')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          roleIds: [role._id.toString()],
          expiresInHours: 24,
          maxUses: 5
        });

      const res = await request(app)
        .get('/api/v1/invites')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('Tenant Isolation: Org B cannot see invitations belonging to Org A', async () => {
      await setupTenantAndLogin();
      const role = await Role.findOne({ name: 'Standard Employee' });

      await request(app)
        .post('/api/v1/invites')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ roleIds: [role._id.toString()] });

      // Create Org B
      await request(app)
        .post('/api/v1/organizations')
        .send({
          ...PROVISION_PAYLOAD,
          name: 'Gamma Org',
          code: 'GAMMA',
          adminEmail: 'admin@gamma.io'
        });

      const loginB = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'admin@gamma.io', password: PROVISION_PAYLOAD.adminPassword });

      const tokenB = loginB.body.data.accessToken;

      const resB = await request(app)
        .get('/api/v1/invites')
        .set('Authorization', `Bearer ${tokenB}`);

      expect(resB.status).toBe(200);
      expect(resB.body.data).toHaveLength(0); // Should be empty for Org B
    });
  });

  // ─── GET /api/v1/invites/validate/:token ──────────────────────────────────
  describe('GET /api/v1/invites/validate/:token', () => {
    it('200: validates active token and returns default roles and expiry', async () => {
      await setupTenantAndLogin();
      const role = await Role.findOne({ name: 'Department Manager' });

      const createRes = await request(app)
        .post('/api/v1/invites')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          email: 'manager@invite.io',
          roleIds: [role._id.toString()],
          expiresInHours: 48,
          maxUses: 1
        });

      const token = createRes.body.data.token;

      const res = await request(app).get(`/api/v1/invites/validate/${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe('manager@invite.io');
      expect(res.body.data.expiresAt).toBeDefined();
    });

    it('404/400: rejects non-existent or invalid token', async () => {
      const fakeToken = 'b'.repeat(64);
      const res = await request(app).get(`/api/v1/invites/validate/${fakeToken}`);

      expect(res.status).toBe(404);
    });
  });

  // ─── DELETE /api/v1/invites/:id ───────────────────────────────────────────
  describe('DELETE /api/v1/invites/:id', () => {
    it('200: revokes an invitation when user has invite.revoke permission', async () => {
      await setupTenantAndLogin();
      const role = await Role.findOne({ name: 'Standard Employee' });

      const createRes = await request(app)
        .post('/api/v1/invites')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          roleIds: [role._id.toString()],
          expiresInHours: 24,
          maxUses: 1
        });

      const inviteId = createRes.body.data.inviteId;

      const res = await request(app)
        .delete(`/api/v1/invites/${inviteId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('revoked');

      // Validating revoked token must now fail
      const token = createRes.body.data.token;
      const valRes = await request(app).get(`/api/v1/invites/validate/${token}`);
      expect(valRes.status).toBe(403);
    });

    it('Tenant Isolation: cannot revoke invitation belonging to another organization', async () => {
      await setupTenantAndLogin();
      const role = await Role.findOne({ name: 'Standard Employee' });

      const createRes = await request(app)
        .post('/api/v1/invites')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ roleIds: [role._id.toString()] });

      const inviteId = createRes.body.data.inviteId;

      // Create Org B
      await request(app)
        .post('/api/v1/organizations')
        .send({
          ...PROVISION_PAYLOAD,
          name: 'Beta Org',
          code: 'BETA',
          adminEmail: 'admin@beta.io'
        });

      const loginB = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'admin@beta.io', password: PROVISION_PAYLOAD.adminPassword });

      const tokenB = loginB.body.data.accessToken;

      // Org B attempts to revoke Org A's invitation
      const revokeRes = await request(app)
        .delete(`/api/v1/invites/${inviteId}`)
        .set('Authorization', `Bearer ${tokenB}`);

      expect(revokeRes.status).toBe(404); // BaseRepository scopeFilter hides it
    });
  });
});
