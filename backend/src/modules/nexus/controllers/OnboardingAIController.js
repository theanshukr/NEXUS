import { onboardingPlanService } from '../services/OnboardingPlanService.js';
import { onboardingAIService } from '../services/OnboardingAIService.js';
import { adaptiveOnboardingService } from '../services/AdaptiveOnboardingService.js';
import SkillGapAnalysisService from '../services/SkillGapAnalysisService.js';
import EmployeeProfileExtended from '../models/EmployeeProfileExtended.js';
import { Employee } from '../../employees/models/Employee.js';
import { Skill } from '../models/Skill.js';
import { AppError, NotFoundError } from '../../../core/errors/AppError.js';

/**
 * OnboardingAIController
 *
 * Handles AI personalization guidance endpoints.
 *
 * SECURITY:
 * - All endpoints are authenticated (via router middleware).
 * - Tenant isolation is enforced before any AI invocation.
 * - The server builds the AI context — the client cannot inject employee data.
 * - The AI platform is called with the user's forwarded JWT.
 *
 * READ-ONLY:
 * - These endpoints NEVER modify EmployeeSkill, OnboardingPlan, Skill,
 *   Designation, Project, or any other HR record.
 */
class OnboardingAIController {
  /**
   * GET /api/v1/nexus/onboarding/plans/:planId/ai-guidance
   *
   * Returns full personalized guidance for the onboarding plan.
   * Builds context server-side from authenticated tenant data.
   */
  async getPlanGuidance(req, res, next) {
    try {
      const { planId } = req.params;
      const { organizationId, userId } = req.user;
      const accessToken = req.headers.authorization?.split(' ')[1];

      // 1. Load plan with tenant isolation
      const plan = await onboardingPlanService.getPlan(organizationId, planId);

      // 2. Load employee — enforce tenant isolation
      const employee = await Employee.findOne({
        _id: plan.employeeId?._id || plan.employeeId,
        organizationId,
        archivedAt: null,
      }).populate('designationId', 'title');

      if (!employee) throw new NotFoundError('Employee not found in organization.');

      // 3. Load employee profile (canonical skills)
      const employeeProfile = await EmployeeProfileExtended.findOne({
        employeeId: employee._id,
        organizationId,
      }).populate({
        path: 'employeeSkills.skillId',
        model: Skill,
        select: 'canonicalName category',
      });

      // 4. Load skill gap snapshot (use the plan's stored snapshot if available,
      //    otherwise compute live from designation/project)
      let skillGapResult = { skillGaps: [] };
      try {
        if (plan.targetDesignationId || plan.targetProjectId) {
          skillGapResult = await SkillGapAnalysisService.analyzeGap(
            organizationId,
            employee._id,
            {
              designationId: plan.targetDesignationId?._id || plan.targetDesignationId || undefined,
              projectId: plan.targetProjectId?._id || plan.targetProjectId || undefined,
            }
          );
        } else if (plan.skillGapSnapshot?.length > 0) {
          skillGapResult = {
            skillGaps: plan.skillGapSnapshot.map(s => ({
              skillId: s.skillId,
              skillName: s.skillName || s.skill || 'Unknown',
              status: s.status || 'MISSING',
            })),
          };
        }
      } catch {
        // Skill gap is best-effort — proceed without it
      }

      // 5. Get current next action
      const nextAction = adaptiveOnboardingService.getNextAction(plan);

      // 6. Call AI service — READ-ONLY, never persists anything
      const result = await onboardingAIService.getGuidance({
        plan,
        employee,
        employeeProfile,
        skillGapResult,
        nextAction,
        accessToken,
      });

      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/nexus/onboarding/plans/:planId/tasks/:taskId/ai-guidance
   *
   * Returns personalized guidance for a single task.
   */
  async getTaskGuidance(req, res, next) {
    try {
      const { planId, taskId } = req.params;
      const { organizationId } = req.user;
      const accessToken = req.headers.authorization?.split(' ')[1];

      // 1. Load plan with tenant isolation
      const plan = await onboardingPlanService.getPlan(organizationId, planId);

      // 2. Find the task
      let targetTask = null;
      let targetModule = null;
      for (const mod of plan.modules) {
        const t = mod.tasks.id(taskId);
        if (t) { targetTask = t; targetModule = mod; break; }
      }
      if (!targetTask) throw new NotFoundError('Task not found in plan.');

      // 3. Load employee + profile
      const employee = await Employee.findOne({
        _id: plan.employeeId?._id || plan.employeeId,
        organizationId,
        archivedAt: null,
      });
      if (!employee) throw new NotFoundError('Employee not found in organization.');

      const employeeProfile = await EmployeeProfileExtended.findOne({
        employeeId: employee._id,
        organizationId,
      }).populate({ path: 'employeeSkills.skillId', model: Skill, select: 'canonicalName category' });

      // 4. Call AI service
      const result = await onboardingAIService.getTaskGuidance({
        task: targetTask,
        module: targetModule,
        employee,
        employeeProfile,
        accessToken,
      });

      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

export default new OnboardingAIController();
