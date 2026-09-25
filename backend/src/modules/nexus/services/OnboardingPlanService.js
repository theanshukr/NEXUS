import { OnboardingPlan } from '../models/OnboardingPlan.js';
import { Employee } from '../../employees/models/Employee.js';
import { Designation } from '../../organization/models/Designation.js';
import Project from '../../projects/models/Project.js';
import { Skill } from '../models/Skill.js';
import { AppError } from '../../../core/errors/AppError.js';

export class OnboardingPlanService {
  /**
   * Create a new onboarding plan with strict tenant validation
   */
  async createPlan(organizationId, userId, planData) {
    // 1. Validate employee
    const employee = await Employee.findOne({ _id: planData.employeeId, organizationId, archivedAt: null });
    if (!employee) {
      throw new AppError('Employee not found in organization', 404);
    }

    // 2. Validate target designation if provided
    if (planData.targetDesignationId) {
      const designation = await Designation.findOne({ _id: planData.targetDesignationId, organizationId, status: 'ACTIVE' });
      if (!designation) {
        throw new AppError('Target Designation not found in organization', 404);
      }
    }

    // 3. Validate target project if provided
    if (planData.targetProjectId) {
      const project = await Project.findOne({ _id: planData.targetProjectId, organizationId });
      if (!project) {
        throw new AppError('Target Project not found in organization', 404);
      }
    }

    // 4. Validate skill references in skillGapSnapshot
    if (planData.skillGapSnapshot && planData.skillGapSnapshot.length > 0) {
      const skillIds = planData.skillGapSnapshot.map(s => s.skillId);
      const skills = await Skill.find({ _id: { $in: skillIds }, organizationId });
      if (skills.length !== skillIds.length) {
        throw new AppError('One or more referenced skills do not belong to the organization', 400);
      }
    }

    // 5. Build and save plan
    const newPlan = new OnboardingPlan({
      organizationId,
      employeeId: planData.employeeId,
      title: planData.title,
      status: planData.status || 'DRAFT',
      targetDesignationId: planData.targetDesignationId || null,
      targetProjectId: planData.targetProjectId || null,
      source: planData.source || 'MANUAL',
      skillGapSnapshot: planData.skillGapSnapshot || [],
      modules: planData.modules || [],
      createdBy: userId,
      startedAt: planData.status === 'ACTIVE' ? new Date() : null
    });

    await newPlan.save();
    return newPlan;
  }

  /**
   * Retrieve a specific plan by ID
   */
  async getPlan(organizationId, planId) {
    const plan = await OnboardingPlan.findOne({ _id: planId, organizationId })
      .populate('employeeId', 'firstName lastName employeeCode')
      .populate('targetDesignationId', 'title')
      .populate('targetProjectId', 'name');
    
    if (!plan) {
      throw new AppError('Onboarding plan not found', 404);
    }
    
    return plan;
  }

  /**
   * List all plans for a specific employee
   */
  async listEmployeePlans(organizationId, employeeId) {
    const plans = await OnboardingPlan.find({ organizationId, employeeId })
      .sort({ createdAt: -1 })
      .populate('targetDesignationId', 'title')
      .populate('targetProjectId', 'name');
    
    return plans;
  }

  /**
   * Update plan status safely
   */
  async updatePlanStatus(organizationId, planId, status) {
    const plan = await OnboardingPlan.findOne({ _id: planId, organizationId });
    if (!plan) {
      throw new AppError('Onboarding plan not found', 404);
    }

    const validTransitions = {
      'DRAFT': ['ACTIVE', 'CANCELLED'],
      'ACTIVE': ['PAUSED', 'COMPLETED', 'CANCELLED'],
      'PAUSED': ['ACTIVE', 'CANCELLED'],
      'COMPLETED': [],
      'CANCELLED': []
    };

    if (!validTransitions[plan.status].includes(status)) {
      throw new AppError(`Invalid status transition from ${plan.status} to ${status}`, 400);
    }

    plan.status = status;
    
    if (status === 'ACTIVE' && !plan.startedAt) {
      plan.startedAt = new Date();
    }
    if (status === 'COMPLETED') {
      plan.completedAt = new Date();
    }

    await plan.save();
    return plan;
  }
}

export const onboardingPlanService = new OnboardingPlanService();
