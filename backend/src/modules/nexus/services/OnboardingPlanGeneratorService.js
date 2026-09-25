import { OnboardingPlan } from '../models/OnboardingPlan.js';
import skillGapAnalysisService from './SkillGapAnalysisService.js';
import { AppError } from '../../../core/errors/AppError.js';

class OnboardingPlanGeneratorService {
  /**
   * Generates a deterministic DRAFT onboarding plan based on skill gaps.
   */
  async generatePlan(organizationId, userId, employeeId, { designationId, projectId }) {
    if (!designationId && !projectId) {
      throw new AppError('At least one of designationId or projectId must be provided.', 400, 'ERR_VALIDATION');
    }
    
    // 1. Run existing skill gap analysis
    const gapAnalysis = await skillGapAnalysisService.analyzeGap(organizationId, employeeId, { designationId, projectId });
    
    // 2. Prepare modules and snapshot from skill gaps
    const modules = [];
    const skillGapSnapshot = [];
    let order = 1;
    
    // Process missing skills
    for (const gap of gapAnalysis.skillGaps) {
      skillGapSnapshot.push({
        skillId: gap.skillId,
        skillName: gap.skill,
        status: gap.status || 'MISSING'
      });
      
      const skillModule = {
        title: gap.skill,
        description: `Module to acquire missing skill: ${gap.skill}`,
        skillIds: [gap.skillId],
        order: order++,
        status: 'PENDING',
        tasks: [
          {
            title: `Learn ${gap.skill}`,
            description: `Learn the fundamentals of ${gap.skill}.`,
            skillIds: [gap.skillId],
            type: 'LEARNING',
            order: 1,
            status: 'PENDING'
          },
          {
            title: `Practice ${gap.skill}`,
            description: `Deploy a sample service using ${gap.skill}.`,
            skillIds: [gap.skillId],
            type: 'PRACTICE',
            order: 2,
            status: 'PENDING'
          },
          {
            title: `Assess ${gap.skill}`,
            description: `Complete a ${gap.skill} fundamentals assessment.`,
            skillIds: [gap.skillId],
            type: 'ASSESSMENT',
            order: 3,
            status: 'PENDING'
          }
        ]
      };
      
      modules.push(skillModule);
    }
    
    // Add matched skills to snapshot
    for (const matched of gapAnalysis.matchedSkills) {
      skillGapSnapshot.push({
        skillId: matched.skillId,
        skillName: matched.skill,
        status: 'MATCHED'
      });
    }

    // Add partial skills to snapshot if they exist
    for (const partial of gapAnalysis.partialSkills || []) {
      skillGapSnapshot.push({
        skillId: partial.skillId,
        skillName: partial.skill,
        status: 'PROFICIENCY_GAP'
      });
    }
    
    // 3. Determine title
    let titleParts = [];
    if (gapAnalysis.designation) titleParts.push(gapAnalysis.designation.title);
    if (gapAnalysis.project) titleParts.push(gapAnalysis.project.name);
    const title = titleParts.length > 0 ? `Onboarding: ${titleParts.join(' & ')}` : 'Skill Gap Onboarding Plan';
    
    // 4. Persist the plan as DRAFT
    const plan = new OnboardingPlan({
      organizationId,
      employeeId,
      title,
      status: 'DRAFT',
      targetDesignationId: designationId || null,
      targetProjectId: projectId || null,
      source: 'SKILL_GAP',
      skillGapSnapshot,
      modules,
      createdBy: userId
    });
    
    await plan.save();
    return plan;
  }
}

export const onboardingPlanGeneratorService = new OnboardingPlanGeneratorService();
export default onboardingPlanGeneratorService;
