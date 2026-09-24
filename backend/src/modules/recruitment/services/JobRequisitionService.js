import jobRequisitionRepository from '../repositories/JobRequisitionRepository.js';
import requisitionHistoryRepository from '../repositories/RequisitionHistoryRepository.js';
import jobPostingService from './JobPostingService.js';
import approvalInstanceRepository from '../repositories/ApprovalInstanceRepository.js';
import approvalWorkflowTemplateRepository from '../repositories/ApprovalWorkflowTemplateRepository.js';
import { requisitionPayloadSchema, updateRequisitionPayloadSchema } from '../validators/requisitionValidator.js';
import { ValidationError, NotFoundError, ForbiddenError, ConflictError } from '#@/core/errors/AppError.js';
import { runInTransaction } from '#@/platform/database/db.js';

class JobRequisitionService {
  async createRequisition(payload, organizationId, userId) {
    const parseResult = requisitionPayloadSchema.safeParse(payload);
    if (!parseResult.success) {
      throw new ValidationError('Invalid job requisition payload', parseResult.error.errors);
    }
    const validatedData = parseResult.data;

    return await runInTransaction(async (session) => {
      const jobCode = await jobRequisitionRepository.generateJobCode(organizationId, { session });
      
      const reqData = {
        ...validatedData,
        jobCode,
        createdBy: userId,
        updatedBy: userId
      };

      const requisition = await jobRequisitionRepository.createScoped(reqData, organizationId, { session });

      await requisitionHistoryRepository.logHistory({
        requisitionId: requisition._id,
        action: 'CREATED',
        performedBy: userId,
        newValue: requisition.toObject()
      }, organizationId, { session });

      return requisition;
    });
  }

  async updateRequisition(id, payload, organizationId, userId) {
    const parseResult = updateRequisitionPayloadSchema.safeParse(payload);
    if (!parseResult.success) {
      throw new ValidationError('Invalid update payload', parseResult.error.errors);
    }
    
    return await runInTransaction(async (session) => {
      const existing = await jobRequisitionRepository.findActiveByIdAndTenant(id, organizationId, { session });
      if (!existing) throw new NotFoundError('Requisition not found or archived');
      if (existing.workflowStatus === 'CLOSED') throw new ForbiddenError('Cannot edit a closed requisition');

      let version = existing.version;
      // Increment version only if it's already published
      if (existing.publishStatus === 'PUBLISHED') {
        version += 1;
      }

      const updated = await jobRequisitionRepository.updateByIdAndTenant(
        id,
        { ...parseResult.data, version, updatedBy: userId },
        organizationId,
        { session }
      );

      await requisitionHistoryRepository.logHistory({
        requisitionId: id,
        action: 'EDITED',
        performedBy: userId,
        oldValue: existing.toObject(),
        newValue: updated.toObject()
      }, organizationId, { session });

      return updated;
    });
  }

  async submitForApproval(id, organizationId, userId) {
    return await runInTransaction(async (session) => {
      const requisition = await jobRequisitionRepository.findActiveByIdAndTenant(id, organizationId, { session });
      if (!requisition) throw new NotFoundError('Requisition not found');
      if (requisition.approvalStatus !== 'DRAFT' && requisition.approvalStatus !== 'REJECTED') {
        throw new ConflictError('Requisition is already pending approval or approved');
      }
      if (!requisition.approvalWorkflowTemplateId) {
        throw new ConflictError('No approval workflow template assigned to this requisition');
      }

      const template = await approvalWorkflowTemplateRepository.findByIdAndTenant(requisition.approvalWorkflowTemplateId, organizationId, { session });
      if (!template || !template.steps.length) {
        throw new ConflictError('Approval template is invalid or has no steps');
      }

      // Generate the runtime instance
      const approvalInstance = {
        requisitionId: id,
        currentStep: 1,
        status: 'IN_PROGRESS',
        steps: template.steps.map(step => ({
          stepId: step._id,
          principalType: step.principalType,
          principalId: step.principalId,
          status: 'PENDING'
        }))
      };

      await approvalInstanceRepository.createScoped(approvalInstance, organizationId, { session });

      const updatedReq = await jobRequisitionRepository.updateByIdAndTenant(
        id, 
        { approvalStatus: 'PENDING_APPROVAL', updatedBy: userId }, 
        organizationId, 
        { session }
      );

      await requisitionHistoryRepository.logHistory({
        requisitionId: id,
        action: 'SUBMITTED',
        performedBy: userId,
        comment: 'Submitted for approval chain'
      }, organizationId, { session });

      return updatedReq;
    });
  }

