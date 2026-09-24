import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '#@/app.js';
import { startDb, stopDb, clearDb } from '../setup/db.js';
import env from '#@/config/env.js';
import OrganizationService from '#@/modules/organization/services/OrganizationService.js';
import { PERMISSIONS } from '#@/core/constants/permissions/index.js';
import JobRequisition from '#@/modules/recruitment/models/JobRequisition.js';
import Department from '#@/modules/departments/models/Department.js';
import JobPosting from '#@/modules/recruitment/models/JobPosting.js';
import CacheService from '#@/platform/cache/index.js';
import JobApplication from '#@/modules/recruitment/models/JobApplication.js';
import ApprovalWorkflowTemplate from '#@/modules/recruitment/models/ApprovalWorkflowTemplate.js';
import Interview from '#@/modules/recruitment/models/Interview.js';
import Offer from '#@/modules/recruitment/models/Offer.js';
import Employee from '#@/modules/employees/models/Employee.js';
import ApplicationHistory from '#@/modules/recruitment/models/ApplicationHistory.js';
import Candidate from '#@/modules/candidate/models/Candidate.js';
import ApplicationWorkflowInstance from '#@/modules/recruitment/models/ApplicationWorkflowInstance.js';
import mongoose from 'mongoose';

describe('Gate 4: E2E Hiring Pipeline', () => {
  let superAdminToken, hrManagerToken, recruiterToken, candidateToken;
  let orgId, locId, deptId, desigId;
  let hrRoleId, recruiterRoleId;
  let hrUserId, recruiterUserId, candidateId;
  let reqId, postingId, applicationId;
  let hrSessionId, recruiterSessionId, candidateSessionId;
  let interviewId, offerId, employeeId, invitationLink;
  let shiftId;

  const PROVISION_PAYLOAD = {
    name: 'E2E Testing Corp',
    code: 'E2EC',
    adminEmail: 'superadmin@e2ec.com',
    adminPassword: 'Password123!',
    adminFirstName: 'Super',
    adminLastName: 'Admin',
    subdomain: 'e2ec',
    timezone: 'UTC'
  };

  beforeAll(async () => {
    await startDb();
    await CacheService.delete('orgSlug:E2EC');
    
    // 1. Provision Tenant
    const res = await OrganizationService.createOrganization(PROVISION_PAYLOAD);
    orgId = res.organization.id;

    // 2. Super Admin Login
    const loginRes = await request(app).post('/api/v1/auth/login').set('x-subdomain', 'e2ec').send({
      email: PROVISION_PAYLOAD.adminEmail,
      password: PROVISION_PAYLOAD.adminPassword
    });
    superAdminToken = loginRes.body.data.accessToken;
    
    // Wait for async background jobs (like DepartmentBootstrap) to finish
    await new Promise((resolve) => setTimeout(resolve, 500));
  }, 30000);

  afterAll(async () => {
    await clearDb();
    await stopDb();
  });

  describe('Phase 1: Organization & Role Setup', () => {
    it('Step 1: Create Location', async () => {
      const res = await request(app).post('/api/v1/locations').set('Authorization', `Bearer ${superAdminToken}`).send({
        code: 'HQ',
        name: 'Headquarters',
        address: '123 Main St, Tech City, CA, US 90001',
        timezone: 'America/Los_Angeles'
      });
      expect(res.status).toBe(201);
      locId = res.body.data._id;
    });

    it('Step 1b: Create Shift', async () => {
      const res = await request(app).post('/api/v1/shifts').set('Authorization', `Bearer ${superAdminToken}`).send({
        name: 'Standard Day Shift',
        code: 'DAY',
        startTime: '09:00',
        endTime: '18:00',
        breakDuration: 60,
        workDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']
      });
      if (res.status !== 201) console.log(JSON.stringify(res.body, null, 2));
      expect(res.status).toBe(201);
      shiftId = res.body.data._id;
    });

    it('Step 2: Create Department', async () => {
      const res = await request(app).post('/api/v1/departments').set('Authorization', `Bearer ${superAdminToken}`).send({
        code: 'HR',
        name: 'Human Resources'
      });
      expect(res.status).toBe(201);
      deptId = res.body.data._id;
    });

    it('Step 3: Create Designation', async () => {
      const res = await request(app).post('/api/v1/designations').set('Authorization', `Bearer ${superAdminToken}`).send({
        code: 'REC1',
        title: 'Recruitment Specialist',
        level: 3
      });
      expect(res.status).toBe(201);
      desigId = res.body.data._id;
    });

    it('Step 4: Create Custom Roles (HR Manager & Recruiter)', async () => {
      // HR Manager
      const hrRes = await request(app).post('/api/v1/roles').set('Authorization', `Bearer ${superAdminToken}`).send({
        name: 'E2E HR Manager',
        priority: 10,
        permissions: [PERMISSIONS.RECRUITMENT.JOB.CREATE, PERMISSIONS.RECRUITMENT.JOB.APPROVE, PERMISSIONS.RECRUITMENT.JOB.PUBLISH, PERMISSIONS.RECRUITMENT.JOB.VIEW, PERMISSIONS.EMPLOYEE.CREATE, PERMISSIONS.INVITE.CREATE, PERMISSIONS.ROLE.ASSIGN, PERMISSIONS.RECRUITMENT.APPLICATION.VIEW, PERMISSIONS.RECRUITMENT.JOB.EDIT]
      });
      expect(hrRes.status).toBe(201);
      hrRoleId = hrRes.body.data._id;

      // Recruiter
      const recRes = await request(app).post('/api/v1/roles').set('Authorization', `Bearer ${superAdminToken}`).send({
        name: 'E2E Recruiter',
        priority: 20,
        permissions: [PERMISSIONS.RECRUITMENT.JOB.CREATE, PERMISSIONS.RECRUITMENT.JOB.EDIT, PERMISSIONS.RECRUITMENT.JOB.VIEW, PERMISSIONS.RECRUITMENT.APPLICATION.VIEW, PERMISSIONS.RECRUITMENT.APPLICATION.MOVE_STAGE]
      });
      expect(recRes.status).toBe(201);
      recruiterRoleId = recRes.body.data._id;
    });

    it('Step 5: Setup Role Delegation (Super Admin -> HR Manager -> Recruiter)', async () => {
      // Ensure HR Manager can assign Recruiter
      const res = await request(app).post('/api/v1/role-delegation-policies').set('Authorization', `Bearer ${superAdminToken}`).send({
        sourceRoleId: hrRoleId,
        targetRoleId: recruiterRoleId
      });
      expect(res.status).toBe(201);
    });
  });

  describe('Phase 2: Employee Onboarding', () => {
    let hrInviteToken, recruiterInviteToken;
    
    it('Step 6: Super Admin Invites HR Manager', async () => {
      const res = await request(app).post('/api/v1/invites').set('Authorization', `Bearer ${superAdminToken}`).send({
        email: 'hrmanager@e2ec.com',
        roleIds: [hrRoleId],
        expiresInHours: 168
      });
      expect(res.status).toBe(201);
      hrInviteToken = res.body.data.token;
    });

    it('Step 7: HR Manager Registers & Logs In', async () => {
      const reg = await request(app).post('/api/v1/auth/register-invite').set('x-subdomain', 'e2ec').send({
        token: hrInviteToken,
        firstName: 'Helen',
        lastName: 'Richards',
        password: 'Password123!'
      });
      if (reg.status !== 201) console.log(JSON.stringify(reg.body, null, 2));
      expect(reg.status).toBe(201);
      hrUserId = reg.body.data.user.id || reg.body.data.user._id;

      const login = await request(app).post('/api/v1/auth/login').set('x-subdomain', 'e2ec').send({
        email: 'hrmanager@e2ec.com',
        password: 'Password123!'
      });
      expect(login.status).toBe(200);
      hrManagerToken = login.body.data.accessToken;
      hrSessionId = login.body.data.sessionId;
    });

    it('Step 8: HR Manager Invites Recruiter', async () => {
      const res = await request(app).post('/api/v1/invites').set('Authorization', `Bearer ${hrManagerToken}`).send({
        email: 'recruiter@e2ec.com',
        roleIds: [recruiterRoleId],
        expiresInHours: 168
      });
      expect(res.status).toBe(201);
      recruiterInviteToken = res.body.data.token;
    });

    it('Step 9: Recruiter Registers & Logs In', async () => {
      const reg = await request(app).post('/api/v1/auth/register-invite').set('x-subdomain', 'e2ec').send({
        token: recruiterInviteToken,
        firstName: 'Rick',
        lastName: 'Ruiter',
        password: 'Password123!'
      });
      expect(reg.status).toBe(201);
      recruiterUserId = reg.body.data.user.id || reg.body.data.user._id;

      const login = await request(app).post('/api/v1/auth/login').set('x-subdomain', 'e2ec').send({
        email: 'recruiter@e2ec.com',
        password: 'Password123!'
      });
      expect(login.status).toBe(200);
      recruiterToken = login.body.data.accessToken;
      recruiterSessionId = login.body.data.sessionId;
    });
  });

  describe('Phase 3: Recruitment Lifecycle', () => {
    let approvalTemplateId;

    it('Step 9.5: Create Approval Workflow Template (Direct DB)', async () => {
      const template = await ApprovalWorkflowTemplate.create({
        organizationId: orgId,
        name: 'Standard Requisition Approval',
        createdBy: hrUserId,
        steps: [
          {
            order: 1,
            principalType: 'USER',
            principalId: hrUserId,
            isRequired: true
          }
        ]
      });
      approvalTemplateId = template._id;
    });

    it('Step 10: Recruiter Creates Job Requisition', async () => {
      const res = await request(app).post('/api/v1/requisitions').set('Authorization', `Bearer ${recruiterToken}`).send({
        title: 'Senior Frontend Engineer',
        description: 'Build modern UIs using React and Node.js.',
        departmentId: deptId,
        reportingManagerId: hrUserId, // Just use hrUserId as a valid reporting manager
        location: locId, // The schema says z.string() so passing ObjectId string is fine
        employmentType: 'FULL_TIME',
        workMode: 'REMOTE',
        minimumExperienceYears: 3,
        maximumExperienceYears: 6,
        salary: { min: 100000, max: 150000, currency: 'USD', period: 'YEARLY' },
        openPositions: 2,
        approvalWorkflowTemplateId: approvalTemplateId,
        customWorkflow: [
          { name: 'Resume Screening', order: 1, type: 'SCREENING' },
          { name: 'Technical Interview', order: 2, type: 'INTERVIEW' },
          { name: 'Offer', order: 3, type: 'OFFER' }
        ]
      });
      if (res.status !== 201) console.log(JSON.stringify(res.body, null, 2));
      expect(res.status).toBe(201);
      reqId = res.body.data._id;
    });

    it('Step 11: Recruiter Submits Requisition for Approval', async () => {
      const res = await request(app).patch(`/api/v1/requisitions/${reqId}/submit-approval`).set('Authorization', `Bearer ${recruiterToken}`).send({});
      expect(res.status).toBe(200);
      expect(res.body.data.approvalStatus).toBe('PENDING_APPROVAL');
    });

    it('Step 12: HR Manager Approves Requisition', async () => {
      const res = await request(app).patch(`/api/v1/requisitions/${reqId}/approve`).set('Authorization', `Bearer ${hrManagerToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.approvalStatus).toBe('APPROVED');
    });

    it('Step 13: HR Manager Publishes Requisition', async () => {
      const res = await request(app).patch(`/api/v1/requisitions/${reqId}/publish`).set('Authorization', `Bearer ${hrManagerToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.publishStatus).toBe('PUBLISHED');

      // Wait for EventBus to asynchronously create JobPosting
      await new Promise(resolve => setTimeout(resolve, 500));

      // Verify the public job posting is created
      const list = await request(app).get('/api/v1/public/organizations/e2ec/jobs');
      expect(list.status).toBe(200);
      expect(list.body.data.data.length).toBeGreaterThan(0);
      postingId = list.body.data.data[0]._id;
    });
  });

  describe('Phase 4: Candidate Application & Workflow', () => {
    it('Step 14: Candidate Registers on Public Portal', async () => {
      const res = await request(app).post('/api/v1/public/organizations/e2ec/auth/register').send({
        email: 'candidate@e2ec.com',
        firstName: 'John',
        lastName: 'Doe',
        password: 'Password123!'
      });
      if (res.status !== 201) console.log(JSON.stringify(res.body, null, 2));
      expect(res.status).toBe(201);
      candidateId = res.body.data.candidate.id || res.body.data.candidate._id;

      const login = await request(app).post('/api/v1/public/organizations/e2ec/auth/login').send({
        email: 'candidate@e2ec.com',
        password: 'Password123!'
      });
      expect(login.status).toBe(200);
      candidateToken = login.body.data.accessToken;
      candidateSessionId = login.body.data.sessionId;
    });

    it('Step 15: Candidate Applies to Job Posting', async () => {
      const res = await request(app)
        .post(`/api/v1/public/organizations/e2ec/applications/${postingId}`)
        .set('Authorization', `Bearer ${candidateToken}`)
        .attach('resume', Buffer.from('fake pdf content'), 'resume.pdf');
      if (res.status !== 201) console.log(JSON.stringify(res.body, null, 2));
      expect(res.status).toBe(201);
      applicationId = res.body.data._id;
    });

    it('Step 16: Move Candidate to Interview Stage', async () => {
      // Find the second stage ID
      const req = await request(app).get(`/api/v1/requisitions/${reqId}`).set('Authorization', `Bearer ${recruiterToken}`);
      const interviewStageId = req.body.data.customWorkflow[1]._id;

      const res = await request(app).patch(`/api/v1/applications/${applicationId}/advance`).set('Authorization', `Bearer ${recruiterToken}`).send({
        nextStageId: interviewStageId,
        comments: 'Good screening'
      });
      if(res.status !== 200) console.log(JSON.stringify(res.body, null, 2));
      expect(res.status).toBe(200);
      expect(res.body.data.nextStage.stageId).toBe(interviewStageId);
    });

    it('Step 17: HR Schedules Interview', async () => {
      const req = await request(app).get(`/api/v1/requisitions/${reqId}`).set('Authorization', `Bearer ${hrManagerToken}`);
      const interviewStageId = req.body.data.customWorkflow[1]._id;

      const res = await request(app).post(`/api/v1/applications/${applicationId}/interviews`).set('Authorization', `Bearer ${hrManagerToken}`).send({
        stageId: interviewStageId,
        title: 'Technical Round 1',
        interviewType: 'ONLINE',
        scheduledStart: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        scheduledEnd: new Date(Date.now() + 90000000).toISOString(),
        timezone: 'America/Los_Angeles',
        meetingUrl: 'https://meet.google.com/abc-defg-hij',
        interviewerIds: [hrUserId]
      });
      if(res.status !== 200) console.log(JSON.stringify(res.body, null, 2));
      expect(res.status).toBe(200);
      interviewId = res.body.data._id;
    });

    it('Step 18: HR Evaluates Interview', async () => {
      const res = await request(app).post(`/api/v1/applications/${applicationId}/interviews/${interviewId}/evaluate`).set('Authorization', `Bearer ${hrManagerToken}`).send({
        technicalScore: 85,
        communicationScore: 90,
        cultureScore: 95,
        overallScore: 90,
        recommendation: 'HIRE',
        comments: 'Excellent candidate, strong technical skills.'
      });
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('COMPLETED');
    });

    it('Step 19: HR Creates and Sends Offer', async () => {
      const createRes = await request(app).post(`/api/v1/applications/${applicationId}/offers`).set('Authorization', `Bearer ${hrManagerToken}`).send({
        salary: { amount: 140000, currency: 'USD', period: 'YEARLY' },
        designationId: desigId,
        departmentId: deptId,
        joiningDate: new Date(Date.now() + 30 * 86400000).toISOString(),
        offerExpiry: new Date(Date.now() + 7 * 86400000).toISOString(),
        notes: 'Sign-on bonus included.'
      });
      if (createRes.status !== 201) console.log('OFFER CREATE FAILED:', JSON.stringify(createRes.body, null, 2));
      expect(createRes.status).toBe(201);
      offerId = createRes.body.data._id;

      const sendRes = await request(app).patch(`/api/v1/applications/${applicationId}/offers/${offerId}/send`).set('Authorization', `Bearer ${hrManagerToken}`);
      expect(sendRes.status).toBe(200);
      expect(sendRes.body.data.status).toBe('PENDING_RESPONSE');
    });

    it('Step 20: Candidate Accepts Offer', async () => {
      const res = await request(app).patch(`/api/v1/public/organizations/e2ec/applications/offers/${offerId}/accept`).set('Authorization', `Bearer ${candidateToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('ACCEPTED');
    });

    it('Step 21: HR Hires Candidate', async () => {
      const res = await request(app).post(`/api/v1/applications/${applicationId}/hire`).set('Authorization', `Bearer ${hrManagerToken}`).send({
        shiftId
      });
      expect(res.status).toBe(200);
      expect(res.body.data.employeeId).toBeDefined();
      expect(res.body.data.invitationLink).toBeDefined();
      employeeId = res.body.data.employeeId;
      invitationLink = res.body.data.invitationLink;
    });
  });

  describe('Phase 5: Integrity and Cleanup Verifications', () => {
    it('Data Consistency: References are internally consistent', async () => {
      const appDoc = await JobApplication.findById(applicationId);
      expect(appDoc).toBeDefined();
      expect(appDoc.jobPostingId.toString()).toBe(postingId);
      expect(appDoc.status).toBe('HIRED');
      
      const postDoc = await JobPosting.findById(postingId);
      expect(postDoc).toBeDefined();
      expect(postDoc.jobRequisitionId.toString()).toBe(reqId);
      
      const reqDoc = await JobRequisition.findById(reqId);
      expect(reqDoc).toBeDefined();
      expect(reqDoc.filledPositions).toBe(1);

      // Offer and Interview
      const offer = await Offer.findById(offerId);
      expect(offer).toBeDefined();
      expect(offer.status).toBe('ACCEPTED');

      const interview = await Interview.findById(interviewId);
      expect(interview).toBeDefined();
      expect(interview.status).toBe('COMPLETED');
      expect(interview.recommendation).toBe('HIRE');

      // Candidate Profile
      const candidate = await Candidate.findById(candidateId);
      expect(candidate).toBeDefined();

      // Employee Profile
      const employee = await Employee.findById(employeeId);
      expect(employee).toBeDefined();
      expect(employee.status).toBe('INVITED');
      
      // Application History (should have lots of transitions)
      const history = await ApplicationHistory.find({ applicationId });
      expect(history.length).toBeGreaterThan(3);

      // Workflow instance
      const workflow = await ApplicationWorkflowInstance.findOne({ applicationId });
      expect(workflow).toBeDefined();

      // Invitation
      const Invitation = mongoose.model('Invitation');
      const invite = await Invitation.findOne({ email: candidate.email });
      expect(invite).toBeDefined();
      expect(invite.status).toBe('ACTIVE');
    });

    it('Database Integrity: No duplicate indexing conflicts', async () => {
      const dupRecruiter = await request(app).post('/api/v1/invites').set('Authorization', `Bearer ${superAdminToken}`).send({
        email: 'recruiter@e2ec.com', // Duplicate active invite email
        roleIds: [recruiterRoleId],
        expiresInHours: 168
      });
      expect(dupRecruiter.status).toBe(409); // Assert conflict
    });

    it('Cleanup Verification: Ensure Redis Sessions are deleted on logout', async () => {
      // Logout HR Manager
      const hrLogout = await request(app).post('/api/v1/auth/logout').set('Authorization', `Bearer ${hrManagerToken}`);
      expect(hrLogout.status).toBe(200);
      
      const session = await CacheService.get(`session:${hrUserId}`);
      expect(session).toBeNull();
    });
  });
});
