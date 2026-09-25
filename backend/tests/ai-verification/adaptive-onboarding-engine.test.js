import mongoose from 'mongoose';
import request from 'supertest';
import app from '../../src/app.js';
import { User } from '../../src/modules/users/models/User.js';
import { Organization } from '../../src/modules/organization/models/Organization.js';
import { Employee } from '../../src/modules/employees/models/Employee.js';
import { Skill } from '../../src/modules/nexus/models/Skill.js';
import { OnboardingPlan } from '../../src/modules/nexus/models/OnboardingPlan.js';
import jwt from 'jsonwebtoken';
import { MongoMemoryServer } from 'mongodb-memory-server';

describe('Phase 7C: Adaptive Onboarding Engine', () => {
  let mongoServer;
  let org1, org2;
  let user1, user2;
  let token1, token2;
  let emp1, emp2;
  let skillK8s, skillAws;
  let plan1;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    // Clean up
    await Promise.all([
      User.deleteMany({}),
      Organization.deleteMany({}),
      Employee.deleteMany({}),
      Skill.deleteMany({}),
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
    skillK8s = await Skill.create({ organizationId: org1._id, canonicalName: 'Kubernetes', normalizedName: 'kubernetes', category: 'CLOUD_DEVOPS' });
    skillAws = await Skill.create({ organizationId: org1._id, canonicalName: 'AWS', normalizedName: 'aws', category: 'CLOUD_DEVOPS' });

    // Create employees
    const locId = new mongoose.Types.ObjectId();
    const shiftId = new mongoose.Types.ObjectId();
    const deptId = new mongoose.Types.ObjectId();

    emp1 = await Employee.create({
      organizationId: org1._id,
      employeeCode: 'EMP001',
      firstName: 'John',
      lastName: 'Doe',
      workEmail: 'john@nexus.com',
      departmentId: deptId,
      designationId: new mongoose.Types.ObjectId(),
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
      designationId: new mongoose.Types.ObjectId(),
      locationId: locId,
      shiftId: shiftId,
      joiningDate: new Date(),
      status: 'ACTIVE'
    });
  });

  beforeEach(async () => {
    await OnboardingPlan.deleteMany({});
    
    // Create a base deterministic plan
    plan1 = await OnboardingPlan.create({
      organizationId: org1._id,
      employeeId: emp1._id,
      title: 'Kubernetes & AWS Onboarding',
      status: 'ACTIVE',
      source: 'SKILL_GAP',
      createdBy: user1._id,
      modules: [
        {
          title: 'Kubernetes',
          skillIds: [skillK8s._id],
          order: 1,
          status: 'PENDING',
          tasks: [
            { title: 'Learn Kubernetes', type: 'LEARNING', skillIds: [skillK8s._id], order: 1, status: 'PENDING' },
            { title: 'Practice Kubernetes', type: 'PRACTICE', skillIds: [skillK8s._id], order: 2, status: 'PENDING' },
            { title: 'Assess Kubernetes', type: 'ASSESSMENT', skillIds: [skillK8s._id], order: 3, status: 'PENDING' }
          ]
        },
        {
          title: 'AWS',
          skillIds: [skillAws._id],
          order: 2,
          status: 'PENDING',
          tasks: [
            { title: 'Learn AWS', type: 'LEARNING', skillIds: [skillAws._id], order: 1, status: 'PENDING' }
          ]
        }
      ]
    });
  });

  afterAll(async () => {
    await mongoose.connection.close();
    if (mongoServer) await mongoServer.stop();
  });

  describe('Isolation and Validation', () => {
    it('should reject next-action for DRAFT plan', async () => {
      plan1.status = 'DRAFT';
      await plan1.save();
      
      const res = await request(app)
        .get(`/api/v1/nexus/onboarding/plans/${plan1._id}/next-action`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body.nextAction).toBeNull();
      expect(res.body.reason).toBe('PLAN_IS_DRAFT');
    });

    it('should reject task completion for DRAFT plan', async () => {
      plan1.status = 'DRAFT';
      await plan1.save();
      const taskId = plan1.modules[0].tasks[0]._id;
      
      const res = await request(app)
        .post(`/api/v1/nexus/onboarding/plans/${plan1._id}/tasks/${taskId}/complete`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(400);
    });

    it('should reject task completion on cross-tenant plan', async () => {
      const taskId = plan1.modules[0].tasks[0]._id;
      const res = await request(app)
        .post(`/api/v1/nexus/onboarding/plans/${plan1._id}/tasks/${taskId}/complete`)
        .set('Authorization', `Bearer ${token2}`);

      expect(res.status).toBe(404);
    });
  });

  describe('Adaptive Progression - Full Kubernetes Scenario', () => {
    it('should progress through tasks and handle remediation correctly', async () => {
      const k8sModuleId = plan1.modules[0]._id;
      let learnTaskId = plan1.modules[0].tasks[0]._id;
      let practiceTaskId = plan1.modules[0].tasks[1]._id;
      let assessTaskId = plan1.modules[0].tasks[2]._id;

      // 1. Initial State: Learn is the next action
      let actionRes = await request(app)
        .get(`/api/v1/nexus/onboarding/plans/${plan1._id}/next-action`)
        .set('Authorization', `Bearer ${token1}`);
        
      expect(actionRes.status).toBe(200);
      expect(actionRes.body.nextAction.taskId.toString()).toBe(learnTaskId.toString());
      expect(actionRes.body.nextAction.type).toBe('LEARNING');

      // 2. Complete Learning
      let completeRes = await request(app)
        .post(`/api/v1/nexus/onboarding/plans/${plan1._id}/tasks/${learnTaskId}/complete`)
        .set('Authorization', `Bearer ${token1}`);
      expect(completeRes.status).toBe(200);
      
      // Verify Practice is next
      actionRes = await request(app)
        .get(`/api/v1/nexus/onboarding/plans/${plan1._id}/next-action`)
        .set('Authorization', `Bearer ${token1}`);
      expect(actionRes.body.nextAction.taskId.toString()).toBe(practiceTaskId.toString());
      
      // 3. Complete Practice
      await request(app)
        .post(`/api/v1/nexus/onboarding/plans/${plan1._id}/tasks/${practiceTaskId}/complete`)
        .set('Authorization', `Bearer ${token1}`);
        
      // Verify Assessment is next
      actionRes = await request(app)
        .get(`/api/v1/nexus/onboarding/plans/${plan1._id}/next-action`)
        .set('Authorization', `Bearer ${token1}`);
      expect(actionRes.body.nextAction.taskId.toString()).toBe(assessTaskId.toString());

      // 4. Fail Assessment -> Should create remediation
      completeRes = await request(app)
        .post(`/api/v1/nexus/onboarding/plans/${plan1._id}/tasks/${assessTaskId}/complete`)
        .set('Authorization', `Bearer ${token1}`)
        .send({ outcome: 'failed' });
      
      expect(completeRes.status).toBe(200);
      const updatedPlan = completeRes.body.data;
      const updatedK8sModule = updatedPlan.modules.find(m => m._id === k8sModuleId.toString());
      
      // Check tasks logic
      expect(updatedK8sModule.tasks.length).toBe(4);
      expect(updatedK8sModule.tasks[2].type).toBe('PRACTICE');
      expect(updatedK8sModule.tasks[2].title).toContain('Remediation');
      const remediationTaskId = updatedK8sModule.tasks[2]._id;

      // 5. Verify Remediation is next action
      actionRes = await request(app)
        .get(`/api/v1/nexus/onboarding/plans/${plan1._id}/next-action`)
        .set('Authorization', `Bearer ${token1}`);
      expect(actionRes.body.nextAction.taskId.toString()).toBe(remediationTaskId.toString());

      // 6. Complete Remediation
      await request(app)
        .post(`/api/v1/nexus/onboarding/plans/${plan1._id}/tasks/${remediationTaskId}/complete`)
        .set('Authorization', `Bearer ${token1}`);

      // 7. Verify Assessment is next again
      actionRes = await request(app)
        .get(`/api/v1/nexus/onboarding/plans/${plan1._id}/next-action`)
        .set('Authorization', `Bearer ${token1}`);
      expect(actionRes.body.nextAction.taskId.toString()).toBe(assessTaskId.toString());

      // 8. Pass Assessment
      completeRes = await request(app)
        .post(`/api/v1/nexus/onboarding/plans/${plan1._id}/tasks/${assessTaskId}/complete`)
        .set('Authorization', `Bearer ${token1}`)
        .send({ outcome: 'passed' });
        
      const planAfterModule1 = completeRes.body.data;
      const completedK8sModule = planAfterModule1.modules.find(m => m._id === k8sModuleId.toString());
      expect(completedK8sModule.status).toBe('COMPLETED');
      expect(completedK8sModule.progress).toBe(100);

      // 9. Verify next module (AWS) is actionable
      actionRes = await request(app)
        .get(`/api/v1/nexus/onboarding/plans/${plan1._id}/next-action`)
        .set('Authorization', `Bearer ${token1}`);
      
      const awsTaskId = planAfterModule1.modules[1].tasks[0]._id;
      expect(actionRes.body.nextAction.taskId.toString()).toBe(awsTaskId.toString());
      expect(actionRes.body.nextAction.title).toBe('Learn AWS');
      
      // 10. Complete last task -> Plan COMPLETED
      completeRes = await request(app)
        .post(`/api/v1/nexus/onboarding/plans/${plan1._id}/tasks/${awsTaskId}/complete`)
        .set('Authorization', `Bearer ${token1}`);
        
      const finalPlan = completeRes.body.data;
      expect(finalPlan.status).toBe('COMPLETED');
      expect(finalPlan.progress).toBe(100);

      actionRes = await request(app)
        .get(`/api/v1/nexus/onboarding/plans/${plan1._id}/next-action`)
        .set('Authorization', `Bearer ${token1}`);
      expect(actionRes.body.nextAction).toBeNull();
      expect(actionRes.body.reason).toBe('ONBOARDING_COMPLETED');
    });
  });
});
