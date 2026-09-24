import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '#@/app.js';
import { startDb, stopDb } from '../setup/db.js';
import Organization from '#@/modules/organization/models/Organization.js';
import Candidate from '#@/modules/candidate/models/Candidate.js';
import JobRequisition from '#@/modules/recruitment/models/JobRequisition.js';
import JobPosting from '#@/modules/recruitment/models/JobPosting.js';
import User from '#@/modules/users/models/User.js';
import cacheService from '#@/platform/cache/index.js';
import env from '#@/config/env.js';
import jwt from 'jsonwebtoken';

describe('Candidate Portal Integration Tests', () => {
  let org;
  let jobRequisition;
  let jobPosting;
  let candidateToken;
  let candidateId;
  let testUserToken;

  beforeAll(async () => {
    await startDb();
    await cacheService.delete('orgSlug:TESTORG');
    // 1. Setup Organization
    org = await Organization.create({
      name: 'Test Org for Candidates',
      code: 'TESTORG',
      domain: 'testorg.com',
      status: 'ACTIVE'
    });

    // 2. Setup HR User
    const user = await User.create({
      organizationId: org._id,
      email: 'hr@testorg.com',
      firstName: 'HR',
      lastName: 'Manager',
      passwordHash: 'hashed',
      status: 'ACTIVE'
    });
    
    testUserToken = jwt.sign({
      userId: user._id,
      organizationId: org._id,
      email: user.email,
      permissions: ['*'] // Super admin for test simplicity
    }, env.JWT_ACCESS_SECRET, { expiresIn: '1h' });

    // 3. Setup Job Requisition and publish to create JobPosting
    jobRequisition = await JobRequisition.create({
      organizationId: org._id,
      jobCode: 'ENG-101',
      departmentId: new mongoose.Types.ObjectId(),
      reportingManagerId: user._id,
      title: 'Software Engineer',
      description: 'Test Description',
      location: 'Remote',
      employmentType: 'FULL_TIME',
      workMode: 'REMOTE',
      minimumExperienceYears: 2,
      maximumExperienceYears: 5,
      salary: { min: 100, max: 150, currency: 'USD', period: 'YEARLY' },
      openPositions: 1,
      approvalStatus: 'APPROVED',
      publishStatus: 'PUBLISHED',
      workflowStatus: 'ACTIVE',
      version: 1,
      customWorkflow: [{ type: 'SCREENING', name: 'Initial Screen', order: 1 }],
      createdBy: user._id,
      updatedBy: user._id
    });

    jobPosting = await JobPosting.create({
      organizationId: org._id,
      jobRequisitionId: jobRequisition._id,
      jobRequisitionVersion: 1,
      slug: 'software-engineer-eng-101',
      title: 'Software Engineer',
      description: 'Test Description',
      department: 'Engineering',
      location: 'Remote',
      employmentType: 'FULL_TIME',
      workMode: 'REMOTE',
      status: 'PUBLISHED',
      createdBy: user._id,
      updatedBy: user._id
    });
  });

  afterAll(async () => {
    await Organization.deleteMany({});
    await User.deleteMany({});
    await JobRequisition.deleteMany({});
    await JobPosting.deleteMany({});
    await Candidate.deleteMany({});
    await stopDb();
  });

  describe('1. Candidate Authentication', () => {
    it('should register a new candidate', async () => {
      const res = await request(app)
        .post(`/api/v1/public/organizations/${org.code}/auth/register`)
        .send({
          email: 'candidate@test.com',
          password: 'Password123!',
          firstName: 'John',
          lastName: 'Doe'
        });
      
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      
      candidateToken = res.body.data.accessToken;
      candidateId = res.body.data.candidate.id;
    });

    it('should not allow duplicate registration', async () => {
      const res = await request(app)
        .post(`/api/v1/public/organizations/${org.code}/auth/register`)
        .send({
          email: 'candidate@test.com',
          password: 'Password123!',
          firstName: 'John',
          lastName: 'Doe'
        });
      
      expect(res.status).toBe(400); // Validation error
    });
  });

  describe('2. Public Job Portal', () => {
    it('should list published jobs for the organization', async () => {
      const res = await request(app)
        .get(`/api/v1/public/organizations/${org.code}/jobs`);
        
      expect(res.status).toBe(200);
      expect(res.body.data.data.length).toBeGreaterThan(0);
      expect(res.body.data.data[0].title).toBe('Software Engineer');
      expect(res.body.data.data[0].salary).toBeUndefined(); // Ensure internal fields are stripped
    });

    it('should get job posting by slug', async () => {
      const res = await request(app)
        .get(`/api/v1/public/organizations/${org.code}/jobs/${jobPosting.slug}`);
        
      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('Software Engineer');
    });
  });

  describe('3. Application Submission', () => {
    it('should require authentication to apply', async () => {
      const res = await request(app)
        .post(`/api/v1/public/organizations/${org.code}/applications/${jobPosting.slug}`)
        .send({});
        
      expect(res.status).toBe(401);
    });
    
    // We mock documentService to avoid actual Supabase uploads during unit tests
    it('should submit application successfully with multipart form', async () => {
      // Create a mock file
      const buffer = Buffer.from('test resume content');
      
      const res = await request(app)
        .post(`/api/v1/public/organizations/${org.code}/applications/${jobPosting.slug}`)
        .set('Authorization', `Bearer ${candidateToken}`)
        .attach('resume', buffer, 'resume.pdf')
        .field('expectedSalary', '120000');
        
      // Since we didn't fully mock documentService yet, it might fail or succeed depending on Supabase test env.
      // Assuming storage is mocked in the setup already:
      // Since we didn't fully mock documentService yet, it might fail or succeed depending on Supabase test env.
      // Assuming storage is mocked in the setup already:
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.applicationNumber).toBeDefined();
      expect(res.body.data.status).toBe('APPLIED');
    });
  });

  describe('4. Snapshot Isolation Guarantee', () => {
    it('should not update JobPosting when JobRequisition is edited until republished', async () => {
      // 1. Edit Requisition
      jobRequisition.title = 'Senior Software Engineer';
      jobRequisition.version = 2;
      await jobRequisition.save();

      // 2. Verify JobPosting is unchanged
      const postingAfterEdit = await JobPosting.findOne({ jobRequisitionId: jobRequisition._id });
      expect(postingAfterEdit.title).toBe('Software Engineer');
      expect(postingAfterEdit.jobRequisitionVersion).toBe(1);

      // 3. Republish (Simulate JobRequisitionService publish behavior)
      const jobPostingService = (await import('#@/modules/recruitment/services/JobPostingService.js')).default;
      await jobPostingService.syncJobPosting(jobRequisition, jobRequisition.createdBy);

      // 4. Verify JobPosting is updated
      const postingAfterRepublish = await JobPosting.findOne({ jobRequisitionId: jobRequisition._id });
      expect(postingAfterRepublish.title).toBe('Senior Software Engineer');
      expect(postingAfterRepublish.jobRequisitionVersion).toBe(2);
    });
  });
});
