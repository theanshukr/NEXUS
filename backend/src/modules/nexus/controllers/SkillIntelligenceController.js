import SkillExtractionService from '../services/SkillExtractionService.js';
import SkillNormalizationService from '../services/SkillNormalizationService.js';
import NexusProfileService from '../services/NexusProfileService.js';
import { ValidationError, NotFoundError } from '../../../core/errors/AppError.js';

class SkillIntelligenceController {
  
  /**
   * GET /api/v1/nexus/skills
   * Fetch all canonical skills for the organization.
   */
  async getAllSkills(req, res, next) {
    try {
      const organizationId = req.user.organizationId;
      const mongoose = await import('mongoose');
      const Skill = mongoose.model('Skill');
      const skills = await Skill.find({ organizationId }).lean();
      res.status(200).json({
        success: true,
        data: skills
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/nexus/skills/extract
   * Extracts and normalizes skills from raw text.
   */
  async extractSkills(req, res, next) {
    try {
      const { text } = req.body;
      const organizationId = req.user.organizationId;

      if (!text || typeof text !== 'string') {
        throw new ValidationError('Valid text is required for skill extraction.');
      }

      // Step 1: Extraction
      const extractedMentions = await SkillExtractionService.extractSkills(text);

      // Step 2: Normalization
      const normalizedResults = [];
      for (const ent of extractedMentions) {
        const norm = await SkillNormalizationService.normalizeSkill(ent.text, organizationId);
        normalizedResults.push({
          mention: ent.text,
          canonicalSkill: norm.canonicalName,
          skillId: norm.skillId,
          matchType: norm.matchType,
          confidence: norm.confidence,
          extractionConfidence: ent.confidence,
          start: ent.start,
          end: ent.end
        });
      }

      res.status(200).json({
        success: true,
        mentions: normalizedResults
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/nexus/employees/:employeeId/skill-analysis
   * Analyzes an employee's profile to extract skills.
   */
  async analyzeEmployee(req, res, next) {
    try {
      const { employeeId } = req.params;
      const organizationId = req.user.organizationId;

      // Ensure employee exists and strictly belongs to this organization
      // NexusProfileService has loose multi-tenant fallback logic we must guard against
      const mongoose = await import('mongoose');
      const Employee = mongoose.model('Employee');
      const employeeExists = await Employee.exists({ _id: employeeId, organizationId });
      
      if (!employeeExists) {
        throw new NotFoundError('Employee profile not found.');
      }

      const profileData = await NexusProfileService.getUnifiedProfile(employeeId, organizationId);

      if (!profileData) {
        throw new NotFoundError('Employee profile not found.');
      }

      // Build analysis text from profile data safely
      const p = profileData.intelligence;
      const e = profileData.employee;

      const components = [];
      
      if (e.designation) components.push(`Role: ${e.designation}`);
      if (p.headline) components.push(`Headline: ${p.headline}`);
      if (p.summary) components.push(`Summary: ${p.summary}`);
      
      if (p.skills && p.skills.length > 0) {
        const existingSkills = p.skills.map(s => s.name).join(', ');
        components.push(`Reported Skills: ${existingSkills}`);
      }

      if (p.experience && p.experience.length > 0) {
        const expDesc = p.experience.map(exp => `${exp.title} - ${exp.description || ''}`).join('; ');
        components.push(`Experience: ${expDesc}`);
      }

      if (p.projects && p.projects.length > 0) {
        const projDesc = p.projects.map(proj => `${proj.name}: ${proj.description || ''} using ${proj.technologies ? proj.technologies.join(',') : ''}`).join('; ');
        components.push(`Projects: ${projDesc}`);
      }

      if (p.certifications && p.certifications.length > 0) {
        const certDesc = p.certifications.map(c => c.name).join(', ');
        components.push(`Certifications: ${certDesc}`);
      }

      const analysisText = components.join('\n\n');

      // Step 1: Extraction
      const extractedMentions = await SkillExtractionService.extractSkills(analysisText);

      // Step 2: Normalization
      const normalizedResults = [];
      for (const ent of extractedMentions) {
        const norm = await SkillNormalizationService.normalizeSkill(ent.text, organizationId);
        normalizedResults.push({
          mention: ent.text,
          canonicalSkill: norm.canonicalName,
          skillId: norm.skillId,
          matchType: norm.matchType,
          confidence: norm.confidence
        });
      }

      res.status(200).json({
        success: true,
        employeeId: e.id,
        employee: {
          name: `${e.firstName} ${e.lastName}`,
          designation: e.designation
        },
        mentions: normalizedResults
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/nexus/employees/:employeeId/skill-gap
   * GET /api/v1/nexus/employees/:employeeId/projects/:projectId/skill-gap
   * Deterministically calculates the gap between an employee's canonical skills
   * and the skills required by their designation or a specific project.
   */
  async analyzeSkillGap(req, res, next) {
    try {
      const { employeeId, projectId } = req.params;
      const { designationId } = req.query; // Fallback to explicitly request a designation via query
      const organizationId = req.user.organizationId;
      
      const { default: SkillGapAnalysisService } = await import('../services/SkillGapAnalysisService.js');

      // The service enforces tenant isolation internally
      const result = await SkillGapAnalysisService.analyzeGap(organizationId, employeeId, {
        designationId,
        projectId
      });

      res.status(200).json({
        success: true,
        ...result
      });

    } catch (error) {
      if (error.name === 'NotFoundError' || error.message.includes('not found')) {
        res.status(404).json({ success: false, message: error.message });
      } else if (error.message.includes('required') || error.message.includes('At least one')) {
        res.status(400).json({ success: false, message: error.message });
      } else {
        next(error);
      }
    }
  }
}

export default new SkillIntelligenceController();
