import mongoose from 'mongoose';
import EmployeeProfileExtended from '../src/modules/nexus/models/EmployeeProfileExtended.js';
import Skill from '../src/modules/nexus/models/Skill.js';
import Organization from '../src/modules/organization/models/Organization.js';
import fs from 'fs';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:57847/?replicaSet=testset';

async function analyze() {
  await mongoose.connect(MONGODB_URI);

  const skills = await Skill.find({}).lean();
  const profiles = await EmployeeProfileExtended.find({}).lean();

  const skillStats = {};
  for (const skill of skills) {
    skillStats[skill._id.toString()] = {
      ...skill,
      usageCount: 0,
      proficiencies: {},
      sources: {},
      yearsOfExperience: []
    };
  }

  let totalRelationships = 0;
  for (const profile of profiles) {
    if (profile.employeeSkills) {
      for (const es of profile.employeeSkills) {
        const id = es.skillId.toString();
        if (skillStats[id]) {
          skillStats[id].usageCount++;
          totalRelationships++;

          const prof = es.proficiency || 'Unknown';
          skillStats[id].proficiencies[prof] = (skillStats[id].proficiencies[prof] || 0) + 1;

          const src = es.source || 'Unknown';
          skillStats[id].sources[src] = (skillStats[id].sources[src] || 0) + 1;

          if (es.yearsOfExperience != null) {
            skillStats[id].yearsOfExperience.push(es.yearsOfExperience);
          }
        }
      }
    }
  }

  const result = Object.values(skillStats).map(s => {
    return {
      id: s._id.toString(),
      canonicalName: s.canonicalName,
      normalizedName: s.normalizedName,
      category: s.category,
      usageCount: s.usageCount,
      proficiencies: s.proficiencies,
      sources: s.sources,
      avgYears: s.yearsOfExperience.length > 0 ? (s.yearsOfExperience.reduce((a,b)=>a+b,0) / s.yearsOfExperience.length).toFixed(1) : 'N/A'
    };
  }).sort((a, b) => b.usageCount - a.usageCount);

  const report = JSON.stringify({
    totalProfiles: profiles.length,
    totalSkills: skills.length,
    totalRelationships,
    skills: result
  }, null, 2);

  fs.writeFileSync('scratch_analysis.json', report);

  await mongoose.disconnect();
}

analyze().catch(console.error);
