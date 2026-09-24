import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import request from 'supertest';
import app from '#@/app.js';
import { startDb, clearDb, stopDb } from '../../setup/db.js';
import OrganizationService from '#@/modules/organization/services/OrganizationService.js';

describe('AI Architecture Verification - Tenant Isolation', () => {
  let orgA, orgB;
  let adminA, adminB;
  let tokenA, tokenB;

  beforeAll(async () => {
    await startDb();
  });

  afterEach(async () => {
    await clearDb();
  });

  afterAll(async () => {
    await stopDb();
  });

  async function setupTenants() {
    const resA = await OrganizationService.createOrganization({
      name: 'Tenant A',
      code: 'TENANTA',
      domain: 'tenanta.ai',
      adminEmail: 'admin@tenanta.ai',
      adminPassword: 'Secure@Password123',
      adminFirstName: 'Admin',
      adminLastName: 'A'
    });
    orgA = resA.organization;
    adminA = resA.adminUser;

    const resB = await OrganizationService.createOrganization({
      name: 'Tenant B',
      code: 'TENANTB',
      domain: 'tenantb.ai',
      adminEmail: 'admin@tenantb.ai',
      adminPassword: 'Secure@Password123',
      adminFirstName: 'Admin',
      adminLastName: 'B'
    });
    orgB = resB.organization;
    adminB = resB.adminUser;

    const loginA = await request(app).post('/api/v1/auth/login').send({ email: 'admin@tenanta.ai', password: 'Secure@Password123' });
    tokenA = loginA.body.data.accessToken;

    const loginB = await request(app).post('/api/v1/auth/login').send({ email: 'admin@tenantb.ai', password: 'Secure@Password123' });
    tokenB = loginB.body.data.accessToken;
  }

  it('1. MUST STRICTLY ISOLATE queries based on JWT organizationId, preventing cross-tenant leakage', async () => {
    await setupTenants();
    
    // Create Department in Tenant A
    await request(app).post('/api/v1/departments').set('Authorization', `Bearer ${tokenA}`).send({ name: 'Dept A', code: 'DEPTA' });
    
    // Create Department in Tenant B
    await request(app).post('/api/v1/departments').set('Authorization', `Bearer ${tokenB}`).send({ name: 'Dept B', code: 'DEPTB' });

    // Admin B queries departments
    const resB = await request(app).get('/api/v1/departments').set('Authorization', `Bearer ${tokenB}`);
    
    expect(resB.status).toBe(200);
    // MUST ONLY see Dept B (plus the auto-seeded GEN admin dept for Tenant B)
    const deptCodes = resB.body.data.items ? resB.body.data.items.map(d => d.code) : resB.body.data.data.map(d => d.code);
    expect(deptCodes).toContain('DEPTB');
    expect(deptCodes).not.toContain('DEPTA');
  });

  it('2. MUST reject an AI orchestrator attempting to fetch resources from a different tenant via explicit ID', async () => {
    await setupTenants();
    
    // Create Department in Tenant A
    const deptA = await request(app).post('/api/v1/departments').set('Authorization', `Bearer ${tokenA}`).send({ name: 'Dept A', code: 'DEPTA' });
    const deptAId = deptA.body.data._id;

    // AI orchestrator in Tenant B tries to explicitly fetch Dept A's ID
    const resB = await request(app).get(`/api/v1/departments/${deptAId}`).set('Authorization', `Bearer ${tokenB}`);
    
    // The BaseRepository strictly appends `{ _id: deptAId, organizationId: tenantBId }` which will not match.
    // So it should return a 404 (or 403) depending on controller implementation, but NEVER 200.
    expect(resB.status).toBe(404);
  });
});
