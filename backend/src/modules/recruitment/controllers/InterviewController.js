import interviewService from '../services/InterviewService.js';

import { scheduleInterviewSchema, evaluateInterviewSchema } from '../validators/interview.validator.js';
import { validate } from '#@/core/middleware/validator.js';

export class InterviewController {
  async scheduleInterview(req, res, next) {
    try {
      const interview = await interviewService.scheduleInterview(req.params.id, req.tenantContext.organizationId, req.body, req.user);
      return res.status(200).json({ success: true, message: 'Success', data: interview });
    } catch (error) {
      next(error);
    }
  }

  async getInterviewsForApplication(req, res, next) {
    try {
      const interviews = await interviewService.getInterviews(req.params.id, req.tenantContext.organizationId);
      return res.status(200).json({ success: true, data: interviews });
    } catch (error) {
      next(error);
    }
  }

  async getInterview(req, res, next) {
    try {
      const interview = await interviewService.getInterviewById(req.params.interviewId, req.tenantContext.organizationId);
      return res.status(200).json({ success: true, data: interview });
    } catch (error) {
      next(error);
    }
  }

  async getCandidateInterviews(req, res, next) {
    try {
      // Candidate accessing their own interviews
      const interviews = await interviewService.getCandidateInterviews(req.candidate.candidateId, req.tenantContext.organizationId);
      return res.status(200).json({ success: true, data: interviews });
    } catch (error) {
      next(error);
    }
  }

  async updateInterview(req, res, next) {
    try {
      const interview = await interviewService.updateInterview(req.params.interviewId, req.tenantContext.organizationId, req.body, req.user);
      return res.status(200).json({ success: true, data: interview });
    } catch (error) {
      next(error);
    }
  }

  async cancelInterview(req, res, next) {
    try {
      const interview = await interviewService.cancelInterview(req.params.interviewId, req.tenantContext.organizationId, req.user);
      return res.status(200).json({ success: true, data: interview });
    } catch (error) {
      next(error);
    }
  }

  async evaluateInterview(req, res, next) {
    try {
      const interview = await interviewService.submitEvaluation(req.params.interviewId, req.tenantContext.organizationId, req.body, req.user);
      return res.status(200).json({ success: true, data: interview });
    } catch (error) {
      next(error);
    }
  }
}

export const openApiMetadata = {
  getCandidateInterviews: {
    security: [{ BearerAuth: [] }]
  },
  updateInterview: {
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              interviewType: { type: 'string', enum: ['ONLINE', 'OFFLINE', 'PHONE'] },
              scheduledStart: { type: 'string', format: 'date-time' },
              scheduledEnd: { type: 'string', format: 'date-time' },
              timezone: { type: 'string' },
              meetingUrl: { type: 'string' },
              location: { type: 'string' },
              interviewerIds: { type: 'array', items: { type: 'string' } }
            }
          }
        }
      }
    }
  }
};

export default new InterviewController();
