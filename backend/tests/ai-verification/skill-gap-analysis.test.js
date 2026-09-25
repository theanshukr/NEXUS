import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../../src/app.js';
import Organization from '../../src/modules/organization/models/Organization.js';
import User from '../../src/modules/users/models/User.js';
import Designation from '../../src/modules/organization/models/Designation.js';
import Project from '../../src/modules/projects/models/Project.js';
import EmployeeProfileExtended from '../../src/modules/nexus/models/EmployeeProfileExtended.js';
import Skill from '../../src/modules/nexus/models/Skill.js';
import jwt from 'jsonwebtoken';

let mongoServer;
let orgA_id, orgB_id;
let tokenA, tokenB;
let employeeA_id, employeeB_id, employeeC_id;
let designationA_id, designationB_id;
let projectA_id, projectB_id;
let skillJava_id, skillKafka_id, skillK8s_id, skillReact_id;

describe('Skill Gap Engine (Phase 5D)', () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    // Setup Orgs
    const orgA = await Organization.create({ name: 'Org A', domain: 'orga.com', code: 'ORGA', status: 'ACTIVE' });
    const orgB = await Organization.create({ name: 'Org B', domain: 'orgb.com', code: 'ORGB', status: 'ACTIVE' });
    orgA_id = orgA._id;
    orgB_id = orgB._id;

    // Setup Admins and Tokens
    const userA = await User.create({ organizationId: orgA_id, firstName: 'A', lastName: 'User', email: 'a@orga.com', passwordHash: 'hash', role: 'Super Admin' });
    const userB = await User.create({ organizationId: orgB_id, firstName: 'B', lastName: 'User', email: 'b@orgb.com', passwordHash: 'hash', role: 'Super Admin' });
    tokenA = jwt.sign({ userId: userA._id, organizationId: orgA_id, email: 'a@orga.com', role: 'Super Admin' }, process.env.JWT_ACCESS_SECRET || 'dev-access-secret', { expiresIn: '1h' });
    tokenB = jwt.sign({ userId: userB._id, organizationId: orgB_id, email: 'b@orgb.com', role: 'Super Admin' }, process.env.JWT_ACCESS_SECRET || 'dev-access-secret', { expiresIn: '1h' });

    // Setup Skills in Org A
    const skills = await Skill.create([
      { organizationId: orgA_id, canonicalName: 'Java', normalizedName: 'java', category: 'BACKEND' },
      { organizationId: orgA_id, canonicalName: 'Apache Kafka', normalizedName: 'apache kafka', category: 'BACKEND' },
      { organizationId: orgA_id, canonicalName: 'Kubernetes', normalizedName: 'kubernetes', category: 'CLOUD_DEVOPS' },
      { organizationId: orgA_id, canonicalName: 'React', normalizedName: 'react', category: 'FRONTEND' }
    ]);
    skillJava_id = skills[0]._id;
    skillKafka_id = skills[1]._id;
    skillK8s_id = skills[2]._id;
    skillReact_id = skills[3]._id;

    // Setup Designation (Role)
    const desigA = await Designation.create({
      organizationId: orgA_id,
      code: 'BE1',
      title: 'Backend Engineer',
      requiredSkillIds: [skillJava_id, skillKafka_id]
    });
    designationA_id = desigA._id;

    const desigB = await Designation.create({
      organizationId: orgB_id,
      code: 'BE2',
      title: 'Backend Engineer Org B',
      requiredSkillIds: []
    });
    designationB_id = desigB._id;

    // Setup Project
    const projA = await Project.create({
      organizationId: orgA_id,
      name: 'Migration to Cloud',
      requiredSkillIds: [skillJava_id, skillK8s_id] // Notice Java overlaps with Designation
    });
    projectA_id = projA._id;

    const projB = await Project.create({
      organizationId: orgB_id,
      name: 'Org B Secret Project',
      requiredSkillIds: []
    });
    projectB_id = projB._id;

    // Setup Employee A (100% Coverage for Designation)
    const empAId = new mongoose.Types.ObjectId();
    await mongoose.connection.collection('employees').insertOne({ _id: empAId, organizationId: orgA_id, firstName: 'Emp', lastName: 'A', status: 'ACTIVE' });
    employeeA_id = empAId;
    await EmployeeProfileExtended.create({
      organizationId: orgA_id,
      employeeId: employeeA_id,
      employeeSkills: [
        { skillId: skillJava_id, proficiency: 'Expert' },
        { skillId: skillKafka_id, proficiency: 'Intermediate' }
      ]
    });

    // Setup Employee B (0% Coverage)
    const empBId = new mongoose.Types.ObjectId();
    await mongoose.connection.collection('employees').insertOne({ _id: empBId, organizationId: orgA_id, firstName: 'Emp', lastName: 'B', status: 'ACTIVE' });
    employeeB_id = empBId;
    await EmployeeProfileExtended.create({
      organizationId: orgA_id,
      employeeId: employeeB_id,
      employeeSkills: [
        { skillId: skillReact_id, proficiency: 'Beginner' }
      ]
    });

    // Setup Employee C (Partial Coverage)
    const empCId = new mongoose.Types.ObjectId();
    await mongoose.connection.collection('employees').insertOne({ _id: empCId, organizationId: orgA_id, firstName: 'Emp', lastName: 'C', status: 'ACTIVE' });
    employeeC_id = empCId;
    await EmployeeProfileExtended.create({
      organizationId: orgA_id,
      employeeId: employeeC_id,
      employeeSkills: [
        { skillId: skillJava_id, proficiency: 'Intermediate' }
      ]
    });

  }, 60000);

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) await mongoServer.stop();
  });

  describe('Role Gap Analysis', () => {
    it('Employee A with all required skills -> 100% coverage', async () => {
      const res = await request(app)
        .get(`/api/v1/nexus/employees/${employeeA_id}/skill-gap?designationId=${designationA_id}`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.coverage.percentage).toBe(100);
      expect(res.body.matchedSkills).toHaveLength(2);
      expect(res.body.skillGaps).toHaveLength(0);
      
      // Verify proficiency respects existing data
      const javaMatch = res.body.matchedSkills.find(s => s.skill === 'Java');
      expect(javaMatch.employeeProficiency).toBe('Expert');
    });

    it('Employee B with none -> 0% coverage', async () => {
      const res = await request(app)
        .get(`/api/v1/nexus/employees/${employeeB_id}/skill-gap?designationId=${designationA_id}`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.coverage.percentage).toBe(0);
      expect(res.body.matchedSkills).toHaveLength(0);
      expect(res.body.skillGaps).toHaveLength(2);
    });

    it('Employee C with some -> correct percentage (50%)', async () => {
      const res = await request(app)
        .get(`/api/v1/nexus/employees/${employeeC_id}/skill-gap?designationId=${designationA_id}`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.coverage.percentage).toBe(50); // 1 of 2
      expect(res.body.matchedSkills).toHaveLength(1);
      expect(res.body.skillGaps).toHaveLength(1);
      expect(res.body.skillGaps[0].skill).toBe('Apache Kafka');
      expect(res.body.skillGaps[0].status).toBe('MISSING');
    });
  });

  describe('Project and Combined Analysis', () => {
    it('Project requirements work alone', async () => {
      const res = await request(app)
        .get(`/api/v1/nexus/employees/${employeeC_id}/projects/${projectA_id}/skill-gap`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      // Project A needs Java and Kubernetes. Emp C has Java.
      expect(res.body.coverage.percentage).toBe(50);
      expect(res.body.matchedSkills[0].skill).toBe('Java');
      expect(res.body.skillGaps[0].skill).toBe('Kubernetes');
    });

    it('Combined role + project requirements deduplicate and calculate correctly', async () => {
      // Role: Java, Kafka
      // Project: Java, Kubernetes
      // Combined: Java, Kafka, Kubernetes (3 total)
      // Emp C has: Java (1 match) -> 33%
      const res = await request(app)
        .get(`/api/v1/nexus/employees/${employeeC_id}/projects/${projectA_id}/skill-gap?designationId=${designationA_id}`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.coverage.required).toBe(3);
      expect(res.body.coverage.matched).toBe(1);
      expect(res.body.coverage.percentage).toBe(33);
      
      const missingSkills = res.body.skillGaps.map(g => g.skill).sort();
      expect(missingSkills).toEqual(['Apache Kafka', 'Kubernetes']);
    });
  });

  describe('Tenant Isolation & Safety', () => {
    it('Cross-tenant employee/role access is rejected', async () => {
      // Org A tries to use Org B's designation
      const res = await request(app)
        .get(`/api/v1/nexus/employees/${employeeA_id}/skill-gap?designationId=${designationB_id}`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(404);
    });

    it('Cross-tenant employee/project access is rejected', async () => {
      // Org A tries to use Org B's project
      const res = await request(app)
        .get(`/api/v1/nexus/employees/${employeeA_id}/projects/${projectB_id}/skill-gap`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(404);
    });

    it('Missing parameters yield 400 Bad Request', async () => {
      const res = await request(app)
        .get(`/api/v1/nexus/employees/${employeeA_id}/skill-gap`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(400); // At least one of designationId or projectId must be provided.
    });

    it('Existing EmployeeSkill records remain unchanged', async () => {
      const profile = await EmployeeProfileExtended.findOne({ employeeId: employeeC_id });
      expect(profile.employeeSkills).toHaveLength(1);
      expect(profile.employeeSkills[0].proficiency).toBe('Intermediate');
    });
  });
});
