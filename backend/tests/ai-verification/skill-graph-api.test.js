import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../src/app.js';
import Organization from '../../src/modules/organization/models/Organization.js';
import User from '../../src/modules/users/models/User.js';
import Employee from '../../src/modules/employees/models/Employee.js';
import EmployeeProfileExtended from '../../src/modules/nexus/models/EmployeeProfileExtended.js';
import Skill from '../../src/modules/nexus/models/Skill.js';
import Designation from '../../src/modules/organization/models/Designation.js';
import Project from '../../src/modules/projects/models/Project.js';
import Department from '../../src/modules/departments/models/Department.js';
import jwt from 'jsonwebtoken';

import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer;

describe('Skill Graph API (Step 6A)', () => {
  let orgId;
  let token;
  let headers;
  
  let skill1, skill2, skill3;
  let designation1;
  let project1;
  let employee1, employee2;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
    
    // Clean up
    await Organization.deleteMany({});
    await User.deleteMany({});
    await Employee.deleteMany({});
    await EmployeeProfileExtended.deleteMany({});
    await Skill.deleteMany({});
    await Designation.deleteMany({});
    await Project.deleteMany({});
    await Department.deleteMany({});
    
    // Create Org & Auth
    const org = await Organization.create({ name: 'Nexus Graph Corp', code: 'NGC', status: 'ACTIVE' });
    orgId = org._id;
    const user = await User.create({
      organizationId: orgId,
      email: 'graph.admin@nexus.test',
      passwordHash: 'hash',
      firstName: 'Graph',
      lastName: 'Admin',
      role: 'ADMIN',
      status: 'ACTIVE'
    });
    token = jwt.sign(
      { userId: user._id, organizationId: orgId, email: 'graph.admin@nexus.test', role: 'Super Admin' },
      process.env.JWT_ACCESS_SECRET || 'dev-access-secret',
      { expiresIn: '1h' }
    );
    headers = { Authorization: `Bearer ${token}` };

    // Set up basic entities
    const dept = await Department.create({
      organizationId: orgId,
      code: 'ENG',
      name: 'Engineering',
      headcount: 0
    });

    skill1 = await Skill.create({ organizationId: orgId, canonicalName: 'Java', normalizedName: 'java', category: 'BACKEND' });
    skill2 = await Skill.create({ organizationId: orgId, canonicalName: 'React', normalizedName: 'react', category: 'FRONTEND' });
    skill3 = await Skill.create({ organizationId: orgId, canonicalName: 'AWS', normalizedName: 'aws', category: 'CLOUD_DEVOPS' });

    designation1 = await Designation.create({
      organizationId: orgId,
      code: 'BEND',
      title: 'Backend Engineer',
      requiredSkillIds: [skill1._id, skill3._id],
      defaultDepartmentId: dept._id
    });

    employee1 = await Employee.create({
      organizationId: orgId,
      employeeCode: 'EMP-G1',
      firstName: 'Alice',
      lastName: 'Smith',
      departmentId: dept._id,
      designationId: designation1._id,
      locationId: new mongoose.Types.ObjectId(), // Fake
      shiftId: new mongoose.Types.ObjectId(), // Fake
      joiningDate: new Date(),
      status: 'ACTIVE'
    });

    employee2 = await Employee.create({
      organizationId: orgId,
      employeeCode: 'EMP-G2',
      firstName: 'Bob',
      lastName: 'Jones',
      departmentId: dept._id,
      designationId: designation1._id,
      locationId: new mongoose.Types.ObjectId(),
      shiftId: new mongoose.Types.ObjectId(),
      joiningDate: new Date(),
      status: 'ACTIVE'
    });

    // Create Employee Profiles
    await EmployeeProfileExtended.create({
      organizationId: orgId,
      employeeId: employee1._id,
      employeeSkills: [
        { skillId: skill1._id, proficiency: 'Expert', source: 'MANAGER_VERIFIED', confidence: 0.95 },
        { skillId: skill3._id, proficiency: 'Intermediate', source: 'SELF_REPORTED', confidence: 0.8 }
      ]
    });

    await EmployeeProfileExtended.create({
      organizationId: orgId,
      employeeId: employee2._id,
      employeeSkills: [
        { skillId: skill2._id, proficiency: 'Advanced', source: 'AI_EXTRACTED', confidence: 0.9 }
      ]
    });

    // Create Project
    project1 = await Project.create({
      organizationId: orgId,
      name: 'Cloud Migration',
      requiredSkillIds: [skill3._id],
      team: [
        { employeeId: employee1._id, role: 'Lead' }
      ]
    });

  });

  afterAll(async () => {
    await mongoose.connection.close();
    if (mongoServer) await mongoServer.stop();
  });

  it('should return the full organization skill graph', async () => {
    const res = await request(app)
      .get('/api/v1/nexus/skill-graph')
      .set(headers)
      .expect(200);

    const { success, nodes, edges, stats } = res.body;
    expect(success).toBe(true);

    // Verify Nodes
    expect(nodes.some(n => n.id === employee1._id.toString() && n.type === 'employee')).toBe(true);
    expect(nodes.some(n => n.id === skill1._id.toString() && n.type === 'skill')).toBe(true);
    expect(nodes.some(n => n.id === designation1._id.toString() && n.type === 'designation')).toBe(true);
    expect(nodes.some(n => n.id === project1._id.toString() && n.type === 'project')).toBe(true);

    // Verify Edges
    // Employee -> HAS_ROLE -> Designation
    expect(edges.some(e => e.source === employee1._id.toString() && e.target === designation1._id.toString() && e.type === 'HAS_ROLE')).toBe(true);
    // Employee -> HAS_SKILL -> Skill
    expect(edges.some(e => e.source === employee1._id.toString() && e.target === skill1._id.toString() && e.type === 'HAS_SKILL')).toBe(true);
    // Project -> REQUIRES_SKILL -> Skill
    expect(edges.some(e => e.source === project1._id.toString() && e.target === skill3._id.toString() && e.type === 'REQUIRES_SKILL')).toBe(true);
    // Project -> HAS_MEMBER -> Employee
    expect(edges.some(e => e.source === project1._id.toString() && e.target === employee1._id.toString() && e.type === 'HAS_MEMBER')).toBe(true);

    // Verify Metadata
    const skillEdge = edges.find(e => e.source === employee1._id.toString() && e.target === skill1._id.toString());
    expect(skillEdge.metadata.proficiency).toBe('Expert');
    expect(skillEdge.metadata.source).toBe('MANAGER_VERIFIED');

    // Stats
    expect(stats.employees).toBe(2);
    expect(stats.skills).toBe(3);
    expect(stats.projects).toBe(1);
    expect(stats.designations).toBe(1);
  });

  it('should filter graph by employeeId', async () => {
    const res = await request(app)
      .get(`/api/v1/nexus/skill-graph?employeeId=${employee1._id.toString()}`)
      .set(headers)
      .expect(200);

    const { nodes } = res.body;
    expect(nodes.filter(n => n.type === 'employee').length).toBe(1);
    expect(nodes.find(n => n.type === 'employee').id).toBe(employee1._id.toString());
  });

  it('should filter graph by skillId', async () => {
    const res = await request(app)
      .get(`/api/v1/nexus/skill-graph?skillId=${skill2._id.toString()}`) // React
      .set(headers)
      .expect(200);

    const { nodes, stats } = res.body;
    // Only employee2 has React
    expect(stats.employees).toBe(1);
    expect(nodes.find(n => n.type === 'employee').id).toBe(employee2._id.toString());
    
    // React is not in designation or project
    expect(stats.projects).toBe(0);
    expect(stats.designations).toBe(1); // Because employee2's role (Backend Engineer) is included
    expect(stats.skills).toBe(1);
  });
  
  it('should enforce strict tenant isolation', async () => {
     const otherOrg = await Organization.create({ name: 'Other', code: 'OTH', status: 'ACTIVE' });
     const otherSkill = await Skill.create({ organizationId: otherOrg._id, canonicalName: 'OtherSkill', normalizedName: 'otherskill' });
     
     const res = await request(app)
      .get('/api/v1/nexus/skill-graph')
      .set(headers)
      .expect(200);
      
     const { nodes } = res.body;
     expect(nodes.some(n => n.id === otherSkill._id.toString())).toBe(false);
  });

});
