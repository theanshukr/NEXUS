import { describe, it, expect, vi, beforeEach } from 'vitest';
import { jobRequisitionService } from '#@/modules/recruitment/services/JobRequisitionService.js';
import jobRequisitionRepository from '#@/modules/recruitment/repositories/JobRequisitionRepository.js';
import requisitionHistoryRepository from '#@/modules/recruitment/repositories/RequisitionHistoryRepository.js';
import approvalInstanceRepository from '#@/modules/recruitment/repositories/ApprovalInstanceRepository.js';
import approvalWorkflowTemplateRepository from '#@/modules/recruitment/repositories/ApprovalWorkflowTemplateRepository.js';
import mongoose from 'mongoose';
import { ValidationError, NotFoundError, ForbiddenError, ConflictError } from '#@/core/errors/AppError.js';

vi.mock('#@/modules/recruitment/repositories/JobRequisitionRepository.js');
vi.mock('#@/modules/recruitment/repositories/RequisitionHistoryRepository.js');
vi.mock('#@/modules/recruitment/repositories/ApprovalInstanceRepository.js');
vi.mock('#@/modules/recruitment/repositories/ApprovalWorkflowTemplateRepository.js');
vi.mock('#@/modules/recruitment/services/JobPostingService.js', () => ({
  default: {
    syncJobPosting: vi.fn().mockResolvedValue()
  }
}));

vi.mock('#@/platform/database/db.js', () => ({
  runInTransaction: vi.fn(async (callback) => {
    return await callback({}); // Mock passing a dummy session
  })
}));

