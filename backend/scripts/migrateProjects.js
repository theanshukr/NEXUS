import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { connectDB } from '../src/platform/database/db.js';
import Project from '../src/modules/projects/models/Project.js';
import Skill from '../src/modules/nexus/models/Skill.js';
import EmployeeProfileExtended from '../src/modules/nexus/models/EmployeeProfileExtended.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

// Temporary project requirements (kept in repo; NOT deleted by this script)
const REQUIREMENTS_PATH = path.join(__dirname, '../../frontend/src/data/projectSkillRequirements.json');

// Mirrors the normalization used by SkillNormalizationService / migrateEmployeeSkills.js
const normalizeSkillName = (name) => name.trim().replace(/\s+/g, ' ').toLowerCase();

const runMigration = async (dryRun = false) => {
  try {
    await connectDB();
    console.log(`🚀 Starting Project Migration ${dryRun ? '[DRY RUN]' : ''}`);

    const requirements = JSON.parse(fs.readFileSync(REQUIREMENTS_PATH, 'utf-8'));
    console.log(`Loaded ${requirements.length} project requirement definitions from ${path.basename(REQUIREMENTS_PATH)}`);

    // Build embedded project history index from REAL profile data (source of truth):
    // projectName -> [{ employeeId, organizationId, role, entry }]
    const historyIndex = new Map();
    const profiles = await EmployeeProfileExtended.find({}).lean();
    for (const profile of profiles) {
      for (const entry of profile.projects || []) {
        if (!entry?.name) continue;
        const key = entry.name.trim();
        if (!historyIndex.has(key)) historyIndex.set(key, []);
        historyIndex.get(key).push({
          employeeId: profile.employeeId,
          organizationId: profile.organizationId,
          role: entry.role || 'Member',
          description: entry.description || '',
          impact: entry.impact || ''
        });
      }
    }
    console.log(`Indexed embedded project history: ${[...historyIndex.keys()].length} unique project names across ${profiles.length} profiles`);

    const stats = {
      requirementDefinitions: requirements.length,
      projectsCreated: 0,
      projectsAlreadyExisted: 0,
      projectsSkippedNoHistory: 0,
      requiredSkillRefsCreated: 0,
      teamMembershipsCreated: 0,
      skillsReused: 0,
      unresolvedSkills: [],
      errors: 0
    };

    for (const req of requirements) {
      const projectName = req.project_name?.trim();
      const history = historyIndex.get(projectName) || [];

      if (history.length === 0) {
        console.warn(`⚠️  "${projectName}" has a requirement definition but NO embedded project history — skipping (would be invented).`);
        stats.projectsSkippedNoHistory++;
        continue;
      }

      const organizationId = history[0].organizationId;
      const existing = await Project.findOne({ name: projectName, organizationId });

      // Resolve required skills to EXISTING canonical Skills (never create from JSON strings)
      const skillIds = [];
      let unresolved = false;
      for (const skillName of req.required_skills || []) {
        const skill = await Skill.findOne({ organizationId, normalizedName: normalizeSkillName(skillName) });
        if (!skill) {
          console.error(`❌ [${projectName}] Skill "${skillName}" not found — aborting this project (no duplicates will be created).`);
          stats.unresolvedSkills.push({ project: projectName, skill: skillName });
          stats.errors++;
          unresolved = true;
          break;
        }
        stats.skillsReused++;
        skillIds.push(skill._id);
      }
      if (unresolved) continue;

      // Team membership ONLY from embedded history (deduplicated by employeeId;
      // Project pre-save hook rejects duplicate team members)
      const seen = new Set();
      const team = history
        .filter(h => {
          const idStr = h.employeeId?.toString();
          if (!idStr || seen.has(idStr)) return false;
          seen.add(idStr);
          return true;
        })
        .map(h => ({ employeeId: h.employeeId, role: h.role }));

      const description = history[0].description + (history[0].impact ? ` — Impact: ${history[0].impact}` : '');

      if (existing) {
        // Idempotent update: only patch fields that actually differ
        const currentSkills = (existing.requiredSkillIds || []).map(id => id.toString()).sort();
        const targetSkills = skillIds.map(id => id.toString()).sort();
        const currentTeam = (existing.team || []).map(m => m.employeeId?.toString()).sort();
        const targetTeam = team.map(m => m.employeeId?.toString()).sort();

        const skillsDiffer = JSON.stringify(currentSkills) !== JSON.stringify(targetSkills);
        const teamDiffer = JSON.stringify(currentTeam) !== JSON.stringify(targetTeam);

        if (!skillsDiffer && !teamDiffer) {
          stats.projectsAlreadyExisted++;
          stats.requiredSkillRefsCreated += targetSkills.length;
          stats.teamMembershipsCreated += targetTeam.length;
          console.log(`⏭️  "${projectName}" already up to date (${targetSkills.length} skills, ${targetTeam.length} team members)`);
          continue;
        }

        if (!dryRun) {
          if (skillsDiffer) existing.requiredSkillIds = skillIds;
          if (teamDiffer) existing.team = team;
          await existing.save(); // runs tenant-validation pre-save hook
        }
        stats.projectsAlreadyExisted++;
        stats.requiredSkillRefsCreated += targetSkills.length;
        stats.teamMembershipsCreated += targetTeam.length;
        console.log(`🔄 "${projectName}" updated ${dryRun ? '[dry-run]' : ''} (skills: ${targetSkills.length}, team: ${targetTeam.length})`);
        continue;
      }

      if (!dryRun) {
        await Project.create({
          organizationId,
          name: projectName,
          description,
          status: 'ACTIVE',
          requiredSkillIds: skillIds,
          team
        }); // runs tenant-validation pre-save hook
      }

      stats.projectsCreated++;
      stats.requiredSkillRefsCreated += skillIds.length;
      stats.teamMembershipsCreated += team.length;
      console.log(`✅ Created "${projectName}" ${dryRun ? '[dry-run]' : ''} (org: ${organizationId}, skills: ${skillIds.length}, team: ${team.map(m => m.employeeId.toString().slice(-6)).join(',')})`);
    }

    console.log('\n==================================================');
    console.log(`PROJECT MIGRATION REPORT ${dryRun ? '(DRY RUN)' : ''}`);
    console.log('==================================================');
    console.log(`Requirement definitions processed: ${stats.requirementDefinitions}`);
    console.log(`Projects created: ${stats.projectsCreated}`);
    console.log(`Projects already existed / updated: ${stats.projectsAlreadyExisted}`);
    console.log(`Projects skipped (no embedded history): ${stats.projectsSkippedNoHistory}`);
    console.log(`requiredSkillIds populated: ${stats.requiredSkillRefsCreated}`);
    console.log(`Team memberships created: ${stats.teamMembershipsCreated}`);
    console.log(`Canonical skills resolved (reused, never created): ${stats.skillsReused}`);
    console.log(`Unresolved skill names: ${stats.unresolvedSkills.length}`);
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