  async publishRequisition(id, organizationId, userId) {
    return await runInTransaction(async (session) => {
      const requisition = await jobRequisitionRepository.findActiveByIdAndTenant(id, organizationId, { session });
      if (!requisition) throw new NotFoundError('Requisition not found');
      
      if (requisition.approvalStatus !== 'APPROVED') {
        throw new ForbiddenError('Requisition must be APPROVED before publishing');
      }
      if (requisition.publishStatus === 'PUBLISHED') {
        throw new ConflictError('Requisition is already published');
      }

      const updated = await jobRequisitionRepository.updateByIdAndTenant(
        id,
        { 
          workflowStatus: 'ACTIVE',
          publishStatus: 'PUBLISHED',
          publishedBy: userId,
          publishedAt: new Date(),
          updatedBy: userId
        },
        organizationId,
        { session }
      );

      await requisitionHistoryRepository.logHistory({
        requisitionId: id,
        action: 'PUBLISHED',
        performedBy: userId
      }, organizationId, { session });

      // Sync public JobPosting snapshot
      await jobPostingService.syncJobPosting(updated, userId, session);
      return updated;
    });
  }
  async getRequisitions(filters, organizationId) {
    const { page = 1, limit = 20, status, departmentId } = filters;
    const queryFilter = { workflowStatus: { $ne: 'ARCHIVED' } };
    if (status) queryFilter.workflowStatus = status;
    if (departmentId) queryFilter.departmentId = departmentId;

    return await jobRequisitionRepository.findPaginated(
      { filter: queryFilter, page, limit, sort: { createdAt: -1 } },
      organizationId
    );
  }

  async getRequisitionById(id, organizationId) {
    const requisition = await jobRequisitionRepository.findActiveByIdAndTenant(id, organizationId);
    if (!requisition) throw new NotFoundError('Requisition not found');
    return requisition;
  }

  async approveRequisition(id, organizationId, user) {
    return await runInTransaction(async (session) => {
      const requisition = await jobRequisitionRepository.findActiveByIdAndTenant(id, organizationId, { session });
      if (!requisition) throw new NotFoundError('Requisition not found');
      if (requisition.approvalStatus !== 'PENDING_APPROVAL') {
        throw new ConflictError('Requisition is not pending approval');
      }

      const instance = await approvalInstanceRepository.findOne({ requisitionId: id, status: 'IN_PROGRESS' }, organizationId, { session });
      if (!instance) throw new NotFoundError('Approval instance not found');

      const currentStepObj = instance.steps[instance.currentStep - 1];
      
      // Validate that the user is authorized to approve this step
      let isAuthorized = false;
      if (currentStepObj.principalType === 'USER' && String(user.userId) === String(currentStepObj.principalId)) {
        isAuthorized = true;
      } else if (currentStepObj.principalType === 'ROLE' && user.roleIds && user.roleIds.includes(String(currentStepObj.principalId))) {
        isAuthorized = true;
      } else if (currentStepObj.principalType === 'DEPARTMENT' && String(user.departmentId) === String(currentStepObj.principalId)) {
        isAuthorized = true;
      }

      // If Super Admin (* permission), bypass
      if (user.permissions && user.permissions.includes('*')) {
        isAuthorized = true;
      }

      if (!isAuthorized) {
        throw new ForbiddenError('You are not authorized to approve this step');
      }

      if (currentStepObj.status === 'APPROVED') {
        throw new ConflictError('Step is already approved');
      }

      // Approve step
      currentStepObj.status = 'APPROVED';
      currentStepObj.actedBy = user.userId;
      currentStepObj.actedAt = new Date();

      let newStatus = 'PENDING_APPROVAL';
      // If final step
      if (instance.currentStep === instance.steps.length) {
        instance.status = 'APPROVED';
        newStatus = 'APPROVED';
      } else {
        instance.currentStep += 1;
      }

      await approvalInstanceRepository.updateByIdAndTenant(instance._id, instance, organizationId, { session });

      const updatedReq = await jobRequisitionRepository.updateByIdAndTenant(
        id,
        { approvalStatus: newStatus, updatedBy: user.userId },
        organizationId,
        { session }
      );

      await requisitionHistoryRepository.logHistory({
        requisitionId: id,
        action: 'APPROVED',
        performedBy: user.userId,
        comment: `Approved step ${instance.currentStep - (newStatus === 'APPROVED' ? 0 : 1)}`
      }, organizationId, { session });

      return updatedReq;
    });
  }

