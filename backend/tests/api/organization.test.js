import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import request from 'supertest';
import app from '#@/app.js';
import { startDb, clearDb, stopDb } from '../setup/db.js';
import Organization from '#@/modules/organization/models/Organization.js';
import User from '#@/modules/users/models/User.js';
import Role from '#@/modules/roles/models/Role.js';
import AuditLog from '#@/modules/audit/models/AuditLog.js';

/**
 * Phase 5 – Organization API Tests
 *
 * Verifies implemented endpoints ONLY:
 * - POST /api/v1/organizations
 * - GET  /api/v1/organizations/me
 */
describe('API – Organization Endpoints (/api/v1/organizations)', () => {
  const VALID_PAYLOAD = {
    name: 'Acme Global Corp',
    code: 'ACME',
    domain: 'acme.org',
    adminEmail: 'root@acme.org',
    adminPassword: 'Super@Password123',
    adminFirstName: 'Alice',
    adminLastName: 'Founder'
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

  // ─── POST /api/v1/organizations ───────────────────────────────────────────
  describe('POST /api/v1/organizations', () => {
    it('201: provision tenant atomically (5 collections + audit log)', async () => {
      const res = await request(app)
        .post('/api/v1/organizations')
        .send(VALID_PAYLOAD);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.organization.code).toBe('ACME');
      expect(res.body.data.adminUser.email).toBe('root@acme.org');

      // Verify DB atomic creation
      const orgCount = await Organization.countDocuments({ code: 'ACME' });
      const userCount = await User.countDocuments({ email: 'root@acme.org' });
      const roleCount = await Role.countDocuments({ organizationId: res.body.data.organization.id });
      const auditCount = await AuditLog.countDocuments({ organizationId: res.body.data.organization.id, action: 'TENANT_PROVISIONED' });

      expect(orgCount).toBe(1);
      expect(userCount).toBe(1);
      expect(roleCount).toBe(7); // 7 system template roles (Super Admin, HR Manager, Finance Executive, Department Manager, Standard Employee, Administrator, Intern)
      expect(auditCount).toBe(1);
    });

    it('400: rejects invalid payload (missing required fields / invalid email)', async () => {
      const res = await request(app)
        .post('/api/v1/organizations')
        .send({
          name: 'Incomplete Org',
          code: 'INC'
          // missing adminEmail and password
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('ERR_VALIDATION');
    });

    it('409: rejects duplicate organization code', async () => {
      // First creation succeeds
      await request(app)
        .post('/api/v1/organizations')
        .send(VALID_PAYLOAD);

      // Second creation with same code fails with 409
      const dupRes = await request(app)
        .post('/api/v1/organizations')
        .send({
          ...VALID_PAYLOAD,
          name: 'Another Corp',
          adminEmail: 'other@acme.org'
        });

      expect(dupRes.status).toBe(409);
    });
  });

  // ─── GET /api/v1/organizations/me ─────────────────────────────────────────
  describe('GET /api/v1/organizations/me', () => {
    it('200: retrieves current tenant metadata for authenticated user', async () => {
      await request(app)
        .post('/api/v1/organizations')
        .send(VALID_PAYLOAD);

      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: VALID_PAYLOAD.adminEmail,
          password: VALID_PAYLOAD.adminPassword
        });

      const token = loginRes.body.data.accessToken;

      const res = await request(app)
        .get('/api/v1/organizations/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.code).toBe('ACME');
      expect(res.body.data.name).toBe('Acme Global Corp');
    });

    it('401: rejects request without Authorization header', async () => {
      const res = await request(app).get('/api/v1/organizations/me');
      expect(res.status).toBe(401);
    });

    it('Tenant Isolation: user from Org A cannot see Org B metadata via /me', async () => {
      // Create Org A
      await request(app)
        .post('/api/v1/organizations')
        .send(VALID_PAYLOAD);

      const loginA = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: VALID_PAYLOAD.adminEmail,
          password: VALID_PAYLOAD.adminPassword
        });
      const tokenA = loginA.body.data.accessToken;

      // Create Org B
      await request(app)
        .post('/api/v1/organizations')
        .send({
          ...VALID_PAYLOAD,
          name: 'Beta Industries',
          code: 'BETA',
          adminEmail: 'root@beta.org'
        });

      // Token A calling /me must get ACME, never BETA
      const resA = await request(app)
        .get('/api/v1/organizations/me')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(resA.body.data.code).toBe('ACME');
      expect(resA.body.data.code).not.toBe('BETA');
    });
  });
});
