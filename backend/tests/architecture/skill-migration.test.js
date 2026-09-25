import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

import EmployeeProfileExtended from '../../src/modules/nexus/models/EmployeeProfileExtended.js';
import Skill from '../../src/modules/nexus/models/Skill.js';
import Organization from '../../src/modules/organization/models/Organization.js';

// Re-implement the migration logic as a function to test it directly
const normalizeSkillName = (name) => name.trim().replace(/\s+/g, ' ').toLowerCase();

const runMigration = async () => {
  const profiles = await EmployeeProfileExtended.find({});
  const skillCache = {};

  for (const profile of profiles) {
    const orgIdStr = profile.organizationId.toString();
    if (!skillCache[orgIdStr]) {
      skillCache[orgIdStr] = {};
      const existingSkills = await Skill.find({ organizationId: profile.organizationId });
      for (const sk of existingSkills) {
        skillCache[orgIdStr][sk.normalizedName] = sk;
      }
    }

    if (!profile.skills || profile.skills.length === 0) continue;

    if (!profile.employeeSkills) {
      profile.employeeSkills = [];
    }

    let changed = false;

    for (const legacySkill of profile.skills) {
      if (!legacySkill.name) continue;

      const canonicalName = legacySkill.name.trim();
      const normalized = normalizeSkillName(legacySkill.name);

      let skillDoc = skillCache[orgIdStr][normalized];
      if (!skillDoc) {
        skillDoc = await Skill.findOne({ organizationId: profile.organizationId, normalizedName: normalized });
        if (!skillDoc) {
          skillDoc = new Skill({
            organizationId: profile.organizationId,
            canonicalName,
            normalizedName: normalized,
            category: legacySkill.category || 'GENERAL'
          });
          await skillDoc.save();
        }
        skillCache[orgIdStr][normalized] = skillDoc;
      }

      const hasSkillAlready = profile.employeeSkills.some(es => es.skillId.toString() === skillDoc._id.toString());

      if (hasSkillAlready) continue;

      profile.employeeSkills.push({
        skillId: skillDoc._id,
        proficiency: legacySkill.proficiency || 'Intermediate',
        yearsOfExperience: legacySkill.yearsOfExperience || 1,
        source: legacySkill.source || 'SELF_REPORTED',
        confidence: legacySkill.confidence ?? 0.9,
        verificationStatus: legacySkill.verificationStatus || 'PENDING',
        evidence: legacySkill.evidence || '',
        verifiedBy: legacySkill.verifiedBy || null,
        verifiedAt: legacySkill.verifiedAt || null
      });

      changed = true;
    }

    if (changed) {
      await profile.save();
    }
  }
};

describe('Skill Migration Tests', () => {
  let replSet;
  let org1, org2;

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    const uri = replSet.getUri();
    await mongoose.connect(uri);

    org1 = await Organization.create({ name: 'Org 1', code: 'O1', domain: 'o1.com' });
    org2 = await Organization.create({ name: 'Org 2', code: 'O2', domain: 'o2.com' });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await replSet.stop();
  });

  it('1 & 5 & 6 & 7 & 8: Should map same skill with different casing to one Skill and preserve metadata', async () => {
    const profile = await EmployeeProfileExtended.create({
      organizationId: org1._id,
      employeeId: new mongoose.Types.ObjectId(),
      totalExperienceYears: 5,
      skills: [
        { name: ' React ', proficiency: 'Expert', source: 'MANAGER_VERIFIED', verificationStatus: 'VERIFIED' },
        { name: 'react', proficiency: 'Advanced', source: 'SELF_REPORTED', verificationStatus: 'PENDING' }
      ]
    });

    await runMigration();

    const updatedProfile = await EmployeeProfileExtended.findById(profile._id);
    const skills = await Skill.find({ organizationId: org1._id });

    // 1. One canonical skill created
    expect(skills.length).toBe(1);
    expect(skills[0].canonicalName).toBe('React');
    expect(skills[0].normalizedName).toBe('react');

    // 9. EmployeeSkill references the correct org skill
    expect(skills[0].organizationId.toString()).toBe(org1._id.toString());

    // Should create exactly 1 relationship because of duplication check in migration
    // Wait, the first one gets added. The second one maps to same skill._id, so duplication check prevents it.
    expect(updatedProfile.employeeSkills.length).toBe(1);

    // 5 & 6 & 7. Preserved metadata from the first entry that was added
    expect(updatedProfile.employeeSkills[0].proficiency).toBe('Expert');
    expect(updatedProfile.employeeSkills[0].source).toBe('MANAGER_VERIFIED');
    expect(updatedProfile.employeeSkills[0].verificationStatus).toBe('VERIFIED');

    // 8. Legacy skills remain untouched
    expect(updatedProfile.skills.length).toBe(2);
    expect(updatedProfile.skills[0].name).toBe('React');
  });

  it('2. Same skill in two organizations -> two separate Skills', async () => {
    await EmployeeProfileExtended.create({
      organizationId: org2._id,
      employeeId: new mongoose.Types.ObjectId(),
      skills: [{ name: 'React' }]
    });

    await runMigration();

    const skillsOrg1 = await Skill.find({ organizationId: org1._id, normalizedName: 'react' });
    const skillsOrg2 = await Skill.find({ organizationId: org2._id, normalizedName: 'react' });

    expect(skillsOrg1.length).toBe(1);
    expect(skillsOrg2.length).toBe(1);
    expect(skillsOrg1[0]._id.toString()).not.toBe(skillsOrg2[0]._id.toString());
  });

  it('3 & 4. Idempotency: Re-running migration prevents duplicates', async () => {
    // Run again
    await runMigration();

    const profile = await EmployeeProfileExtended.findOne({ organizationId: org1._id });
    const skills = await Skill.find({ organizationId: org1._id });

    // 3. No duplicate Skills
    expect(skills.length).toBe(1);

    // 4. No duplicate EmployeeSkill relationships
    expect(profile.employeeSkills.length).toBe(1);
  });
});
