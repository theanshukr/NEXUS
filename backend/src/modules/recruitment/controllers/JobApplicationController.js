import jobApplicationService from '../services/JobApplicationService.js';


class JobApplicationController {
  async apply(req, res, next) {
    try {
      const organizationId = req.tenantContext.organizationId;
      const candidateId = req.candidate.candidateId;
      const { slugOrId } = req.params;
      
      const files = req.files || {};
      const payload = req.body;
      
      const application = await jobApplicationService.submitApplication(
        slugOrId,
        candidateId,
        organizationId,
        files,
        payload
      );
      
      res.status(201).json({ success: true, data: application });
    } catch (error) {
      next(error);
    }
  }

  async hireCandidate(req, res, next) {
    try {
      const result = await jobApplicationService.hireCandidate(req.params.id, req.tenantContext.organizationId, req.user, req.body || {});
      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getMyApplications(req, res, next) {
    try {
      const organizationId = req.tenantContext.organizationId;
      const candidateId = req.candidate.candidateId;
      
      const applications = await jobApplicationService.getCandidateApplications(candidateId, organizationId);
      
      res.status(200).json({ success: true, data: applications });
    } catch (error) {
      next(error);
    }
  }

  async withdrawApplication(req, res, next) {
    try {
      const organizationId = req.tenantContext.organizationId;
      const candidateId = req.candidate.candidateId;
      const application = await jobApplicationService.withdrawApplication(req.params.id, candidateId, organizationId);
      return res.status(200).json({ success: true, data: application });
    } catch (error) {
      next(error);
    }
  }
}

export const openApiMetadata = {
  apply: {
    security: [{ BearerAuth: [] }]
  },
  getMyApplications: {
    security: [{ BearerAuth: [] }]
  },
  hireCandidate: {
    security: [{ BearerAuth: [] }],
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              joiningDate: { type: 'string', format: 'date-time' },
              shiftId: { type: 'string' },
              departmentId: { type: 'string' },
              managerId: { type: 'string' },
              baseSalary: { type: 'number' },
              targetRoleId: { type: 'string' }
            }
          }
        }
      }
    }
  },
  withdrawApplication: {
    security: [{ BearerAuth: [] }]
  }
};

export default new JobApplicationController();
