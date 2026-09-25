import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

import Designation from '../../src/modules/organization/models/Designation.js';
import Project from '../../src/modules/projects/models/Project.js';
import Skill from '../../src/modules/nexus/models/Skill.js';
import Organization from '../../src/modules/organization/models/Organization.js';
import Employee from '../../src/modules/employees/models/Employee.js';

describe('Role and Project Skill Requirements', () => {
  let replSet;
  let org1, org2;
  let skillA, skillB;

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    const uri = replSet.getUri();
    await mongoose.connect(uri);

    org1 = await Organization.create({ name: 'Org 1', code: 'O1', domain: 'o1.com' });
    org2 = await Organization.create({ name: 'Org 2', code: 'O2', domain: 'o2.com' });

    skillA = await Skill.create({
      organizationId: org1._id,
      canonicalName: 'Java',
      normalizedName: 'java',
      category: 'BACKEND'
    });

    skillB = await Skill.create({
      organizationId: org2._id,
      canonicalName: 'Python',
      normalizedName: 'python',
      category: 'BACKEND'
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await replSet.stop();
  });

  it('1. Designation can reference canonical Skills', async () => {
    const desig = await Designation.create({
      organizationId: org1._id,
      code: 'SE1',
      title: 'Software Engineer',
      requiredSkillIds: [skillA._id]
    });
    expect(desig.requiredSkillIds.length).toBe(1);
    expect(desig.requiredSkillIds[0].toString()).toBe(skillA._id.toString());
  });

  it('2. Project can reference canonical Skills and have a team', async () => {
    const empId = new mongoose.Types.ObjectId();

    const proj = await Project.create({
      organizationId: org1._id,
      name: 'Project Alpha',
      requiredSkillIds: [skillA._id],
      team: [{ employeeId: empId, role: 'Developer' }]
    });

    expect(proj.requiredSkillIds.length).toBe(1);
    expect(proj.requiredSkillIds[0].toString()).toBe(skillA._id.toString());
    expect(proj.team.length).toBe(1);
    expect(proj.team[0].employeeId.toString()).toBe(empId.toString());
    expect(proj.team[0].role).toBe('Developer');
  });

  it('3. Duplicate required skill IDs are prevented in Designation and Project', async () => {
    const desig = await Designation.create({
      organizationId: org1._id,
      code: 'SE2',
      title: 'Senior Software Engineer',
      requiredSkillIds: [skillA._id, skillA._id]
    });
    // The pre-save hook should deduplicate this
    expect(desig.requiredSkillIds.length).toBe(1);

    const proj = await Project.create({
      organizationId: org1._id,
      name: 'Project Beta',
      requiredSkillIds: [skillA._id, skillA._id]
    });
    expect(proj.requiredSkillIds.length).toBe(1);
  });

  it('4. A Designation cannot reference a Skill from another organization', async () => {
    try {
      await Designation.create({
        organizationId: org1._id,
        code: 'SE3',
        title: 'Lead Software Engineer',
        requiredSkillIds: [skillB._id] // skillB belongs to org2
      });
      expect.fail('Should have thrown an error');
    } catch (error) {
      expect(error.message).toMatch(/belongs to a different organization/);
    }
  });

  it('5. A Project cannot reference a Skill from another organization', async () => {
    try {
      await Project.create({
        organizationId: org1._id,
        name: 'Project Gamma',
        requiredSkillIds: [skillB._id] // skillB belongs to org2
      });
      expect.fail('Should have thrown an error');
    } catch (error) {
      expect(error.message).toMatch(/belongs to a different organization/);
    }
  });

  it('6 & 7. Existing Designation and Project records remain valid without skills', async () => {
    const legacyDesig = await Designation.create({
      organizationId: org1._id,
      code: 'HR1',
      title: 'HR Manager'
    });
    expect(legacyDesig.requiredSkillIds.length).toBe(0);
    expect(legacyDesig.title).toBe('HR Manager');

    const legacyProj = await Project.create({
      organizationId: org1._id,
      name: 'Project Legacy'
    });
    expect(legacyProj.requiredSkillIds.length).toBe(0);
    expect(legacyProj.name).toBe('Project Legacy');
  });
});
