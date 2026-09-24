import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '#@/app.js';
import { startDb, clearDb, stopDb } from '../setup/db.js';
import OrganizationService from '#@/modules/organization/services/OrganizationService.js';
import { CandidateAuthService } from '#@/modules/candidate/services/CandidateAuthService.js';
import cacheService from '#@/platform/cache/index.js';

describe('API – Candidate Profile Endpoints (/api/v1/public/organizations/:slug/profile)', () => {
  const PROVISION_PAYLOAD = {
    name: 'Candidate Profile Org',
    slug: 'cpf-slug',
    code: 'CPF',
    adminFirstName: 'Super',
    adminLastName: 'Admin',
    adminEmail: 'admin@cpf.com',
    adminPassword: 'Password123!'
  };

  let candidateToken;
  let candidateAuthService;
  let orgId;

  beforeAll(async () => {
    await startDb();
    await cacheService.delete('orgSlug:CPF');
    const result = await OrganizationService.createOrganization(PROVISION_PAYLOAD);
    orgId = result.organization.id;
    candidateAuthService = new CandidateAuthService();
    await candidateAuthService.register(orgId, {
      email: 'cand@cpf.com',
      password: 'Password123!',
      firstName: 'Cand',
      lastName: 'Test'
    });
    const loginRes = await candidateAuthService.login(orgId, 'cand@cpf.com', 'Password123!', { ip: '127.0.0.1', userAgent: 'test-ua' });
    candidateToken = loginRes.accessToken;
  });

  afterAll(async () => {
    await cacheService.delete('orgSlug:CPF');
    await clearDb();
    await stopDb();
  });

  it('GET /api/v1/public/organizations/CPF/profile - Should return candidate profile with all required metadata', async () => {
    const res = await request(app)
      .get('/api/v1/public/organizations/CPF/profile')
      .set('Authorization', `Bearer ${candidateToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('profile');
    expect(res.body.data).toHaveProperty('profilePhoto');
    expect(res.body.data).toHaveProperty('uploadedDocuments');
    expect(res.body.data).toHaveProperty('resumeMetadata');
    expect(res.body.data.profile.firstName).toBe('Cand');
    expect(res.body.data.profile.lastName).toBe('Test');
  });

  it('PUT /api/v1/public/organizations/CPF/profile - Should update editable fields successfully', async () => {
    const res = await request(app)
      .put('/api/v1/public/organizations/CPF/profile')
      .set('Authorization', `Bearer ${candidateToken}`)
      .send({
        firstName: 'CandUpdated',
        headline: 'Senior Backend Developer',
        skills: ['Node.js', 'MongoDB', 'Express']
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.profile.firstName).toBe('CandUpdated');
    expect(res.body.data.profile.headline).toBe('Senior Backend Developer');
    expect(res.body.data.profile.skills).toEqual(['Node.js', 'MongoDB', 'Express']);
  });

  it('PUT /api/v1/public/organizations/CPF/profile - Should prevent updating immutable or authentication fields (400)', async () => {
    const res = await request(app)
      .put('/api/v1/public/organizations/CPF/profile')
      .set('Authorization', `Bearer ${candidateToken}`)
      .send({
        email: 'hacked@test.com',
        organizationId: '507f1f77bcf86cd799439011'
      });

    expect(res.status).toBe(400); // Zod strict validation error
    expect(res.body.success).toBe(false);
  });

  it('GET /api/v1/public/organizations/CPF/profile - Should return 401 when unauthenticated', async () => {
    const res = await request(app)
      .get('/api/v1/public/organizations/CPF/profile');
    
    expect(res.status).toBe(401);
  });
});
