import mongoose from 'mongoose';
import { runInTransaction } from '#@/platform/database/db.js';
import { NotFoundError, ForbiddenError, ConflictError } from '#@/core/errors/AppError.js';
import documentService from '#@/modules/documents/services/DocumentService.js';
import JobApplication from '../models/JobApplication.js';
import ApplicationWorkflowInstance from '../models/ApplicationWorkflowInstance.js';
import ApplicationStageInstance from '../models/ApplicationStageInstance.js';
import ApplicationHistory from '../models/ApplicationHistory.js';
import JobPosting from '../models/JobPosting.js';
import JobRequisition from '../models/JobRequisition.js';

export class AtsApplicationService {
  /**
   * List applications for a specific Job Requisition.
   */
  async getApplicationsForRequisition(requisitionId, organizationId, filters) {
    const posting = await JobPosting.findOne({ jobRequisitionId: requisitionId, organizationId });
    if (!posting) {
      return []; // No posting means no applications
    }

    const queryFilter = { jobPostingId: posting._id, organizationId };
    if (filters.status) queryFilter.status = filters.status;

    return await JobApplication.find(queryFilter)
      .populate('candidateId', 'email')
      .populate('workflowInstanceId', 'currentStageId')
      .sort({ appliedAt: -1 });
  }

  /**
   * Get application details, including workflow snapshot and stages.
   */
  async getApplicationDetails(applicationId, organizationId) {
    const application = await JobApplication.findOne({ _id: applicationId, organizationId })
      .populate('candidateId', 'email')
      .populate('workflowInstanceId');
      
    if (!application) throw new NotFoundError('Application not found');

    const stages = await ApplicationStageInstance.find({ applicationId, organizationId }).sort({ order: 1 });

    return { application, stages };
  }

  /**
   * Advance the application to the next stage
   */
  async advanceStage(applicationId, organizationId, userId) {
    return await runInTransaction(async (session) => {
      const application = await JobApplication.findOne({ _id: applicationId, organizationId }).session(session);
      if (!application) throw new NotFoundError('Application not found');
      
      if (['REJECTED', 'HIRED', 'WITHDRAWN'].includes(application.status)) {
        throw new ConflictError(`Cannot advance a ${application.status} application.`);
      }

      const workflow = await ApplicationWorkflowInstance.findOne({ applicationId, organizationId }).session(session);
      if (!workflow) throw new NotFoundError('Workflow instance not found');

      const stages = await ApplicationStageInstance.find({ applicationId, organizationId }).sort({ order: 1 }).session(session);
      
      const currentStageIndex = stages.findIndex(s => s.status === 'IN_PROGRESS' || s.status === 'PENDING'); // Find the active one
      if (currentStageIndex === -1 || currentStageIndex === stages.length - 1) {
        throw new ConflictError('No further stages to advance to. Please use the Offer/Hire workflow.');
      }

      const currentStage = stages[currentStageIndex];
      const nextStage = stages[currentStageIndex + 1];

      currentStage.status = 'COMPLETED';
      currentStage.completedAt = new Date();
      await currentStage.save({ session });

      nextStage.status = 'IN_PROGRESS';
      nextStage.startedAt = new Date();
      await nextStage.save({ session });

      workflow.currentStageId = nextStage.stageId;
      await workflow.save({ session });
      
      // Update application status logically based on stage type
      const stageDefinition = workflow.workflowSnapshot.find(s => s._id.toString() === nextStage.stageId);
      if (stageDefinition && ['SCREENING', 'INTERVIEW', 'ASSESSMENT', 'OFFER'].includes(stageDefinition.type)) {
         application.status = stageDefinition.type;
         await application.save({ session });
      }

      await new ApplicationHistory({
        applicationId,
        organizationId,
        action: 'Screened', // Using Screened broadly, could be more granular
        performedBy: userId,
        comment: `Advanced to stage: ${stageDefinition ? stageDefinition.name : 'Next'}`
      }).save({ session });

      return { application, currentStage, nextStage };
    });
  }

  /**
   * Reject a candidate application.
   */
  async rejectApplication(applicationId, organizationId, userId, payload = {}) {
    return await runInTransaction(async (session) => {
      const application = await JobApplication.findOne({ _id: applicationId, organizationId }).session(session);
      if (!application) throw new NotFoundError('Application not found');
      
      if (application.status === 'REJECTED') {
        throw new ConflictError('Application is already rejected.');
      }
      if (application.status === 'HIRED') {
        throw new ConflictError('Cannot reject a hired application.');
      }
      if (application.status === 'WITHDRAWN') {
        throw new ConflictError('Cannot reject a withdrawn application.');
      }

      application.status = 'REJECTED';
      application.rejectedReason = payload.reason || 'Not specified';
      await application.save({ session });

      await new ApplicationHistory({
        applicationId,
        organizationId,
        action: 'Rejected',
        performedBy: userId,
        performedByType: 'User',
        comment: payload.reason || 'Not specified'
      }).save({ session });

      return application;
    });
  }

  /**
   * Securely download a candidate's resume via ATS dynamic authorization.
   * Enforces that the recruiter has `recruitment.application.view` permission for this tenant.
   */
  async downloadCandidateDocument(applicationId, documentId, organizationId, userPrincipal) {
    // 1. Verify the application exists in this tenant
    const application = await JobApplication.findOne({ _id: applicationId, organizationId });
    if (!application) {
      throw new NotFoundError('Application not found');
    }

    // 2. Verify the document belongs to this application
    if (application.submittedResumeDocumentId.toString() !== documentId && 
        (application.submittedCoverLetterDocumentId && application.submittedCoverLetterDocumentId.toString() !== documentId)) {
      throw new ForbiddenError('Requested document is not associated with this application.');
    }

    // 3. Evaluate ATS RBAC
    // Note: The middleware `hasPermission('recruitment.application.view')` handles the fundamental access.
    // In the future, this is where we check if the user is the assigned recruiter or interviewer for this specific application.

    // 4. Download directly via DocumentService using SYSTEM override or bypassing ownership checks
    // We fetch the document bypassing the owner check because the ATS layer just validated authorization
    const document = await documentService.getDocument(documentId, organizationId);
    
    if (document.status === 'ARCHIVED') {
      throw new ForbiddenError('Access Denied: Archived documents cannot be downloaded.');
    }

    const { storageService } = await import('#@/platform/storage/index.js');
    const buffer = await storageService.download(document.storagePath);
    
    return { document, buffer };
  }
}

export default new AtsApplicationService();
