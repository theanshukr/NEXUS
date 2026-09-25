import mongoose from 'mongoose';
import { NotFoundError, TenantIsolationError } from '#@/core/errors/AppError.js';
import Designation from '#@/modules/organization/models/Designation.js';
import Project from '#@/modules/projects/models/Project.js';
import EmployeeProfileExtended from '#@/modules/nexus/models/EmployeeProfileExtended.js';
import Skill from '#@/modules/nexus/models/Skill.js';

class SkillGapAnalysisService {
  /**
   * Deterministic mapping of proficiency levels.
   */
  static PROFICIENCY_LEVELS = {
    'Beginner': 1,
    'Intermediate': 2,
    'Advanced': 3,
    'Expert': 4
  };

  /**
   * Performs read-only skill gap analysis for an employee against a designation and/or project.
   */
  async analyzeGap(organizationId, employeeId, { designationId, projectId } = {}) {
    if (!organizationId || !employeeId) {
      throw new Error('organizationId and employeeId are required.');
    }

    if (!designationId && !projectId) {
      throw new Error('At least one of designationId or projectId must be provided.');
    }

    // 1. Fetch the Employee's extended profile (canonical skills)
    // We enforce tenant isolation directly in the query.
    const profile = await EmployeeProfileExtended.findOne({
      employeeId,
      organizationId
    }).populate({
      path: 'employeeSkills.skillId',
      model: Skill,
      select: 'canonicalName category escoId'
    });

    if (!profile) {
      throw new NotFoundError('Employee extended profile not found or does not belong to this organization.');
    }

    // Prepare required skills map to deduplicate (SkillID -> Skill doc)
    const requiredSkillsMap = new Map();
    let designation = null;
    let project = null;

    // 2. Fetch Role (Designation) requirements
    if (designationId) {
      designation = await Designation.findOne({ _id: designationId, organizationId })
        .populate('requiredSkillIds', 'canonicalName category');
      
      if (!designation) {
        throw new NotFoundError('Designation not found or does not belong to this organization.');
      }

      for (const skill of designation.requiredSkillIds) {
        requiredSkillsMap.set(skill._id.toString(), {
          _id: skill._id.toString(),
          name: skill.canonicalName,
          category: skill.category,
          source: 'ROLE'
        });
      }
    }

    // 3. Fetch Project requirements
    if (projectId) {
      project = await Project.findOne({ _id: projectId, organizationId })
        .populate('requiredSkillIds', 'canonicalName category');
      
      if (!project) {
        throw new NotFoundError('Project not found or does not belong to this organization.');
      }

      for (const skill of project.requiredSkillIds) {
        const sid = skill._id.toString();
        if (requiredSkillsMap.has(sid)) {
          requiredSkillsMap.get(sid).source = 'BOTH';
        } else {
          requiredSkillsMap.set(sid, {
            _id: sid,
            name: skill.canonicalName,
            category: skill.category,
            source: 'PROJECT'
          });
        }
      }
    }

    // 4. Map Employee's current canonical skills
    const employeeSkillsMap = new Map();
    if (profile.employeeSkills && profile.employeeSkills.length > 0) {
      for (const es of profile.employeeSkills) {
        if (es.skillId) { // Ensure skill is fully populated
          employeeSkillsMap.set(es.skillId._id.toString(), {
            skill: es.skillId.canonicalName,
            proficiency: es.proficiency,
            yearsOfExperience: es.yearsOfExperience
          });
        }
      }
    }

    // 5. Compute the gap
    const matchedSkills = [];
    const missingSkills = [];
    const partialSkills = []; // Supported structurally, though current schema doesn't define targets

    for (const [skillId, reqSkill] of requiredSkillsMap.entries()) {
      if (employeeSkillsMap.has(skillId)) {
        // Since Designation and Project models currently do not store required proficiency,
        // presence alone is considered a MATCH.
        const empSkillInfo = employeeSkillsMap.get(skillId);
        matchedSkills.push({
          skillId: reqSkill._id,
          skill: reqSkill.name,
          employeeProficiency: empSkillInfo.proficiency,
          requiredBy: reqSkill.source
        });
      } else {
        missingSkills.push({
          skillId: reqSkill._id,
          skill: reqSkill.name,
          status: 'MISSING',
          requiredBy: reqSkill.source
        });
      }
    }

    const totalRequired = requiredSkillsMap.size;
    const totalMatched = matchedSkills.length;
    const percentage = totalRequired === 0 ? 100 : Math.round((totalMatched / totalRequired) * 100);

    return {
      employeeId,
      designation: designation ? { id: designation._id, title: designation.title } : null,
      project: project ? { id: project._id, name: project.name } : null,
      coverage: {
        required: totalRequired,
        matched: totalMatched,
        missing: missingSkills.length,
        partial: partialSkills.length,
        percentage
      },
      matchedSkills,
      partialSkills,
      skillGaps: missingSkills
    };
  }
}

export default new SkillGapAnalysisService();
