import { onboardingPlanService } from '../services/OnboardingPlanService.js';
import { onboardingPlanGeneratorService } from '../services/OnboardingPlanGeneratorService.js';
import { adaptiveOnboardingService } from '../services/AdaptiveOnboardingService.js';

class OnboardingPlanController {
  async getNextAction(req, res, next) {
    try {
      const plan = await onboardingPlanService.getPlan(
        req.user.organizationId,
        req.params.planId
      );
      
      const result = adaptiveOnboardingService.getNextAction(plan);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async completeTask(req, res, next) {
    try {
      const plan = await adaptiveOnboardingService.completeTask(
        req.user.organizationId,
        req.user.userId,
        req.params.planId,
        req.params.taskId,
        req.body
      );
      
      res.status(200).json({
        success: true,
        data: plan
      });
    } catch (error) {
      next(error);
    }
  }
  async generatePlan(req, res, next) {
    try {
      const plan = await onboardingPlanGeneratorService.generatePlan(
        req.user.organizationId,
        req.user.userId,
        req.params.employeeId,
        req.body
      );
      
      res.status(201).json({
        success: true,
        data: plan
      });
    } catch (error) {
      next(error);
    }
  }
  async createPlan(req, res, next) {
    try {
      const plan = await onboardingPlanService.createPlan(
        req.user.organizationId,
        req.user.userId,
        req.body
      );
      
      res.status(201).json({
        success: true,
        data: plan
      });
    } catch (error) {
      next(error);
    }
  }

  async getPlan(req, res, next) {
    try {
      const plan = await onboardingPlanService.getPlan(
        req.user.organizationId,
        req.params.planId
      );
      
      res.status(200).json({
        success: true,
        data: plan
      });
    } catch (error) {
      next(error);
    }
  }

  async listEmployeePlans(req, res, next) {
    try {
      const plans = await onboardingPlanService.listEmployeePlans(
        req.user.organizationId,
        req.params.employeeId
      );
      
      res.status(200).json({
        success: true,
        data: plans
      });
    } catch (error) {
      next(error);
    }
  }

  async updatePlanStatus(req, res, next) {
    try {
      const plan = await onboardingPlanService.updatePlanStatus(
        req.user.organizationId,
        req.params.planId,
        req.body.status
      );
      
      res.status(200).json({
        success: true,
        data: plan
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new OnboardingPlanController();
