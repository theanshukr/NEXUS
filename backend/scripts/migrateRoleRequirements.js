import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { connectDB } from '../src/platform/database/db.js';
import Designation from '../src/modules/organization/models/Designation.js';
import Skill from '../src/modules/nexus/models/Skill.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

// Temporary role requirements (kept in repo; NOT deleted by this script)
const REQUIREMENTS_PATH = path.join(__dirname, '../../frontend/src/data/roleSkillRequirements.json');

// Mirrors the normalization used by SkillNormalizationService / migrateEmployeeSkills.js
const normalizeSkillName = (name) => name.trim().replace(/\s+/g, ' ').toLowerCase();

const runMigration = async (dryRun = false) => {
  try {
    await connectDB();
    console.log(`🚀 Starting Role Requirement Migration ${dryRun ? '[DRY RUN]' : ''}`);

    const requirements = JSON.parse(fs.readFileSync(REQUIREMENTS_PATH, 'utf-8'));
    console.log(`Loaded ${requirements.length} role requirement definitions from ${path.basename(REQUIREMENTS_PATH)}`);

    const stats = {
      requirementsProcessed: 0,
      designationsMatched: 0,
      designationsSkipped: 0,
      designationsAlreadyUpToDate: 0,
      relationshipsCreated: 0,
      relationshipsAlreadyPresent: 0,
      skillsReused: 0,
      skillsMissing: [],
      errors: 0
    };

    for (const req of requirements) {
      stats.requirementsProcessed++;
      const roleName = req.role_name;

      // 1. Match the designation by exact title (scoped per organization below)
      const designations = await Designation.find({ title: roleName });

      if (designations.length === 0) {
        console.warn(`⚠️  No Designation found with title "${roleName}" — skipping (no invention).`);
        stats.designationsSkipped++;
        continue;
      }

      // 2. Resolve every required skill name to an EXISTING canonical Skill.
      //    Missing names are collected and reported — we never create skills from JSON strings.
      const resolvedSkillIds = [];
      let unresolved = false;
      for (const skillName of req.required_skills) {
        const normalized = normalizeSkillName(skillName);
        // Some designations may exist in more than one org; resolve skills per-org.
        // We resolve once per org encountered below instead, so collect names first.
        resolvedSkillIds.push(normalized);
      }

      for (const designation of designations) {
        const orgId = designation.organizationId;
        const skillIds = [];
        let failed = false;

        for (const normalized of resolvedSkillIds) {
          const skill = await Skill.findOne({ organizationId: orgId, normalizedName: normalized });
          if (!skill) {
            console.error(`❌ [${roleName}] Skill "${normalized}" not found for org ${orgId} — aborting this designation (no duplicates will be created).`);
            stats.skillsMissing.push({ role: roleName, skill: normalized, orgId: orgId.toString() });
            stats.errors++;
            failed = true;
            break;
          }
          stats.skillsReused++;
          skillIds.push(skill._id);
        }

        if (failed) continue;

        // 3. Idempotency: skip if requiredSkillIds already exactly match (order-insensitive)
        const current = (designation.requiredSkillIds || []).map(id => id.toString()).sort();
        const target = skillIds.map(id => id.toString()).sort();
        if (JSON.stringify(current) === JSON.stringify(target)) {
          stats.designationsAlreadyUpToDate++;
          stats.relationshipsAlreadyPresent += target.length;
          continue;
        }

        if (!dryRun) {
          // Use save() so the schema pre-save tenant-validation hook runs.
          designation.requiredSkillIds = skillIds;
          await designation.save();
        }

        stats.designationsMatched++;
        stats.relationshipsCreated += skillIds.length;
        console.log(`✅ ${roleName} (${designation.code}) → ${skillIds.length} required skills ${dryRun ? '[dry-run]' : 'saved'}`);
      }
    }

    console.log('\n==================================================');
    console.log(`ROLE REQUIREMENT MIGRATION REPORT ${dryRun ? '(DRY RUN)' : ''}`);
    console.log('==================================================');
    console.log(`Requirement definitions processed: ${stats.requirementsProcessed}`);
    console.log(`Designations updated: ${stats.designationsMatched}`);
    console.log(`Designations already up to date: ${stats.designationsAlreadyUpToDate}`);
    console.log(`Designations skipped (no title match): ${stats.designationsSkipped}`);
    console.log(`Role-skill relationships created: ${stats.relationshipsCreated}`);
    console.log(`Role-skill relationships already present: ${stats.relationshipsAlreadyPresent}`);
    console.log(`Canonical skills resolved (reused, never created): ${stats.skillsReused}`);
    console.log(`Unresolved skill names: ${stats.skillsMissing.length}`);
    console.log(`Errors: ${stats.errors}`);
    console.log('==================================================');

    process.exit(stats.errors > 0 && !dryRun ? 1 : 0);
  } catch (error) {
    console.error('❌ Migration Failed:', error);
    process.exit(1);
  }
};

const isDryRun = process.argv.includes('--dry-run');
runMigration(isDryRun);
