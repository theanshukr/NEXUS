import { OnboardingPlan } from '../models/OnboardingPlan.js';
import { AppError, NotFoundError } from '../../../core/errors/AppError.js';

class AdaptiveOnboardingService {
  /**
   * Calculates the deterministic next action for the onboarding plan.
   */
  getNextAction(plan) {
    if (plan.status === 'COMPLETED') {
      return { nextAction: null, reason: 'ONBOARDING_COMPLETED' };
    }
    if (plan.status === 'DRAFT') {
      return { nextAction: null, reason: 'PLAN_IS_DRAFT' };
    }
    
    // Find the first module that is not COMPLETED
    const currentModule = plan.modules.find(m => m.status !== 'COMPLETED');
    if (!currentModule) {
      return { nextAction: null, reason: 'ONBOARDING_COMPLETED' };
    }
    
    // Sort tasks by order ascending
    const sortedTasks = [...currentModule.tasks].sort((a, b) => a.order - b.order);
    
    // Find the first task that is PENDING, IN_PROGRESS or FAILED
    for (const task of sortedTasks) {
      if (task.status === 'PENDING' || task.status === 'IN_PROGRESS' || task.status === 'FAILED') {
        return {
          success: true,
          planId: plan._id,
          status: plan.status,
          nextAction: {
            moduleId: currentModule._id,
            taskId: task._id,
            type: task.type,
            title: task.title,
            skillId: task.skillIds && task.skillIds.length > 0 ? task.skillIds[0] : null,
            reason: task.status === 'FAILED' ? 'Task needs retry or remediation' : 'Next available task'
          }
        };
      }
    }
    
    return { nextAction: null, reason: 'MODULE_TASKS_EXHAUSTED' };
  }

  /**
   * Completes a task and applies adaptive rules.
   */
  async completeTask(organizationId, userId, planId, taskId, { outcome, score } = {}) {
    const plan = await OnboardingPlan.findOne({ _id: planId, organizationId });
    if (!plan) throw new NotFoundError('Plan not found for this employee/organization.');
    
    if (plan.status === 'DRAFT') {
      throw new AppError('Cannot progress a DRAFT plan.', 400, 'ERR_VALIDATION');
    }
    
    let targetModule = null;
    let targetTask = null;
    
    for (const m of plan.modules) {
      const t = m.tasks.id(taskId);
      if (t) {
        targetModule = m;
        targetTask = t;
        break;
      }
    }
    
    if (!targetTask) throw new NotFoundError('Task not found.');
    if (targetTask.status === 'COMPLETED') {
      throw new AppError('Task is already completed.', 400, 'ERR_VALIDATION');
    }

    // Verify task is currently actionable
    const currentAction = this.getNextAction(plan);
    if (currentAction.nextAction && currentAction.nextAction.taskId.toString() !== targetTask._id.toString()) {
      throw new AppError('Task is not currently actionable.', 400, 'ERR_VALIDATION');
    }
    
    // Apply adaptive rules for assessments
    if (targetTask.type === 'ASSESSMENT') {
      if (outcome === 'failed') {
        // Add Remediation if one isn't currently pending
        const pendingRemediation = targetModule.tasks.find(
          t => t.title.startsWith('Remediation:') && t.status !== 'COMPLETED'
        );
        
        if (!pendingRemediation) {
          targetTask.order += 1;
          targetModule.tasks.push({
            title: `Remediation: ${targetModule.title}`,
            description: `Additional practice required before re-attempting assessment.`,
            type: 'PRACTICE',
            skillIds: targetTask.skillIds,
            order: targetTask.order - 0.5,
            status: 'PENDING'
          });
          targetModule.tasks.sort((a, b) => a.order - b.order);
        }
        
        // Assessment goes back to pending so they can retry it after remediation
        targetTask.status = 'PENDING';
      } else {
        // Passed assessment
        targetTask.status = 'COMPLETED';
        targetTask.completedAt = new Date();
      }
    } else {
      // Normal task completion (LEARNING, PRACTICE)
      targetTask.status = 'COMPLETED';
      targetTask.completedAt = new Date();
    }
    
    // Persist changes. The pre('save') hook handles progress and status derivation.
    await plan.save();
    return plan;
  }
}

export const adaptiveOnboardingService = new AdaptiveOnboardingService();
export default adaptiveOnboardingService;
