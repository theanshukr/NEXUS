import jobPostingService from '../services/JobPostingService.js';

class JobPostingController {
  async getPublicJobs(req, res, next) {
    try {
      const organizationId = req.tenantContext.organizationId;
      const result = await jobPostingService.getPublicJobs(req.query, organizationId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getPublicJobByIdOrSlug(req, res, next) {
    try {
      const organizationId = req.tenantContext.organizationId;
      const { idOrSlug } = req.params;
      const result = await jobPostingService.getPublicJobByIdOrSlug(idOrSlug, organizationId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

export default new JobPostingController();
