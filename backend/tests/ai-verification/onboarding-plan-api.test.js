import mongoose from 'mongoose';
import request from 'supertest';
import app from '../../src/app.js';
import { User } from '../../src/modules/users/models/User.js';
import { Organization } from '../../src/modules/organization/models/Organization.js';
import { Designation } from '../../src/modules/organization/models/Designation.js';
import Project from '../../src/modules/projects/models/Project.js';
import { Employee } from '../../src/modules/employees/models/Employee.js';
import { Skill } from '../../src/modules/nexus/models/Skill.js';
import { OnboardingPlan } from '../../src/modules/nexus/models/OnboardingPlan.js';
import jwt from 'jsonwebtoken';

import { MongoMemoryServer } from 'mongodb-memory-server';

describe('Phase 7A: Adaptive Onboarding Foundation', () => {
  let mongoServer;
  let org1, org2;
  let user1, user2;
  let token1, token2;
  let emp1, emp2;
  let desig1, desig2;
  let proj1, proj2;
  let skill1, skill2;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    // Clean up
    await Promise.all([
      User.deleteMany({}),
      Organization.deleteMany({}),
      Designation.deleteMany({}),
      Project.deleteMany({}),
      Employee.deleteMany({}),
      Skill.deleteMany({}),
      OnboardingPlan.deleteMany({})
    ]);

    org1 = await Organization.create({ name: 'Nexus Corp', code: 'NXC', status: 'ACTIVE' });
    org2 = await Organization.create({ name: 'Other Corp', code: 'OTC', status: 'ACTIVE' });

    user1 = await User.create({
      firstName: 'Admin',
      lastName: 'One',
      email: 'admin1@nexus.com',
      passwordHash: 'hashedpassword',
      organizationId: org1._id,
      role: 'ORG_ADMIN',
      status: 'ACTIVE'
    });

    user2 = await User.create({
      firstName: 'Admin',
      lastName: 'Two',
      email: 'admin2@other.com',
      passwordHash: 'hashedpassword',
      organizationId: org2._id,
      role: 'ORG_ADMIN',
      status: 'ACTIVE'
    });

    token1 = jwt.sign(
      { userId: user1._id, organizationId: org1._id, email: user1.email, role: 'ORG_ADMIN' },
      process.env.JWT_ACCESS_SECRET || 'dev-access-secret',
      { expiresIn: '1h' }
    );
    token2 = jwt.sign(
      { userId: user2._id, organizationId: org2._id, email: user2.email, role: 'ORG_ADMIN' },
      process.env.JWT_ACCESS_SECRET || 'dev-access-secret',
      { expiresIn: '1h' }
    );

    // Create designations
    const deptId = new mongoose.Types.ObjectId();
    desig1 = await Designation.create({ organizationId: org1._id, title: 'Engineer', code: 'ENG1', level: 1, defaultDepartmentId: deptId });
    desig2 = await Designation.create({ organizationId: org2._id, title: 'Engineer', code: 'ENG2', level: 1, defaultDepartmentId: deptId });

    // Create projects
    proj1 = await Project.create({ organizationId: org1._id, name: 'Project 1', status: 'ACTIVE', type: 'CLIENT' });
    proj2 = await Project.create({ organizationId: org2._id, name: 'Project 2', status: 'ACTIVE', type: 'CLIENT' });

    // Create employees
    const locId = new mongoose.Types.ObjectId();
    const shiftId = new mongoose.Types.ObjectId();

    emp1 = await Employee.create({
      organizationId: org1._id,
      employeeCode: 'EMP001',
      firstName: 'John',
      lastName: 'Doe',
      workEmail: 'john@nexus.com',
      departmentId: deptId,
      designationId: desig1._id,
      locationId: locId,
      shiftId: shiftId,
      joiningDate: new Date()
    });

    emp2 = await Employee.create({
      organizationId: org2._id,
      employeeCode: 'EMP002',
      firstName: 'Jane',
      lastName: 'Doe',
      workEmail: 'jane@other.com',
      departmentId: deptId,
      designationId: desig2._id,
      locationId: locId,
      shiftId: shiftId,
      joiningDate: new Date()
    });

    // Create skills
    skill1 = await Skill.create({ organizationId: org1._id, canonicalName: 'React', normalizedName: 'react' });
    skill2 = await Skill.create({ organizationId: org2._id, canonicalName: 'React', normalizedName: 'react' });
  });

  afterAll(async () => {
    await mongoose.connection.close();
    if (mongoServer) await mongoServer.stop();
  });

  afterEach(async () => {
    await OnboardingPlan.deleteMany({});
  });

  describe('Tenant Isolation & Validation', () => {
    it('should reject cross-tenant employee references', async () => {
      const res = await request(app)
        .post('/api/v1/nexus/onboarding/plans')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          employeeId: emp2._id, // Belongs to org2
          title: 'New Plan',
          source: 'MANUAL'
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('Employee not found in organization');
    });

    it('should reject cross-tenant designation references', async () => {
      const res = await request(app)
        .post('/api/v1/nexus/onboarding/plans')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          employeeId: emp1._id,
          title: 'New Plan',
          targetDesignationId: desig2._id, // org2
          source: 'MANUAL'
        });

      expect(res.status).toBe(404);
      expect(res.body.error.message).toContain('Target Designation not found in organization');
    });

    it('should reject cross-tenant project references', async () => {
      const res = await request(app)
        .post('/api/v1/nexus/onboarding/plans')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          employeeId: emp1._id,
          title: 'New Plan',
          targetProjectId: proj2._id, // org2
          source: 'MANUAL'
        });

      expect(res.status).toBe(404);
      expect(res.body.error.message).toContain('Target Project not found in organization');
    });

    it('should reject cross-tenant skill references', async () => {
      const res = await request(app)
        .post('/api/v1/nexus/onboarding/plans')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          employeeId: emp1._id,
          title: 'New Plan',
          source: 'MANUAL',
          skillGapSnapshot: [
            { skillId: skill2._id, skillName: 'React', status: 'MISSING' } // org2 skill
          ]
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('One or more referenced skills do not belong to the organization');
    });
  });

  describe('Core Onboarding Functionality', () => {
    let createdPlanId;

    it('should create a draft onboarding plan and persist skill gap snapshot', async () => {
      const payload = {
        employeeId: emp1._id,
        title: 'React Training Plan',
        status: 'DRAFT',
        targetDesignationId: desig1._id,
        targetProjectId: proj1._id,
        source: 'SKILL_GAP',
        skillGapSnapshot: [
          { skillId: skill1._id, skillName: 'React', status: 'MISSING' }
        ],
        modules: [
          {
            title: 'Basics',
            order: 1,
            tasks: [
              { title: 'Read Docs', type: 'LEARNING', order: 1, status: 'PENDING' },
              { title: 'Build App', type: 'PRACTICE', order: 2, status: 'COMPLETED' }
            ]
          }
        ]
      };

      const res = await request(app)
        .post('/api/v1/nexus/onboarding/plans')
        .set('Authorization', `Bearer ${token1}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.organizationId).toBe(org1._id.toString());
      expect(res.body.data.status).toBe('DRAFT');
      expect(res.body.data.skillGapSnapshot.length).toBe(1);
      expect(res.body.data.skillGapSnapshot[0].skillId.toString()).toBe(skill1._id.toString());
      
      // Progress calculation check: 1 completed / 2 total = 50%
      expect(res.body.data.progress).toBe(50);
      expect(res.body.data.modules[0].progress).toBe(50);

      createdPlanId = res.body.data._id;
    });

    it('should list employee plans', async () => {
      // Create a plan first
      await request(app)
        .post('/api/v1/nexus/onboarding/plans')
        .set('Authorization', `Bearer ${token1}`)
        .send({ employeeId: emp1._id, title: 'Plan 1', source: 'MANUAL' });

      const res = await request(app)
        .get(`/api/v1/nexus/employees/${emp1._id}/onboarding/plans`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should retrieve a specific plan', async () => {
      // Re-create the specific plan
      const createRes = await request(app)
        .post('/api/v1/nexus/onboarding/plans')
        .set('Authorization', `Bearer ${token1}`)
        .send({ employeeId: emp1._id, title: 'Plan 2', source: 'MANUAL' });

      const res = await request(app)
        .get(`/api/v1/nexus/onboarding/plans/${createRes.body.data._id}`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Plan 2');
      expect(res.body.data.employeeId._id).toBe(emp1._id.toString());
    });

    it('should update plan status validly', async () => {
      const createRes = await request(app)
        .post('/api/v1/nexus/onboarding/plans')
        .set('Authorization', `Bearer ${token1}`)
        .send({ employeeId: emp1._id, title: 'Plan 3', source: 'MANUAL' }); // DRAFT by default

      const res = await request(app)
        .patch(`/api/v1/nexus/onboarding/plans/${createRes.body.data._id}/status`)
        .set('Authorization', `Bearer ${token1}`)
        .send({ status: 'ACTIVE' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('ACTIVE');
      expect(res.body.data.startedAt).not.toBeNull();
    });
    
    it('should calculate 100% progress and auto-complete when all tasks are complete', async () => {
      const payload = {
        employeeId: emp1._id,
        title: 'Fast Plan',
        status: 'ACTIVE',
        source: 'MANUAL',
        modules: [
          {
            title: 'Basics',
            order: 1,
            tasks: [
              { title: 'Read Docs', type: 'LEARNING', order: 1, status: 'COMPLETED' },
              { title: 'Build App', type: 'PRACTICE', order: 2, status: 'COMPLETED' }
            ]
          }
        ]
      };

      const res = await request(app)
        .post('/api/v1/nexus/onboarding/plans')
        .set('Authorization', `Bearer ${token1}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      
      // Progress calculation check: 2 completed / 2 total = 100%
      expect(res.body.data.progress).toBe(100);
      expect(res.body.data.modules[0].progress).toBe(100);
      // Because we saved it with all completed AND it was ACTIVE, it should have auto-completed
      expect(res.body.data.status).toBe('COMPLETED');
      expect(res.body.data.completedAt).not.toBeNull();
    });
  });
});
