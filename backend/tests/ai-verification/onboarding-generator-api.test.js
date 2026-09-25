import mongoose from 'mongoose';
import request from 'supertest';
import app from '../../src/app.js';
import { User } from '../../src/modules/users/models/User.js';
import { Organization } from '../../src/modules/organization/models/Organization.js';
import { Designation } from '../../src/modules/organization/models/Designation.js';
import Project from '../../src/modules/projects/models/Project.js';
import { Employee } from '../../src/modules/employees/models/Employee.js';
import { Skill } from '../../src/modules/nexus/models/Skill.js';
import EmployeeProfileExtended from '../../src/modules/nexus/models/EmployeeProfileExtended.js';
import { OnboardingPlan } from '../../src/modules/nexus/models/OnboardingPlan.js';
import jwt from 'jsonwebtoken';
import { MongoMemoryServer } from 'mongodb-memory-server';

describe('Phase 7B: Onboarding Plan Generator', () => {
  let mongoServer;
  let org1, org2;
  let user1, user2;
  let token1, token2;
  let emp1, emp2;
  let desig1, desig2;
  let proj1, proj2;
  let skillJava, skillKafka, skillPg, skillK8s, skillAws;

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
      EmployeeProfileExtended.deleteMany({}),
      OnboardingPlan.deleteMany({})
    ]);

    org1 = await Organization.create({ name: 'Nexus Corp', code: 'NXC', status: 'ACTIVE' });
    org2 = await Organization.create({ name: 'Other Corp', code: 'OTC', status: 'ACTIVE' });

    user1 = await User.create({
      organizationId: org1._id,
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@nexus.test',
      passwordHash: 'hashed',
      role: 'ORG_ADMIN',
      status: 'ACTIVE'
    });

    user2 = await User.create({
      organizationId: org2._id,
      firstName: 'Other',
      lastName: 'Admin',
      email: 'admin@other.test',
      passwordHash: 'hashed',
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

    // Create canonical skills
    skillJava = await Skill.create({ organizationId: org1._id, canonicalName: 'Java', normalizedName: 'java', category: 'BACKEND' });
    skillKafka = await Skill.create({ organizationId: org1._id, canonicalName: 'Kafka', normalizedName: 'kafka', category: 'DATA_AI' });
    skillPg = await Skill.create({ organizationId: org1._id, canonicalName: 'PostgreSQL', normalizedName: 'postgresql', category: 'DATABASE' });
    skillK8s = await Skill.create({ organizationId: org1._id, canonicalName: 'Kubernetes', normalizedName: 'kubernetes', category: 'CLOUD_DEVOPS' });
    skillAws = await Skill.create({ organizationId: org1._id, canonicalName: 'AWS', normalizedName: 'aws', category: 'CLOUD_DEVOPS' });

    // Create designations
    const deptId = new mongoose.Types.ObjectId();
    desig1 = await Designation.create({
      organizationId: org1._id,
      title: 'Backend Engineer',
      code: 'BE1',
      level: 1,
      defaultDepartmentId: deptId,
      requiredSkillIds: [skillJava._id, skillKafka._id, skillPg._id, skillK8s._id]
    });

    desig2 = await Designation.create({
      organizationId: org2._id,
      title: 'Backend Engineer',
      code: 'BE2',
      level: 1,
      defaultDepartmentId: deptId
    });

    // Create projects
    proj1 = await Project.create({
      organizationId: org1._id,
      name: 'Cloud Migration',
      status: 'ACTIVE',
      type: 'CLIENT',
      requiredSkillIds: [skillJava._id, skillAws._id]
    });

    proj2 = await Project.create({
      organizationId: org2._id,
      name: 'Other Project',
      status: 'ACTIVE',
      type: 'CLIENT'
    });

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
      joiningDate: new Date(),
      status: 'ACTIVE'
    });

    emp2 = await Employee.create({
      organizationId: org2._id,
      employeeCode: 'EMP002',
      firstName: 'Jane',
      lastName: 'Smith',
      workEmail: 'jane@other.com',
      departmentId: deptId,
      designationId: desig2._id,
      locationId: locId,
      shiftId: shiftId,
      joiningDate: new Date(),
      status: 'ACTIVE'
    });

    // Provide John with Java, Kafka, PostgreSQL
    await EmployeeProfileExtended.create({
      organizationId: org1._id,
      employeeId: emp1._id,
      employeeSkills: [
        { skillId: skillJava._id, proficiency: 'Intermediate', source: 'SELF_REPORTED' },
        { skillId: skillKafka._id, proficiency: 'Beginner', source: 'SELF_REPORTED' },
        { skillId: skillPg._id, proficiency: 'Advanced', source: 'SELF_REPORTED' }
      ]
    });
    
    await EmployeeProfileExtended.create({
      organizationId: org2._id,
      employeeId: emp2._id,
      employeeSkills: []
    });
  });

  afterAll(async () => {
    await mongoose.connection.close();
    if (mongoServer) await mongoServer.stop();
  });

  afterEach(async () => {
    await OnboardingPlan.deleteMany({});
  });

  describe('Validation & Isolation', () => {
    it('should reject without designationId or projectId', async () => {
      const res = await request(app)
        .post(`/api/v1/nexus/employees/${emp1._id}/onboarding/plans/generate`)
        .set('Authorization', `Bearer ${token1}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('At least one of designationId or projectId must be provided.');
    });

    it('should reject cross-tenant employee generation', async () => {
      const res = await request(app)
        .post(`/api/v1/nexus/employees/${emp2._id}/onboarding/plans/generate`)
        .set('Authorization', `Bearer ${token1}`)
        .send({ designationId: desig1._id });

      expect(res.status).toBe(404);
      expect(res.body.error.message).toContain('Employee extended profile not found or does not belong to this organization.');
    });

    it('should reject cross-tenant designation', async () => {
      const res = await request(app)
        .post(`/api/v1/nexus/employees/${emp1._id}/onboarding/plans/generate`)
        .set('Authorization', `Bearer ${token1}`)
        .send({ designationId: desig2._id });

      expect(res.status).toBe(404);
      expect(res.body.error.message).toContain('Designation not found or does not belong to this organization.');
    });

    it('should reject cross-tenant project', async () => {
      const res = await request(app)
        .post(`/api/v1/nexus/employees/${emp1._id}/onboarding/plans/generate`)
        .set('Authorization', `Bearer ${token1}`)
        .send({ projectId: proj2._id });

      expect(res.status).toBe(404);
      expect(res.body.error.message).toContain('Project not found or does not belong to this organization.');
    });
  });

  describe('Generator Behavior', () => {
    it('should generate a role-based plan (only missing K8s)', async () => {
      const res = await request(app)
        .post(`/api/v1/nexus/employees/${emp1._id}/onboarding/plans/generate`)
        .set('Authorization', `Bearer ${token1}`)
        .send({ designationId: desig1._id });

      expect(res.status).toBe(201);
      const plan = res.body.data;
      
      expect(plan.status).toBe('DRAFT');
      expect(plan.source).toBe('SKILL_GAP');
      expect(plan.title).toBe('Onboarding: Backend Engineer');
      expect(plan.modules.length).toBe(1); // Only Kubernetes is missing
      expect(plan.modules[0].title).toBe('Kubernetes');
      expect(plan.modules[0].skillIds[0].toString()).toBe(skillK8s._id.toString());
      expect(plan.modules[0].tasks.length).toBe(3);
      expect(plan.modules[0].tasks[0].type).toBe('LEARNING');
      expect(plan.modules[0].tasks[1].type).toBe('PRACTICE');
      expect(plan.modules[0].tasks[2].type).toBe('ASSESSMENT');

      // Verify Snapshot
      expect(plan.skillGapSnapshot.length).toBe(4); // 1 missing, 3 matched
      const k8sSnap = plan.skillGapSnapshot.find(s => s.skillId.toString() === skillK8s._id.toString());
      expect(k8sSnap.status).toBe('MISSING');
    });

    it('should generate a project-based plan (only missing AWS)', async () => {
      const res = await request(app)
        .post(`/api/v1/nexus/employees/${emp1._id}/onboarding/plans/generate`)
        .set('Authorization', `Bearer ${token1}`)
        .send({ projectId: proj1._id });

      expect(res.status).toBe(201);
      const plan = res.body.data;
      
      expect(plan.status).toBe('DRAFT');
      expect(plan.title).toBe('Onboarding: Cloud Migration');
      expect(plan.modules.length).toBe(1); // Only AWS is missing for this project
      expect(plan.modules[0].title).toBe('AWS');
      
      const awsSnap = plan.skillGapSnapshot.find(s => s.skillId.toString() === skillAws._id.toString());
      expect(awsSnap.status).toBe('MISSING');
    });

    it('should generate a combined role+project plan (missing K8s and AWS)', async () => {
      const res = await request(app)
        .post(`/api/v1/nexus/employees/${emp1._id}/onboarding/plans/generate`)
        .set('Authorization', `Bearer ${token1}`)
        .send({ designationId: desig1._id, projectId: proj1._id });

      expect(res.status).toBe(201);
      const plan = res.body.data;
      
      expect(plan.title).toBe('Onboarding: Backend Engineer & Cloud Migration');
      expect(plan.modules.length).toBe(2); // K8s and AWS
      expect(plan.modules.find(m => m.title === 'Kubernetes')).toBeDefined();
      expect(plan.modules.find(m => m.title === 'AWS')).toBeDefined();
      
      // Duplicate Java shouldn't create two modules
      expect(plan.modules.find(m => m.title === 'Java')).toBeUndefined();
    });
  });
});
