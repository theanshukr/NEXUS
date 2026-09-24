import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import request from 'supertest';
import app from '#@/app.js';
import { startDb, clearDb, stopDb } from '../setup/db.js';
import OrganizationService from '#@/modules/organization/services/OrganizationService.js';
import Role from '#@/modules/roles/models/Role.js';
import User from '#@/modules/users/models/User.js';
import UserRole from '#@/modules/roles/models/UserRole.js';
import PERMISSIONS from '#@/core/constants/permissions/index.js';
import Department from '#@/modules/departments/models/Department.js';
import Employee from '#@/modules/employees/models/Employee.js';
import mongoose from 'mongoose';

describe('API – Employee Endpoints (/api/v1/employees)', () => {
  let orgData;
  let adminUser;
  let superAdminToken;
  let defaultDepartmentId;

  const PROVISION_PAYLOAD = {
    name: 'NexusOps Employee Corp',
    code: 'EMPC',
    domain: 'empc.io',
    adminEmail: 'admin@empc.io',
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

    const dept = await Department.findOne({ organizationId: orgData.id });
    defaultDepartmentId = dept._id.toString();
  }

  function getValidPayload(overrides = {}) {
    const dummyId = new mongoose.Types.ObjectId().toString();
    return {
      employeeCode: `EMP-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
      firstName: 'John',
      lastName: 'Doe',
      workEmail: `emp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}@empc.io`,
      departmentId: defaultDepartmentId,
      designationId: dummyId,
      locationId: dummyId,
      shiftId: dummyId,
      joiningDate: '2026-01-01T00:00:00.000Z',
      ...overrides
    };
  }

  describe('POST /api/v1/employees (Create Employee)', () => {
    it('creates a new employee with valid payload and permissions', async () => {
      await setupTenantAndLogin();

      const payload = getValidPayload({ employeeCode: 'EMP-001' });

      const res = await request(app)
        .post('/api/v1/employees')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.employeeCode).toBe('EMP-001');
      expect(res.body.data.status).toBe('ONBOARDING');
      expect(res.body.data.departmentId).toBe(defaultDepartmentId);
    });

    it('returns 409 Conflict if employeeCode already exists in tenant', async () => {
      await setupTenantAndLogin();

      const payload = getValidPayload({ employeeCode: 'EMP-001' });

      await request(app)
        .post('/api/v1/employees')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send(payload);

      const res = await request(app)
        .post('/api/v1/employees')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ ...payload, workEmail: 'another@empc.io', firstName: 'Jane' });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ERR_CONFLICT');
    });
  });

  describe('GET /api/v1/employees (List Employees)', () => {
    it('lists employees and filters out archived employees by default', async () => {
      await setupTenantAndLogin();

      const emp1 = await request(app)
        .post('/api/v1/employees')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send(getValidPayload({ employeeCode: 'EMP-001', firstName: 'Active' }));

      const emp2 = await request(app)
        .post('/api/v1/employees')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send(getValidPayload({ employeeCode: 'EMP-002', firstName: 'Archived' }));

      // Archive second employee
      await request(app)
        .post(`/api/v1/employees/${emp2.body.data._id}/archive`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ reason: 'Left' });

      const listRes = await request(app)
        .get('/api/v1/employees')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.data.data).toHaveLength(1);
      expect(listRes.body.data.data[0].employeeCode).toBe('EMP-001');
    });
  });

  describe('PATCH /api/v1/employees/:id/profile (Update Profile)', () => {
    it('updates allowed profile metadata and ignores/rejects structural fields via strict Zod schema', async () => {
      await setupTenantAndLogin();

      const createRes = await request(app)
        .post('/api/v1/employees')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send(getValidPayload({ employeeCode: 'EMP-001' }));

      const empId = createRes.body.data._id;

      // Valid profile update
      const updateRes = await request(app)
        .patch(`/api/v1/employees/${empId}/profile`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          firstName: 'Jonathan',
          lastName: 'Smith'
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.firstName).toBe('Jonathan');
      expect(updateRes.body.data.lastName).toBe('Smith');

      // Invalid structural update attempt
      const failRes = await request(app)
        .patch(`/api/v1/employees/${empId}/profile`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          status: 'ACTIVE',
          departmentId: defaultDepartmentId
        });

      expect(failRes.status).toBe(400);
      expect(failRes.body.error.code).toBe('ERR_VALIDATION');
    });
  });

  describe('PATCH /api/v1/employees/:id/status (Change Status)', () => {
    it('enforces status transition matrix (ONBOARDING -> INVITED is valid, ONBOARDING -> RESIGNED is invalid)', async () => {
      await setupTenantAndLogin();

      const createRes = await request(app)
        .post('/api/v1/employees')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send(getValidPayload({ employeeCode: 'EMP-001' }));

      const empId = createRes.body.data._id;

      // Invalid transition
      const failRes = await request(app)
        .put(`/api/v1/employees/${empId}/status`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ status: 'RESIGNED' });

      expect(failRes.status).toBe(400);
      expect(failRes.body.error.code).toBe('ERR_VALIDATION');

      // Valid transition
      const successRes = await request(app)
        .put(`/api/v1/employees/${empId}/status`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ status: 'INVITED' });

      expect(successRes.status).toBe(200);
      expect(successRes.body.data.status).toBe('INVITED');
    });
  });

  describe('POST /api/v1/employees/:id/archive & /restore', () => {
    it('archives and restores an employee without altering their business status', async () => {
      await setupTenantAndLogin();

      const createRes = await request(app)
        .post('/api/v1/employees')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send(getValidPayload({ employeeCode: 'EMP-001' }));

      const empId = createRes.body.data._id;

      // Archive
      const archiveRes = await request(app)
        .post(`/api/v1/employees/${empId}/archive`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ reason: 'Temporary leave' });

      expect(archiveRes.status).toBe(200);
      expect(archiveRes.body.data.archivedAt).toBeDefined();
      expect(archiveRes.body.data.status).toBe('ONBOARDING');

      // Attempt status change while archived (must fail)
      const statusRes = await request(app)
        .put(`/api/v1/employees/${empId}/status`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ status: 'INVITED' });

      expect(statusRes.status).toBe(400);

      // Restore
      const restoreRes = await request(app)
        .post(`/api/v1/employees/${empId}/restore`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({});

      expect(restoreRes.status).toBe(200);
      expect(restoreRes.body.data.archivedAt).toBeNull();
      expect(restoreRes.body.data.status).toBe('ONBOARDING');
    });
  });
});
