import LeavePolicyService from '../services/LeavePolicyService.js';
import { ValidationError } from '#@/core/errors/AppError.js';

export const openApiMetadata = {
  getActivePolicies: { summary: 'Get Active Policies', description: 'Returns all active leave policies for the organization', tags: ['Leave Management'] },
  updatePolicy: { summary: 'Update Leave Policy', description: 'Updates a leave policy, automatically archiving the old version and creating a new one', tags: ['Leave Management'] }
};

class LeavePolicyController {
  async getActivePolicies(req, res, next) {
    try {
      const policies = await LeavePolicyService.getActivePolicies(req.user.organizationId);
      res.status(200).json({ success: true, data: policies });
    } catch (error) { next(error); }
  }

  async updatePolicy(req, res, next) {
    try {
      const { code } = req.params;
      if (!code) throw new ValidationError('Policy code is required');
      
      const policy = await LeavePolicyService.updatePolicy(
        req.user.organizationId,
        code.toUpperCase(),
        req.body,
        req.user.userId
      );
      
      res.status(200).json({ success: true, data: policy, message: 'Policy updated successfully' });
    } catch (error) { next(error); }
  }
}

export default new LeavePolicyController();
