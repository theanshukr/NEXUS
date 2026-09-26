import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { connectDB } from '../src/platform/database/db.js';

// Models
import EmployeeProfileExtended from '../src/modules/nexus/models/EmployeeProfileExtended.js';
import Skill from '../src/modules/nexus/models/Skill.js';
import Employee from '../src/modules/employees/models/Employee.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const normalizeSkillName = (name) => {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
};

const runMigration = async (dryRun = false) => {
  try {
    await connectDB();
    console.log(`🚀 Starting Skill Migration ${dryRun ? '[DRY RUN]' : ''}`);

    const profiles = await EmployeeProfileExtended.find({}).populate('employeeId');
    
    let stats = {
      profilesInspected: profiles.length,
      legacySkillsFound: 0,
      canonicalSkillsCreated: 0,
      existingSkillsReused: 0,
      employeeSkillRelsCreated: 0,
      duplicatesPrevented: 0,
      organizationsProcessed: new Set(),
      skippedInvalid: 0,
      errors: 0
    };

    // Cache skills to prevent redundant DB hits within the same run per org
    // { orgId: { normalizedName: SkillDoc } }
    const skillCache = {};

    for (const profile of profiles) {
      const orgIdStr = profile.organizationId.toString();
      stats.organizationsProcessed.add(orgIdStr);

      if (!skillCache[orgIdStr]) {
        skillCache[orgIdStr] = {};
        // Preload existing skills for this org to handle idempotency
        const existingSkills = await Skill.find({ organizationId: profile.organizationId });
        for (const sk of existingSkills) {
          skillCache[orgIdStr][sk.normalizedName] = sk;
        }
      }

      if (!profile.skills || profile.skills.length === 0) continue;

      let newlyAddedToProfile = false;

      // Ensure employeeSkills array exists
      if (!profile.employeeSkills) {
        profile.employeeSkills = [];
      }

      for (const legacySkill of profile.skills) {
        stats.legacySkillsFound++;

        if (!legacySkill.name || typeof legacySkill.name !== 'string') {
          stats.skippedInvalid++;
          continue;
        }

        const canonicalName = legacySkill.name.trim();
        const normalized = normalizeSkillName(legacySkill.name);

        if (!normalized) {
          stats.skippedInvalid++;
          continue;
        }

        // 1. Find or Create Canonical Skill
        let skillDoc = skillCache[orgIdStr][normalized];
        if (!skillDoc) {
          // Check DB again just in case (though we preloaded and cached it)
          skillDoc = await Skill.findOne({ 
            organizationId: profile.organizationId, 
            normalizedName: normalized 
          });

          if (!skillDoc) {
            skillDoc = new Skill({
              organizationId: profile.organizationId,
              canonicalName,
              normalizedName: normalized,
              category: legacySkill.category || 'GENERAL'
            });

            if (!dryRun) {
              await skillDoc.save();
            } else {
              // Mock ID for dry run output
              skillDoc._id = new mongoose.Types.ObjectId();
            }
            stats.canonicalSkillsCreated++;
          } else {
             stats.existingSkillsReused++;
          }
          skillCache[orgIdStr][normalized] = skillDoc;
        } else {
          stats.existingSkillsReused++;
        }

        // 2. Prevent duplicate EmployeeSkill relationship
        // check if this profile already has this skillId in employeeSkills
        const hasSkillAlready = profile.employeeSkills.some(es => 
          es.skillId && skillDoc._id && es.skillId.toString() === skillDoc._id.toString()
        );

        if (hasSkillAlready) {
          stats.duplicatesPrevented++;
          continue;
        }

        // 3. Create EmployeeSkill relationship
        profile.employeeSkills.push({
          skillId: skillDoc._id,
          proficiency: legacySkill.proficiency || 'Intermediate',
          yearsOfExperience: legacySkill.yearsOfExperience || 1,
          source: legacySkill.source || 'SELF_REPORTED',
          confidence: legacySkill.confidence ?? 0.9,
          verificationStatus: legacySkill.verificationStatus || 'PENDING',
          evidence: '', // not in legacy usually
          verifiedBy: legacySkill.verifiedBy || null,
          verifiedAt: legacySkill.verifiedAt || null
        });

        stats.employeeSkillRelsCreated++;
        newlyAddedToProfile = true;
      }

      // Save the profile if we actually made changes and it's not a dry run
      if (newlyAddedToProfile && !dryRun) {
        await profile.save();
      }
    }

    console.log('\n==================================================');
    console.log(`MIGRATION REPORT ${dryRun ? '(DRY RUN)' : ''}`);
    console.log('==================================================');
    console.log(`Profiles Inspected: ${stats.profilesInspected}`);
    console.log(`Legacy Skills Found: ${stats.legacySkillsFound}`);
    console.log(`Organizations Processed: ${stats.organizationsProcessed.size}`);
    console.log(`Unique Canonical Skills Created: ${stats.canonicalSkillsCreated}`);
    console.log(`Existing Skills Reused: ${stats.existingSkillsReused}`);
    console.log(`EmployeeSkill Relationships Created: ${stats.employeeSkillRelsCreated}`);
    console.log(`Duplicate Relationships Prevented: ${stats.duplicatesPrevented}`);
    console.log(`Records Skipped (Invalid Data): ${stats.skippedInvalid}`);
    console.log(`Errors: ${stats.errors}`);
    console.log('==================================================');

    // Print Examples
    if (profiles.length > 0) {
      console.log('\nEXAMPLES:');

      // Let's show up to 5 examples (null-safe: never crash after a successful save)
      let printed = 0;
      for (const sampleProfile of profiles) {
        if (printed >= 5) break;
        if (sampleProfile.skills && sampleProfile.skills.length > 0) {
          const legacy = sampleProfile.skills[0];
          const orgCache = skillCache[sampleProfile.organizationId.toString()] || {};
          const canonical = orgCache[normalizeSkillName(legacy.name)];

          if (!canonical) continue; // skill was skipped as invalid — nothing to show

          const newRel = (sampleProfile.employeeSkills || []).find(
            s => s.skillId && canonical._id && s.skillId.toString() === canonical._id.toString()
          );

          let empName = 'Unknown Employee';
          if (sampleProfile.employeeId) {
            empName = `${sampleProfile.employeeId.firstName || ''} ${sampleProfile.employeeId.lastName || ''}`.trim();
          }

          console.log(`\nEmployee: ${empName}`);
          console.log(`Legacy: "${legacy.name}" (Proficiency: ${legacy.proficiency}, Source: ${legacy.source})`);
          console.log(`→ Skill: canonicalName: "${canonical.canonicalName}", normalizedName: "${canonical.normalizedName}", skill_id: ${canonical._id}`);
          console.log(`→ EmployeeSkill: employeeProfileId: ${sampleProfile._id}, proficiency: ${newRel?.proficiency}, source: ${newRel?.source}, verificationStatus: ${newRel?.verificationStatus}`);
          printed++;
        }
      }
    }

    if (!dryRun) {
        process.exit(0);
    } else {
        process.exit(0);
    }
  } catch (error) {
    console.error('❌ Migration Failed:', error);
    process.exit(1);
  }
};

const isDryRun = process.argv.includes('--dry-run');
runMigration(isDryRun);