  async rejectRequisition(id, organizationId, user, payload = {}) {
    return await runInTransaction(async (session) => {
      const requisition = await jobRequisitionRepository.findActiveByIdAndTenant(id, organizationId, { session });
      if (!requisition) throw new NotFoundError('Requisition not found');
      if (requisition.approvalStatus === 'REJECTED') {
        throw new ConflictError('Requisition is already rejected');
      }
      if (requisition.approvalStatus !== 'PENDING_APPROVAL') {
        throw new ConflictError('Requisition is not pending approval');
      }

      const instance = await approvalInstanceRepository.findOne({ requisitionId: id, status: 'IN_PROGRESS' }, organizationId, { session });
      if (!instance) throw new NotFoundError('Approval instance not found');

      const currentStepObj = instance.steps[instance.currentStep - 1];

      // Validate that the user is authorized to reject this step
      let isAuthorized = false;
      if (currentStepObj.principalType === 'USER' && String(user.userId) === String(currentStepObj.principalId)) {
        isAuthorized = true;
      } else if (currentStepObj.principalType === 'ROLE' && user.roleIds && user.roleIds.includes(String(currentStepObj.principalId))) {
        isAuthorized = true;
      } else if (currentStepObj.principalType === 'DEPARTMENT' && String(user.departmentId) === String(currentStepObj.principalId)) {
        isAuthorized = true;
      }

      // If Super Admin (* permission), bypass
      if (user.permissions && user.permissions.includes('*')) {
        isAuthorized = true;
      }

      if (!isAuthorized) {
        throw new ForbiddenError('You are not authorized to reject this step');
      }

      currentStepObj.status = 'REJECTED';
      currentStepObj.actedBy = user.userId;
      currentStepObj.actedAt = new Date();
      currentStepObj.comments = payload.reason || 'Not specified';

      instance.status = 'REJECTED';
      await approvalInstanceRepository.updateByIdAndTenant(instance._id, instance, organizationId, { session });

      const updatedReq = await jobRequisitionRepository.updateByIdAndTenant(
        id,
        { approvalStatus: 'REJECTED', updatedBy: user.userId },
        organizationId,
        { session }
      );

      await requisitionHistoryRepository.logHistory({
        requisitionId: id,
        action: 'REJECTED',
        performedBy: user.userId,
        comment: payload.reason || 'Not specified'
      }, organizationId, { session });

      return updatedReq;
    });
  }
  async closeRequisition(id, organizationId, userId) {
    return await runInTransaction(async (session) => {
      const existing = await jobRequisitionRepository.findActiveByIdAndTenant(id, organizationId, { session });
      if (!existing) throw new NotFoundError('Requisition not found');
      if (existing.workflowStatus === 'CLOSED') throw new ConflictError('Requisition is already closed');

      const updated = await jobRequisitionRepository.updateByIdAndTenant(
        id,
        { workflowStatus: 'CLOSED', closedAt: new Date(), updatedBy: userId },
        organizationId,
        { session }
      );

      await requisitionHistoryRepository.logHistory({
        requisitionId: id,
        action: 'CLOSED',
        performedBy: userId
      }, organizationId, { session });

      if (existing.publishStatus === 'PUBLISHED') {
        await jobPostingService.closeJobPosting(id, organizationId, session);
      }
      return updated;
    });
  }

  async deleteRequisition(id, organizationId, userId) {
    return await runInTransaction(async (session) => {
      const existing = await jobRequisitionRepository.findActiveByIdAndTenant(id, organizationId, { session });
      if (!existing) throw new NotFoundError('Requisition not found');

      const updated = await jobRequisitionRepository.updateByIdAndTenant(
        id,
        { workflowStatus: 'ARCHIVED', updatedBy: userId },
        organizationId,
        { session }
      );

      await requisitionHistoryRepository.logHistory({
        requisitionId: id,
        action: 'ARCHIVED',
        performedBy: userId,
        comment: 'Soft deleted requisition'
      }, organizationId, { session });

      return updated;
    });
  }
}

export const jobRequisitionService = new JobRequisitionService();
export default jobRequisitionService;
