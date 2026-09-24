import OrganizationService from '#@/modules/organization/services/OrganizationService.js';


export const openApiMetadata = {
  createOrganization: {
    summary: 'createOrganization',
    description: '',
    tags: ['Organization']
  },
  getMyOrganization: {
    summary: 'getMyOrganization',
    description: '',
    tags: ['Organization']
  }
};

export class OrganizationController {
  async createOrganization(req, res, next) {
    try {
      const result = await OrganizationService.createOrganization(req.body);
      res.status(201).json({
        success: true,
        data: result,
        message: `Organization '${result.organization.name}' provisioned successfully with root Super Admin and system role templates.`
      });
    } catch (error) {
      next(error);
    }
  }

  async getMyOrganization(req, res, next) {
    try {
      const org = await OrganizationService.getOrganization(req.user.organizationId);
      res.status(200).json({
        success: true,
        data: org
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new OrganizationController();
