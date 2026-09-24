import candidateProfileService from '../services/CandidateProfileService.js';

class CandidateProfileController {
  async getProfile(req, res, next) {
    try {
      const organizationId = req.tenantContext.organizationId;
      const candidateId = req.candidate.candidateId;

      const result = await candidateProfileService.getProfile(candidateId, organizationId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req, res, next) {
    try {
      const organizationId = req.tenantContext.organizationId;
      const candidateId = req.candidate.candidateId;
      const payload = req.body;

      const result = await candidateProfileService.updateProfile(candidateId, organizationId, payload);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

export const openApiMetadata = {
  getProfile: {
    security: [{ BearerAuth: [] }]
  },
  updateProfile: {
    security: [{ BearerAuth: [] }],
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              firstName: { type: 'string' },
              lastName: { type: 'string' },
              phone: { type: 'string' },
              headline: { type: 'string' },
              summary: { type: 'string' },
              skills: { type: 'array', items: { type: 'string' } }
            }
          }
        }
      }
    }
  }
};

export default new CandidateProfileController();
