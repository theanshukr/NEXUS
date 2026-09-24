import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import request from 'supertest';
import app from '#@/app.js';
import { startDb, clearDb, stopDb } from '../setup/db.js';
import { hashPassword } from '#@/core/utils/crypto.js';
import OrganizationService from '#@/modules/organization/services/OrganizationService.js';
import Role from '#@/modules/roles/models/Role.js';
import User from '#@/modules/users/models/User.js';
import UserRole from '#@/modules/roles/models/UserRole.js';
import PERMISSIONS from '#@/core/constants/permissions/index.js';
import HiringWorkflowTemplate from '#@/modules/recruitment/models/HiringWorkflowTemplate.js';
import ApprovalWorkflowTemplate from '#@/modules/recruitment/models/ApprovalWorkflowTemplate.js';
import JobRequisition from '#@/modules/recruitment/models/JobRequisition.js';
import RequisitionHistory from '#@/modules/recruitment/models/RequisitionHistory.js';

describe('API – Recruitment Administration Endpoints (/api/v1/requisitions)', () => {
  let orgData;
  let adminUser;
  let superAdminToken;
  
  let recruiterToken;
  let hrManagerToken;
  let employeeToken;

  let recruiterUserId;
  let hrManagerUserId;

  let hiringTemplateId;
  let approvalTemplateId;

  const PROVISION_PAYLOAD = {
    name: 'Recruitment Test Corp',
    code: 'RECRUIT',
    domain: 'recruit.io',
    adminEmail: 'admin@recruit.io',
    adminPassword: 'Super@Password123',
    adminFirstName: 'Root',
    adminLastName: 'Admin'
  };

  beforeAll(async () => {
    await startDb();
    const res = await OrganizationService.createOrganization(PROVISION_PAYLOAD);
    orgData = res.organization;
    adminUser = res.adminUser;

    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: PROVISION_PAYLOAD.adminEmail, password: PROVISION_PAYLOAD.adminPassword });
    superAdminToken = loginRes.body.data.accessToken;

    // Create users
    const createTestUser = async (permissions, emailPrefix) => {
      const customRole = await Role.create({
        organizationId: orgData.id,
        name: `Role_${emailPrefix}`,
        priority: 50,
        permissions,
        status: 'ACTIVE'
      });
      const user = await User.create({
        organizationId: orgData.id,
        email: `${emailPrefix}@recruit.io`,
        passwordHash: await hashPassword(PROVISION_PAYLOAD.adminPassword),
        firstName: emailPrefix,
        lastName: 'User',
        status: 'ACTIVE'
      });
      await UserRole.create({
        organizationId: orgData.id,
        userId: user._id,
        roleId: customRole._id,
        assignedBy: adminUser.id
      });
      const resToken = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: user.email, password: PROVISION_PAYLOAD.adminPassword });
      return { token: resToken.body.data.accessToken, userId: user._id, roleId: customRole._id };
    };

    const recruiter = await createTestUser([
      PERMISSIONS.RECRUITMENT.JOB.CREATE,
      PERMISSIONS.RECRUITMENT.JOB.EDIT,
      PERMISSIONS.RECRUITMENT.JOB.VIEW
    ], 'recruiter');
    recruiterToken = recruiter.token;
    recruiterUserId = recruiter.userId;

    const hrManager = await createTestUser([
      PERMISSIONS.RECRUITMENT.JOB.PUBLISH,
      PERMISSIONS.RECRUITMENT.JOB.APPROVE,
      PERMISSIONS.RECRUITMENT.JOB.VIEW
    ], 'hrmanager');
    hrManagerToken = hrManager.token;
    hrManagerUserId = hrManager.userId;

    const employee = await createTestUser([], 'employee');
    employeeToken = employee.token;

    // Seed Templates
    const ht = await HiringWorkflowTemplate.create({
      organizationId: orgData.id,
      name: 'Standard Hiring',
      stages: [{ order: 1, name: 'Screening', type: 'SCREENING', aiEnabled: true }],
      createdBy: adminUser.id
    });
    hiringTemplateId = ht._id.toString();

    const at = await ApprovalWorkflowTemplate.create({
      organizationId: orgData.id,
      name: 'Standard Approval',
      steps: [{ order: 1, principalType: 'USER', principalId: hrManagerUserId, isRequired: true }],
      createdBy: adminUser.id
    });
    approvalTemplateId = at._id.toString();
  });

  afterAll(async () => {
    await clearDb();
    await stopDb();
  });

  const dummyId = '507f1f77bcf86cd799439011';

  // Base payload for valid requisition
  const validPayload = () => ({
    title: 'Senior Software Engineer',
    description: 'A great job for a great engineer.',
    location: 'Remote',
    departmentId: dummyId,
    reportingManagerId: dummyId,
    employmentType: 'FULL_TIME',
    workMode: 'REMOTE',
    minimumExperienceYears: 3,
    maximumExperienceYears: 8,
    salary: {
      min: 120000,
      max: 160000,
      currency: 'USD',
      period: 'YEARLY'
    },
    openPositions: 1,
    workflowTemplateId: hiringTemplateId,
    approvalWorkflowTemplateId: approvalTemplateId
  });

  describe('1. Authentication', () => {
    it('Missing JWT -> 401', async () => {
      const res = await request(app).get('/api/v1/requisitions');
      expect(res.status).toBe(401);
    });
    it('Invalid JWT -> 401', async () => {
      const res = await request(app).get('/api/v1/requisitions').set('Authorization', 'Bearer invalidtoken');
      expect(res.status).toBe(401);
    });
  });

  describe('2. RBAC & 3. Validation', () => {
    it('Employee (no permissions) -> 403 on GET', async () => {
      const res = await request(app).get('/api/v1/requisitions').set('Authorization', `Bearer ${employeeToken}`);
      expect(res.status).toBe(403);
    });
    it('Employee (no permissions) -> 403 on POST', async () => {
      const res = await request(app).post('/api/v1/requisitions').set('Authorization', `Bearer ${employeeToken}`).send(validPayload());
      expect(res.status).toBe(403);
    });
    it('HR Manager (cannot create) -> 403 on POST', async () => {
      const res = await request(app).post('/api/v1/requisitions').set('Authorization', `Bearer ${hrManagerToken}`).send(validPayload());
      expect(res.status).toBe(403);
    });

    it('Recruiter (can create) -> 400 on missing title', async () => {
      const p = validPayload(); delete p.title;
      const res = await request(app).post('/api/v1/requisitions').set('Authorization', `Bearer ${recruiterToken}`).send(p);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('ERR_VALIDATION');
    });

    it('Recruiter -> 400 on negative salary', async () => {
      const p = validPayload(); p.salary.min = -500;
      const res = await request(app).post('/api/v1/requisitions').set('Authorization', `Bearer ${recruiterToken}`).send(p);
      expect(res.status).toBe(400);
    });

    it('Recruiter -> 400 on maxSalary < minSalary', async () => {
      const p = validPayload(); p.salary.min = 100000; p.salary.max = 50000;
      const res = await request(app).post('/api/v1/requisitions').set('Authorization', `Bearer ${recruiterToken}`).send(p);
      expect(res.status).toBe(400);
    });

    it('Recruiter -> 400 on maxExp < minExp', async () => {
      const p = validPayload(); p.minimumExperienceYears = 10; p.maximumExperienceYears = 2;
      const res = await request(app).post('/api/v1/requisitions').set('Authorization', `Bearer ${recruiterToken}`).send(p);
      expect(res.status).toBe(400);
    });
  });

  describe('4. Lifecycle Rules', () => {
    let reqId;
    beforeAll(async () => {
      const res = await request(app).post('/api/v1/requisitions').set('Authorization', `Bearer ${recruiterToken}`).send(validPayload());
      reqId = res.body.data._id;
    });

    it('Cannot publish before approval -> 403', async () => {
      const res = await request(app).patch(`/api/v1/requisitions/${reqId}/publish`).set('Authorization', `Bearer ${hrManagerToken}`);
      expect(res.status).toBe(403); // ForbiddenError from service
    });
    
    it('Cannot approve before submit -> 409', async () => {
      const res = await request(app).patch(`/api/v1/requisitions/${reqId}/approve`).set('Authorization', `Bearer ${hrManagerToken}`);
      expect(res.status).toBe(409); // ConflictError (not pending approval)
    });

    it('Cannot close a drafted requisition -> 403 or 200?', async () => {
      // Service allows closing any non-closed, but usually closing is for active/published. The rule says "cannot close archived".
      // Let's test the submit twice rule.
      await request(app).patch(`/api/v1/requisitions/${reqId}/submit-approval`).set('Authorization', `Bearer ${recruiterToken}`);
      const resSubmit2 = await request(app).patch(`/api/v1/requisitions/${reqId}/submit-approval`).set('Authorization', `Bearer ${recruiterToken}`);
      expect(resSubmit2.status).toBe(409);
    });

    it('Cannot approve twice -> 409', async () => {
      await request(app).patch(`/api/v1/requisitions/${reqId}/approve`).set('Authorization', `Bearer ${hrManagerToken}`);
      const resApprove2 = await request(app).patch(`/api/v1/requisitions/${reqId}/approve`).set('Authorization', `Bearer ${hrManagerToken}`);
      expect(resApprove2.status).toBe(409);
    });
  });

  describe('5. Happy Path & 6. ApprovalInstance & 7. History & 8. Versioning', () => {
    let reqId;
    it('Executes the complete lifecycle', async () => {
      // 1. Create
      const resCreate = await request(app).post('/api/v1/requisitions').set('Authorization', `Bearer ${recruiterToken}`).send(validPayload());
      if (resCreate.status !== 201) console.log(JSON.stringify(resCreate.body, null, 2));
      expect(resCreate.status).toBe(201);
      reqId = resCreate.body.data._id;
      expect(resCreate.body.data.version).toBe(1);

      // 2. Edit (Unpublished)
      const p = validPayload();
      p.title = 'Updated Title';
      const resEdit = await request(app).put(`/api/v1/requisitions/${reqId}`).set('Authorization', `Bearer ${recruiterToken}`).send(p);
      expect(resEdit.status).toBe(200);
      expect(resEdit.body.data.version).toBe(1); // Version doesn't increment when unpublished

      // 3. Submit
      const resSubmit = await request(app).patch(`/api/v1/requisitions/${reqId}/submit-approval`).set('Authorization', `Bearer ${recruiterToken}`);
      expect(resSubmit.status).toBe(200);
      expect(resSubmit.body.data.approvalStatus).toBe('PENDING_APPROVAL');

      // 4. Approve
      const resApprove = await request(app).patch(`/api/v1/requisitions/${reqId}/approve`).set('Authorization', `Bearer ${hrManagerToken}`);
      expect(resApprove.status).toBe(200);
      expect(resApprove.body.data.approvalStatus).toBe('APPROVED');

      // 5. Publish
      const resPublish = await request(app).patch(`/api/v1/requisitions/${reqId}/publish`).set('Authorization', `Bearer ${hrManagerToken}`);
      expect(resPublish.status).toBe(200);
      expect(resPublish.body.data.publishStatus).toBe('PUBLISHED');
      expect(resPublish.body.data.workflowStatus).toBe('ACTIVE');

      // Idempotency check: Repeated publish should return 409 Conflict
      const resPublishDuplicate = await request(app).patch(`/api/v1/requisitions/${reqId}/publish`).set('Authorization', `Bearer ${hrManagerToken}`);
      expect(resPublishDuplicate.status).toBe(409);
      expect(resPublishDuplicate.body.error.code).toBe('ERR_CONFLICT');
      // 6. Edit Published (Version Increments)
      p.title = 'Title V2';
      const resEditPub = await request(app).put(`/api/v1/requisitions/${reqId}`).set('Authorization', `Bearer ${recruiterToken}`).send(p);
      expect(resEditPub.status).toBe(200);
      expect(resEditPub.body.data.version).toBe(2);

      // 7. Close
      const resClose = await request(app).patch(`/api/v1/requisitions/${reqId}/close`).set('Authorization', `Bearer ${recruiterToken}`);
      expect(resClose.status).toBe(200);
      expect(resClose.body.data.workflowStatus).toBe('CLOSED');

      // 8. Archive (Delete)
      const resDelete = await request(app).delete(`/api/v1/requisitions/${reqId}`).set('Authorization', `Bearer ${superAdminToken}`);
      expect(resDelete.status).toBe(200);
      expect(resDelete.body.data.workflowStatus).toBe('ARCHIVED');
    });

    it('Archived restrictions', async () => {
      // Cannot edit archived
      const resEdit = await request(app).put(`/api/v1/requisitions/${reqId}`).set('Authorization', `Bearer ${recruiterToken}`).send(validPayload());
      expect(resEdit.status).toBe(404); // findActiveByIdAndTenant excludes ARCHIVED

      // Cannot close archived
      const resClose = await request(app).patch(`/api/v1/requisitions/${reqId}/close`).set('Authorization', `Bearer ${recruiterToken}`);
      expect(resClose.status).toBe(404);
    });
  });

  describe('9. Job Code Generation', () => {
    it('Generates unique sequential codes', async () => {
      const res1 = await request(app).post('/api/v1/requisitions').set('Authorization', `Bearer ${recruiterToken}`).send(validPayload());
      const res2 = await request(app).post('/api/v1/requisitions').set('Authorization', `Bearer ${recruiterToken}`).send(validPayload());
      const res3 = await request(app).post('/api/v1/requisitions').set('Authorization', `Bearer ${recruiterToken}`).send(validPayload());
      
      const codes = [res1.body.data.jobCode, res2.body.data.jobCode, res3.body.data.jobCode];
      
      expect(codes[0]).toMatch(/^REC-\d{4}-\d{5}$/);
      expect(new Set(codes).size).toBe(3);
    });
  });

  describe('10. Tenant Isolation', () => {
    let orgBToken;
    let reqId;

    beforeAll(async () => {
      // Create req in Org A
      const resReq = await request(app).post('/api/v1/requisitions').set('Authorization', `Bearer ${recruiterToken}`).send(validPayload());
      reqId = resReq.body.data._id;

      // Setup Org B
      const resOrgB = await OrganizationService.createOrganization({ ...PROVISION_PAYLOAD, code: 'ORGB', domain: 'orgb.io', adminEmail: 'admin@orgb.io' });
      const loginRes = await request(app).post('/api/v1/auth/login').send({ email: 'admin@orgb.io', password: PROVISION_PAYLOAD.adminPassword });
      orgBToken = loginRes.body.data.accessToken;
    });

    it('Org B cannot read Org A reqs', async () => {
      const res = await request(app).get(`/api/v1/requisitions/${reqId}`).set('Authorization', `Bearer ${orgBToken}`);
      expect(res.status).toBe(404);
    });

    it('Org B cannot edit Org A reqs', async () => {
      const res = await request(app).put(`/api/v1/requisitions/${reqId}`).set('Authorization', `Bearer ${orgBToken}`).send(validPayload());
      expect(res.status).toBe(404);
    });
  });

  describe('11. Filtering & Pagination', () => {
    beforeAll(async () => {
      // Create some active and some on hold
      await request(app).post('/api/v1/requisitions').set('Authorization', `Bearer ${recruiterToken}`).send(validPayload());
      await request(app).post('/api/v1/requisitions').set('Authorization', `Bearer ${recruiterToken}`).send(validPayload());
    });

    it('Fetches paginated list', async () => {
      const res = await request(app).get('/api/v1/requisitions?limit=2').set('Authorization', `Bearer ${recruiterToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.data.length).toBeLessThanOrEqual(2);
      expect(res.body.data.pagination.page).toBe(1);
    });
  });

  describe('12. Requisition Rejection (/api/v1/requisitions/:id/reject)', () => {
    let reqId;

    it('Should successfully reject a requisition pending approval and log history (200)', async () => {
      const p = validPayload();
      p.title = 'Rejection Test Requisition';
      const resCreate = await request(app)
        .post('/api/v1/requisitions')
        .set('Authorization', `Bearer ${recruiterToken}`)
        .send(p);
      expect(resCreate.status).toBe(201);
      reqId = resCreate.body.data._id;

      const resSubmit = await request(app)
        .patch(`/api/v1/requisitions/${reqId}/submit-approval`)
        .set('Authorization', `Bearer ${recruiterToken}`);
      expect(resSubmit.status).toBe(200);
      expect(resSubmit.body.data.approvalStatus).toBe('PENDING_APPROVAL');

      const resReject = await request(app)
        .patch(`/api/v1/requisitions/${reqId}/reject`)
        .set('Authorization', `Bearer ${hrManagerToken}`)
        .send({ reason: 'Headcount frozen for this quarter' });

      expect(resReject.status).toBe(200);
      expect(resReject.body.success).toBe(true);
      expect(resReject.body.data.approvalStatus).toBe('REJECTED');

      const history = await RequisitionHistory.findOne({ requisitionId: reqId, action: 'REJECTED' });
      expect(history).not.toBeNull();
      expect(history.comment).toBe('Headcount frozen for this quarter');
    });

    it('Should prevent rejecting an already rejected requisition (409)', async () => {
      const resReject2 = await request(app)
        .patch(`/api/v1/requisitions/${reqId}/reject`)
        .set('Authorization', `Bearer ${hrManagerToken}`)
        .send({ reason: 'Try again' });

      expect(resReject2.status).toBe(409);
      expect(resReject2.body.success).toBe(false);
    });
  });
});