describe('JobRequisitionService Unit Tests', () => {
  const mockOrgId = new mongoose.Types.ObjectId().toString();
  const mockUserId = new mongoose.Types.ObjectId().toString();
  const mockDeptId = new mongoose.Types.ObjectId().toString();
  const mockManagerId = new mongoose.Types.ObjectId().toString();
  const mockJobId = new mongoose.Types.ObjectId().toString();
  const mockTemplateId = new mongoose.Types.ObjectId().toString();

  const validPayload = {
    departmentId: mockDeptId,
    reportingManagerId: mockManagerId,
    title: 'Senior Engineer',
    description: 'Build stuff',
    location: 'Remote',
    employmentType: 'FULL_TIME',
    workMode: 'REMOTE',
    minimumExperienceYears: 5,
    maximumExperienceYears: 8,
    salary: { min: 100000, max: 150000, currency: 'USD', period: 'YEARLY' },
    openPositions: 2,
    approvalWorkflowTemplateId: mockTemplateId
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createRequisition', () => {
    it('Should generate job code, create requisition, and log history', async () => {
      jobRequisitionRepository.generateJobCode.mockResolvedValue('REC-2026-00001');
      
      const mockCreatedReq = { _id: mockJobId, ...validPayload, jobCode: 'REC-2026-00001', toObject: () => ({ id: mockJobId }) };
      jobRequisitionRepository.createScoped.mockResolvedValue(mockCreatedReq);
      
      const result = await jobRequisitionService.createRequisition(validPayload, mockOrgId, mockUserId);
      
      expect(jobRequisitionRepository.generateJobCode).toHaveBeenCalledWith(mockOrgId, { session: expect.anything() });
      expect(jobRequisitionRepository.createScoped).toHaveBeenCalled();
      expect(requisitionHistoryRepository.logHistory).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'CREATED', performedBy: mockUserId }),
        mockOrgId,
        { session: expect.anything() }
      );
      expect(result.jobCode).toBe('REC-2026-00001');
    });

    it('Should throw ValidationError if payload is invalid', async () => {
      await expect(jobRequisitionService.createRequisition({}, mockOrgId, mockUserId))
        .rejects.toThrow(ValidationError);
    });
  });

  describe('updateRequisition', () => {
    it('Should increment version if published and log history', async () => {
      const existing = { _id: mockJobId, version: 1, publishStatus: 'PUBLISHED', toObject: () => ({}) };
      jobRequisitionRepository.findActiveByIdAndTenant.mockResolvedValue(existing);
      jobRequisitionRepository.updateByIdAndTenant.mockResolvedValue({ _id: mockJobId, version: 2, toObject: () => ({}) });

      await jobRequisitionService.updateRequisition(mockJobId, validPayload, mockOrgId, mockUserId);

      expect(jobRequisitionRepository.updateByIdAndTenant).toHaveBeenCalledWith(
        mockJobId,
        expect.objectContaining({ version: 2 }), // Version incremented
        mockOrgId,
        { session: expect.anything() }
      );
      expect(requisitionHistoryRepository.logHistory).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'EDITED' }),
        mockOrgId,
        { session: expect.anything() }
      );
    });

    it('Should NOT increment version if unpublished', async () => {
      const existing = { _id: mockJobId, version: 1, publishStatus: 'UNPUBLISHED', toObject: () => ({}) };
      jobRequisitionRepository.findActiveByIdAndTenant.mockResolvedValue(existing);
      jobRequisitionRepository.updateByIdAndTenant.mockResolvedValue({ _id: mockJobId, version: 1, toObject: () => ({}) });

      await jobRequisitionService.updateRequisition(mockJobId, validPayload, mockOrgId, mockUserId);

      expect(jobRequisitionRepository.updateByIdAndTenant).toHaveBeenCalledWith(
        mockJobId,
        expect.objectContaining({ version: 1 }), // Version remains 1
        mockOrgId,
        { session: expect.anything() }
      );
    });
  });

  describe('submitForApproval', () => {
    it('Should create ApprovalInstance and update status to PENDING_APPROVAL', async () => {
      const req = { _id: mockJobId, approvalStatus: 'DRAFT', approvalWorkflowTemplateId: mockTemplateId };
      jobRequisitionRepository.findActiveByIdAndTenant.mockResolvedValue(req);
      
      const template = { _id: mockTemplateId, steps: [{ _id: 'step1', principalType: 'ROLE', principalId: 'role1' }] };
      approvalWorkflowTemplateRepository.findByIdAndTenant.mockResolvedValue(template);

      await jobRequisitionService.submitForApproval(mockJobId, mockOrgId, mockUserId);

      expect(approvalInstanceRepository.createScoped).toHaveBeenCalledWith(
        expect.objectContaining({ requisitionId: mockJobId, status: 'IN_PROGRESS' }),
        mockOrgId,
        { session: expect.anything() }
      );
      
      expect(jobRequisitionRepository.updateByIdAndTenant).toHaveBeenCalledWith(
        mockJobId,
        { approvalStatus: 'PENDING_APPROVAL', updatedBy: mockUserId },
        mockOrgId,
        { session: expect.anything() }
      );

      expect(requisitionHistoryRepository.logHistory).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'SUBMITTED' }),
        mockOrgId,
        { session: expect.anything() }
      );
    });

    it('Should throw ConflictError if already pending approval', async () => {
      const req = { _id: mockJobId, approvalStatus: 'PENDING_APPROVAL', approvalWorkflowTemplateId: mockTemplateId };
      jobRequisitionRepository.findActiveByIdAndTenant.mockResolvedValue(req);

      await expect(jobRequisitionService.submitForApproval(mockJobId, mockOrgId, mockUserId))
        .rejects.toThrow(ConflictError);
    });
  });

  describe('publishRequisition', () => {
    it('Should publish if APPROVED', async () => {
      const req = { _id: mockJobId, organizationId: mockOrgId, approvalStatus: 'APPROVED', publishStatus: 'UNPUBLISHED', title: 'Test', jobCode: 'TEST-001' };
      jobRequisitionRepository.findActiveByIdAndTenant.mockResolvedValue(req);
      jobRequisitionRepository.updateByIdAndTenant.mockResolvedValue(req);

      await jobRequisitionService.publishRequisition(mockJobId, mockOrgId, mockUserId);

      expect(jobRequisitionRepository.updateByIdAndTenant).toHaveBeenCalledWith(
        mockJobId,
        expect.objectContaining({ workflowStatus: 'ACTIVE', publishStatus: 'PUBLISHED' }),
        mockOrgId,
        { session: expect.anything() }
      );

      expect(requisitionHistoryRepository.logHistory).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'PUBLISHED' }),
        mockOrgId,
        { session: expect.anything() }
      );
    });

    it('Should throw ForbiddenError if not APPROVED', async () => {
      const req = { _id: mockJobId, approvalStatus: 'PENDING_APPROVAL', publishStatus: 'UNPUBLISHED' };
      jobRequisitionRepository.findActiveByIdAndTenant.mockResolvedValue(req);

      await expect(jobRequisitionService.publishRequisition(mockJobId, mockOrgId, mockUserId))
        .rejects.toThrow(ForbiddenError);
    });
  });
});
