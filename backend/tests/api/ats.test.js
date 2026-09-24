import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '#@/app.js';
import { startDb, clearDb, stopDb } from '../setup/db.js';
import OrganizationService from '#@/modules/organization/services/OrganizationService.js';
import JobApplication from '#@/modules/recruitment/models/JobApplication.js';
import ApplicationHistory from '#@/modules/recruitment/models/ApplicationHistory.js';
import cacheService from '#@/platform/cache/index.js';

describe('API – ATS Application Endpoints (/api/v1/applications)', () => {
  let orgData;
  let recruiterToken;
  let recruiterUserId;
  let testAppId;

  const PROVISION_PAYLOAD = {
    name: 'ATS Test Inc.',
    slug: 'ats-test',
    code: 'AT1',
    adminFirstName: 'Recruiter',
    adminLastName: 'Admin',
    adminEmail: 'recruiter@at1.com',
    adminPassword: 'Password123!'
  };

  beforeAll(async () => {
    await startDb();
    await cacheService.delete('orgSlug:AT1');
    const result = await OrganizationService.createOrganization(PROVISION_PAYLOAD);
    orgData = result.organization;
    recruiterUserId = result.adminUser.id;

    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'recruiter@at1.com', password: 'Password123!' });
    recruiterToken = loginRes.body.data.accessToken;

    const dummyApp = await JobApplication.create({
      organizationId: orgData.id,
      jobPostingId: new mongoose.Types.ObjectId(),
      candidateId: new mongoose.Types.ObjectId(),
      applicationNumber: 'APP-AT1-1001',
      submittedResumeDocumentId: new mongoose.Types.ObjectId(),
      status: 'APPLIED'
    });
    testAppId = dummyApp._id.toString();
  });

  afterAll(async () => {
    await cacheService.delete('orgSlug:AT1');
    await clearDb();
    await stopDb();
  });

  it('GET /api/v1/applications/:id - Should return 400 for invalid ObjectId', async () => {
    const res = await request(app)
      .get('/api/v1/applications/invalid-id')
      .set('Authorization', `Bearer ${recruiterToken}`);
    
    expect(res.status).toBe(400); // Expecting Zod Validation Error (not 500)
    expect(res.body.success).toBe(false);
  });

  it('GET /api/v1/applications/requisitions/:requisitionId/applications - Should return 400 for invalid requisitionId', async () => {
    const res = await request(app)
      .get('/api/v1/applications/requisitions/invalid-id/applications')
      .set('Authorization', `Bearer ${recruiterToken}`);
    
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('PATCH /api/v1/applications/:id/reject - Should return 400 for invalid ObjectId', async () => {
    const res = await request(app)
      .patch('/api/v1/applications/invalid-id/reject')
      .set('Authorization', `Bearer ${recruiterToken}`)
      .send({ reason: 'Not qualified' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('PATCH /api/v1/applications/:id/reject - Should successfully reject an application and record history (200)', async () => {
    const res = await request(app)
      .patch(`/api/v1/applications/${testAppId}/reject`)
      .set('Authorization', `Bearer ${recruiterToken}`)
      .send({ reason: 'Lacks required technical skills' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('REJECTED');
    expect(res.body.data.rejectedReason).toBe('Lacks required technical skills');

    // Verify ApplicationHistory in DB
    const history = await ApplicationHistory.findOne({ applicationId: testAppId, action: 'Rejected' });
    expect(history).not.toBeNull();
    expect(history.comment).toBe('Lacks required technical skills');
    expect(history.performedByType).toBe('User');
  });

  it('PATCH /api/v1/applications/:id/reject - Should prevent rejecting an already rejected application (409)', async () => {
    const res = await request(app)
      .patch(`/api/v1/applications/${testAppId}/reject`)
      .set('Authorization', `Bearer ${recruiterToken}`)
      .send({ reason: 'Try again' });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });
});
