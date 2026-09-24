import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import app from '#@/app.js';
import { startDb, clearDb, stopDb } from '../setup/db.js';
import OrganizationService from '#@/modules/organization/services/OrganizationService.js';
import { AuthService } from '#@/modules/auth/services/AuthService.js';
import { documentService } from '#@/modules/documents/services/DocumentService.js';
import { storageService } from '#@/platform/storage/index.js';
import documentRepository from '#@/modules/documents/repositories/DocumentRepository.js';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import env from '#@/config/env.js';
import { cacheService } from '#@/platform/cache/index.js';

describe('Gate 3: Documents & Storage Integration', () => {
  let orgId1, orgId2;
  let userToken1, userToken2;
  let adminUserId1;
  let uploadedDocumentId;
  let uploadedStoragePath;

  beforeAll(async () => {
    await startDb();

    // Setup Org 1
    const org1 = await OrganizationService.createOrganization({
      name: 'Doc Org 1',
      slug: 'doc-org-1',
      code: 'DC1',
      adminFirstName: 'A1',
      adminLastName: 'L1',
      adminEmail: 'admin1@doc.com',
      adminPassword: 'Password123!'
    });
    orgId1 = org1.organization.id;
    adminUserId1 = org1.adminUser.id;

    const login1 = await new AuthService().login('admin1@doc.com', 'Password123!', 'DC1');
    userToken1 = login1.accessToken;

    // Setup Org 2 (For tenant isolation tests)
    const org2 = await OrganizationService.createOrganization({
      name: 'Doc Org 2',
      slug: 'doc-org-2',
      code: 'DC2',
      adminFirstName: 'A2',
      adminLastName: 'L2',
      adminEmail: 'admin2@doc.com',
      adminPassword: 'Password123!'
    });
    orgId2 = org2.organization.id;

    const login2 = await new AuthService().login('admin2@doc.com', 'Password123!', 'DC2');
    userToken2 = login2.accessToken;
  });

  afterAll(async () => {
    await clearDb();
    await stopDb();
  });

  describe('Service Integration & Rollback (Failure Injection)', () => {
    it('Should upload document and save metadata successfully', async () => {
      const mockFile = {
        buffer: Buffer.from('test document content'),
        mimetype: 'text/plain',
        size: 21,
        originalname: 'test.txt'
      };

      const metadataPayload = {
        category: 'generic',
        ownerType: 'SYSTEM',
        ownerId: new mongoose.Types.ObjectId().toString(),
        description: 'Integration test file'
      };

      const doc = await documentService.createDocument(mockFile, metadataPayload, orgId1, adminUserId1);
      
      expect(doc).toBeDefined();
      expect(doc.organizationId.toString()).toBe(orgId1.toString());
      expect(doc.storagePath).toBeDefined();
      
      uploadedDocumentId = doc._id;
      uploadedStoragePath = doc.storagePath;

      // Verify file exists in storage provider
      const downloaded = await storageService.download(uploadedStoragePath);
      expect(downloaded.toString()).toBe('test document content');
    });

    it('Should cleanly rollback storage if database insertion fails (Failure Injection)', async () => {
      const mockFile = {
        buffer: Buffer.from('failed document content'),
        mimetype: 'text/plain',
        size: 23,
        originalname: 'fail.txt'
      };

      const metadataPayload = {
        category: 'generic',
        ownerType: 'SYSTEM',
        ownerId: new mongoose.Types.ObjectId().toString(),
        description: 'Will fail'
      };

      // Spy on storage service delete to ensure it gets called
      const deleteSpy = vi.spyOn(storageService, 'delete');
      
      // Inject DB Failure
      const createScopedSpy = vi.spyOn(documentRepository, 'createScoped').mockRejectedValueOnce(new Error('Injected DB Error'));

      await expect(
        documentService.createDocument(mockFile, metadataPayload, orgId1, adminUserId1)
      ).rejects.toThrow('Injected DB Error');

      // Verify storageService.delete was called to rollback
      expect(deleteSpy).toHaveBeenCalled();
      
      createScopedSpy.mockRestore();
      deleteSpy.mockRestore();
    });

    it('Tenant Isolation: Should throw NotFoundError if attempting to get document from another tenant', async () => {
      await expect(
        documentService.getDocument(uploadedDocumentId, orgId2)
      ).rejects.toThrow(/not found/i);
    });
  });

  describe('Negative Security & API Endpoint Verification', () => {
    let applicationId;

    beforeAll(async () => {
      const Requisition = mongoose.model('JobRequisition');
      const Application = mongoose.model('JobApplication');
      
      const req = await Requisition.create({
        organizationId: orgId1,
        title: 'Doc Tester',
        jobCode: 'DOC-123',
        description: 'Test Description',
        departmentId: new mongoose.Types.ObjectId(),
        hiringManagerId: adminUserId1,
        reportingManagerId: adminUserId1,
        employmentType: 'FULL_TIME',
        location: 'Remote',
        workMode: 'REMOTE',
        openPositions: 1,
        salary: { min: 100, max: 150, currency: 'USD', period: 'YEARLY' },
        minimumExperienceYears: 2,
        maximumExperienceYears: 5,
        status: 'PUBLISHED',
        createdBy: adminUserId1,
        updatedBy: adminUserId1,
        hiringWorkflowSteps: [
          { name: 'Applied', type: 'APPLIED', order: 1 }
        ]
      });

      const appDoc = await Application.create({
        organizationId: orgId1,
        jobRequisitionId: req._id,
        jobPostingId: new mongoose.Types.ObjectId(),
        candidateId: new mongoose.Types.ObjectId(),
        applicationNumber: 'APP-12345',
        status: 'APPLIED',
        submittedResumeDocumentId: uploadedDocumentId,
        source: {
          type: 'CAREERS_PORTAL'
        }
      });
      applicationId = appDoc._id;
    });

    it('401 Unauthenticated: Missing JWT', async () => {
      const res = await request(app)
        .get(`/api/v1/applications/${applicationId}/documents/${uploadedDocumentId}/download`);
      expect(res.status).toBe(401);
    });

    it('401 Unauthenticated: Malformed JWT', async () => {
      const res = await request(app)
        .get(`/api/v1/applications/${applicationId}/documents/${uploadedDocumentId}/download`)
        .set('Authorization', `Bearer not-a-real-jwt`);
      expect(res.status).toBe(401);
    });

    it('401 Unauthenticated: Expired JWT', async () => {
      const expiredToken = jwt.sign({ userId: adminUserId1, organizationId: orgId1, sessionId: 'fake' }, env.JWT_ACCESS_SECRET, { expiresIn: '-1h' });
      const res = await request(app)
        .get(`/api/v1/applications/${applicationId}/documents/${uploadedDocumentId}/download`)
        .set('Authorization', `Bearer ${expiredToken}`);
      expect(res.status).toBe(401);
    });
    
    it('401 Unauthenticated: Revoked Redis session', async () => {
      // Create a valid token but don't store it in Redis (simulating revoked session)
      const revokedToken = jwt.sign({ userId: adminUserId1, organizationId: orgId1, sessionId: 'revoked-session-123' }, env.JWT_ACCESS_SECRET, { expiresIn: '1h' });
      const res = await request(app)
        .get(`/api/v1/applications/${applicationId}/documents/${uploadedDocumentId}/download`)
        .set('Authorization', `Bearer ${revokedToken}`);
      expect(res.status).toBe(401);
    });

    it('404 Tenant Isolation: Valid JWT from another tenant accessing Org 1 document', async () => {
      const res = await request(app)
        .get(`/api/v1/applications/${applicationId}/documents/${uploadedDocumentId}/download`)
        .set('Authorization', `Bearer ${userToken2}`);
      expect(res.status).toBe(404);
    });

    it('200 Success Path: Should download document and NOT expose raw storage path in response', async () => {
      const res = await request(app)
        .get(`/api/v1/applications/${applicationId}/documents/${uploadedDocumentId}/download`)
        .set('Authorization', `Bearer ${userToken1}`);
      
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/plain');
      expect(res.headers['content-disposition']).toContain('test.txt');
      expect(res.text).toBe('test document content');
      
      // Ensure raw storage path is not leaked anywhere in headers or body
      expect(res.headers['x-storage-path']).toBeUndefined();
      expect(JSON.stringify(res.headers)).not.toContain(uploadedStoragePath);
    });
  });
});
