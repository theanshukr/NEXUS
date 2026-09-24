import RoleDelegationService from '#@/modules/roles/services/RoleDelegationService.js';


export const openApiMetadata = {
  getPolicies: {
    summary: 'getPolicies',
    description: '',
    tags: ['RoleDelegation']
  },
  createPolicy: {
    summary: 'createPolicy',
    description: '',
    tags: ['RoleDelegation']
  },
  deletePolicy: {
    summary: 'deletePolicy',
    description: '',
    tags: ['RoleDelegation']
  }
};

export class RoleDelegationController {
  async getPolicies(req, res, next) {
    try {
      const policies = await RoleDelegationService.getPolicies(req.user.organizationId);
      res.status(200).json({
        success: true,
        data: policies
      });
    } catch (error) {
      next(error);
    }
  }

  async createPolicy(req, res, next) {
    try {
      const policy = await RoleDelegationService.createPolicy(req.body, req.user);
      res.status(201).json({
        success: true,
        data: policy,
        message: 'Role delegation policy created successfully.'
      });
    } catch (error) {
      next(error);
    }
  }

  async deletePolicy(req, res, next) {
    try {
      const { id } = req.params;
      const result = await RoleDelegationService.deletePolicy(id, req.user);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Role delegation policy deleted successfully.'
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new RoleDelegationController();
