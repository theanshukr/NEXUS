import mongoose from 'mongoose';
import dotenv from 'dotenv';
import EmployeeProfileExtended from '../src/modules/nexus/models/EmployeeProfileExtended.js';
import Employee from '../src/modules/employees/models/Employee.js';
import SkillExtractionService from '../src/modules/nexus/services/SkillExtractionService.js';
import SkillNormalizationService from '../src/modules/nexus/services/SkillNormalizationService.js';
import NexusProfileService from '../src/modules/nexus/services/NexusProfileService.js';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/nexus-dev';

async function runAnalysis() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log(`Connected to ${MONGO_URI}`);

    // Get an organization
    const org = await mongoose.connection.collection('organizations').findOne({ code: 'DEV' });
    if (!org) {
      console.log('DEV organization not found. Please run seed:dev first.');
      process.exit(1);
    }

    // Get 3 real employees
    const employees = await Employee.find({ organizationId: org._id }).limit(3).populate('designationId').lean();

    if (employees.length === 0) {
      console.log('No employees found to analyze.');
      process.exit(1);
    }

    console.log(`\n==================================================`);
    console.log(`RUNNING REAL EMPLOYEE SKILL INTELLIGENCE ANALYSIS`);
    console.log(`==================================================\n`);

    for (const employee of employees) {
      console.log(`Analyzing Employee: ${employee.firstName} ${employee.lastName} (${employee.employeeCode})`);
      
      const profileData = await NexusProfileService.getUnifiedProfile(employee._id, org._id);
      const p = profileData.intelligence;
      const e = profileData.employee;

      const components = [];
      if (e.designation) components.push(`Role: ${e.designation}`);
      if (p.headline) components.push(`Headline: ${p.headline}`);
      if (p.summary) components.push(`Summary: ${p.summary}`);
      if (p.skills && p.skills.length > 0) {
        components.push(`Reported Skills: ${p.skills.map(s => s.name).join(', ')}`);
      }
      if (p.experience && p.experience.length > 0) {
        components.push(`Experience: ${p.experience.map(exp => `${exp.title} - ${exp.description || ''}`).join('; ')}`);
      }
      if (p.projects && p.projects.length > 0) {
        components.push(`Projects: ${p.projects.map(proj => `${proj.name}: ${proj.description || ''} using ${proj.technologies ? proj.technologies.join(',') : ''}`).join('; ')}`);
      }
      if (p.certifications && p.certifications.length > 0) {
        components.push(`Certifications: ${p.certifications.map(c => c.name).join(', ')}`);
      }

      const analysisText = components.join('\n\n');
      console.log(`--- Built Analysis Text ---\n${analysisText}\n`);

      // 1. Extract
      const extractedMentions = await SkillExtractionService.extractSkills(analysisText);
      console.log(`--- Extracted ${extractedMentions.length} Mentions ---`);
      
      // 2. Normalize
      const normalizedResults = [];
      for (const ent of extractedMentions) {
        const norm = await SkillNormalizationService.normalizeSkill(ent.text, org._id);
        normalizedResults.push({
          mention: ent.text,
          canonicalSkill: norm.canonicalName,
          matchType: norm.matchType,
          confidence: norm.confidence
        });
      }

      console.table(normalizedResults);
      console.log(`\n--------------------------------------------------\n`);
    }

  } catch (error) {
    console.error(error);
  } finally {
    await mongoose.disconnect();
  }
}

runAnalysis();
