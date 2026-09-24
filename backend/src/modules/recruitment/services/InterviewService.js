import { NotFoundError, ValidationError, ForbiddenError } from '#@/core/errors/AppError.js';
import { runInTransaction } from '#@/platform/database/db.js';
import Interview from '../models/Interview.js';
import JobApplication from '../models/JobApplication.js';
import ApplicationHistory from '../models/ApplicationHistory.js';
import ApplicationWorkflowInstance from '../models/ApplicationWorkflowInstance.js';

export class InterviewService {
  async scheduleInterview(applicationId, organizationId, payload, userContext) {
    const application = await JobApplication.findOne({ _id: applicationId, organizationId });
    if (!application) {
      throw new NotFoundError('Job application not found.');
    }

    if (['HIRED', 'REJECTED', 'WITHDRAWN'].includes(application.status)) {
      throw new ValidationError(`Cannot schedule an interview for application in ${application.status} status.`);
    }

    const workflowInstance = await ApplicationWorkflowInstance.findOne({ _id: application.workflowInstanceId });
    if (!workflowInstance) {
      throw new NotFoundError('Application workflow not found.');
    }

    const interview = new Interview({
      organizationId,
      applicationId,
      workflowInstanceId: workflowInstance._id,
      stageId: payload.stageId,
      round: payload.round,
      title: payload.title,
      interviewType: payload.interviewType,
      scheduledStart: payload.scheduledStart,
      scheduledEnd: payload.scheduledEnd,
      timezone: payload.timezone,
      meetingUrl: payload.meetingUrl,
      location: payload.location,
      interviewerIds: payload.interviewerIds,
      createdBy: userContext.userId
    });

    await runInTransaction(async (session) => {
      await interview.save({ session });
      
      const history = new ApplicationHistory({
        applicationId,
        organizationId,
        action: 'Interview Scheduled',
        performedBy: userContext.userId,
        performedByType: 'User',
        comment: `Interview scheduled: ${payload.title} (${payload.interviewType})`
      });
      await history.save({ session });
    });

    // TODO: Send email notification to interviewers and candidate

    return interview;
  }

  async getInterviews(applicationId, organizationId) {
    return await Interview.find({ applicationId, organizationId }).populate('interviewerIds', 'firstName lastName email').sort({ scheduledStart: 1 });
  }

  async getInterviewById(interviewId, organizationId) {
    const interview = await Interview.findOne({ _id: interviewId, organizationId }).populate('interviewerIds', 'firstName lastName email');
    if (!interview) throw new NotFoundError('Interview not found.');
    return interview;
  }

  async getCandidateInterviews(candidateId, organizationId, applicationId = null) {
    const query = { candidateId, organizationId };
    if (applicationId) {
      query._id = applicationId;
    }
    const applications = await JobApplication.find(query).select('_id');
    const appIds = applications.map(a => a._id);

    return await Interview.find({ applicationId: { $in: appIds }, organizationId }).populate('interviewerIds', 'firstName lastName').sort({ scheduledStart: 1 });
  }

  async updateInterview(interviewId, organizationId, payload, userContext) {
    const interview = await Interview.findOne({ _id: interviewId, organizationId });
    if (!interview) throw new NotFoundError('Interview not found.');
    if (interview.status !== 'SCHEDULED') {
      throw new ValidationError(`Cannot update interview in ${interview.status} status.`);
    }

    Object.assign(interview, payload);
    interview.updatedBy = userContext.userId;
    await interview.save();

    // TODO: Send email notification for interview update

    return interview;
  }

  async cancelInterview(interviewId, organizationId, userContext) {
    const interview = await Interview.findOne({ _id: interviewId, organizationId });
    if (!interview) throw new NotFoundError('Interview not found.');
    if (interview.status !== 'SCHEDULED') {
      throw new ValidationError(`Cannot cancel interview in ${interview.status} status.`);
    }

    interview.status = 'CANCELLED';
    interview.updatedBy = userContext.userId;

    await runInTransaction(async (session) => {
      await interview.save({ session });

      const history = new ApplicationHistory({
        applicationId: interview.applicationId,
        organizationId,
        action: 'Interview Cancelled',
        performedBy: userContext.userId,
        performedByType: 'User',
        comment: `Interview cancelled: ${interview.title}`
      });
      await history.save({ session });
    });

    // TODO: Send email notification for interview cancellation

    return interview;
  }

  async submitEvaluation(interviewId, organizationId, payload, userContext) {
    const interview = await Interview.findOne({ _id: interviewId, organizationId });
    if (!interview) throw new NotFoundError('Interview not found.');
    if (interview.status === 'CANCELLED' || interview.status === 'NO_SHOW') {
      throw new ValidationError(`Cannot evaluate interview in ${interview.status} status.`);
    }
    if (interview.status === 'COMPLETED' && interview.evaluatorId) {
      throw new ValidationError('Interview has already been evaluated.');
    }

    // Only allow assigned interviewers to evaluate (or admins) - keeping it simple, any HR can evaluate for now as long as they have access to this endpoint
    
    interview.status = 'COMPLETED';
    interview.evaluatorId = userContext.userId;
    interview.technicalScore = payload.technicalScore;
    interview.communicationScore = payload.communicationScore;
    interview.cultureScore = payload.cultureScore;
    interview.overallScore = payload.overallScore;
    interview.recommendation = payload.recommendation;
    interview.comments = payload.comments;
    interview.evaluatedAt = new Date();
    interview.updatedBy = userContext.userId;

    await runInTransaction(async (session) => {
      await interview.save({ session });

      const history = new ApplicationHistory({
        applicationId: interview.applicationId,
        organizationId,
        action: 'Interview Completed',
        performedBy: userContext.userId,
        performedByType: 'User',
        comment: `Interview evaluated with recommendation: ${payload.recommendation}`
      });
      await history.save({ session });
    });

    return interview;
  }
}

export default new InterviewService();
