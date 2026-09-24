import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '#@/app.js';
import { startDb, clearDb, stopDb } from '../setup/db.js';
import OrganizationService from '#@/modules/organization/services/OrganizationService.js';
import { CandidateAuthService } from '#@/modules/candidate/services/CandidateAuthService.js';

describe('API – Public Application Endpoints (/api/v1/public/applications)', () => {
  const PROVISION_PAYLOAD = {
    name: 'Test Inc.',
    slug: 'test-slug',
    code: 'TST',
    adminFirstName: 'Super',
    adminLastName: 'Admin',
    adminEmail: 'admin@test.com',
    adminPassword: 'Password123!'
  };

  let candidateToken;
  let candidateAuthService;

  beforeAll(async () => {
    await startDb();
    const result = await OrganizationService.createOrganization(PROVISION_PAYLOAD);
    candidateAuthService = new CandidateAuthService();
    await candidateAuthService.register(result.organization.id, {
      email: 'cand@test.com',
      password: 'Password123!',
      firstName: 'Cand',
      lastName: 'Test'
    });
    const loginRes = await candidateAuthService.login(result.organization.id, 'cand@test.com', 'Password123!', '127.0.0.1', 'test-ua');
    candidateToken = loginRes.accessToken;
  });

  afterAll(async () => {
    await clearDb();
    await stopDb();
  });

  it('POST /api/v1/public/organizations/:slug/applications/:slugOrId - Should return 400 for invalid request body', async () => {
    const res = await request(app)
      .post('/api/v1/public/organizations/TST/applications/invalid-id')
      .set('Authorization', `Bearer ${candidateToken}`)
      .send({ candidateId: 'invalid-id' });
    
    expect(res.status).toBe(400); // Expecting Zod Validation Error (not 500)
    expect(res.body.success).toBe(false);
  });
});
