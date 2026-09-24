import { createHash, randomBytes } from 'crypto';
import { runInTransaction } from '#@/platform/database/db.js';
import { NotFoundError, ValidationError, ConflictError } from '#@/core/errors/AppError.js';
import documentService from '#@/modules/documents/services/DocumentService.js';
import jobPostingRepository from '../repositories/JobPostingRepository.js';
import jobRequisitionRepository from '../repositories/JobRequisitionRepository.js';
import JobApplication from '../models/JobApplication.js';
import ApplicationWorkflowInstance from '../models/ApplicationWorkflowInstance.js';
import ApplicationStageInstance from '../models/ApplicationStageInstance.js';
import ApplicationHistory from '../models/ApplicationHistory.js';
import CandidateDocument from '#@/modules/candidate/models/CandidateDocument.js';
import HiringWorkflowTemplate from '../models/HiringWorkflowTemplate.js';
import Offer from '../models/Offer.js';
import Employee from '#@/modules/employees/models/Employee.js';
import Candidate from '#@/modules/candidate/models/Candidate.js';
import CandidateProfile from '#@/modules/candidate/models/CandidateProfile.js';
import Invitation from '#@/modules/invitations/models/Invitation.js';
import env from '#@/config/env.js';


export class JobApplicationService {
  /**
   * Submits a job application, handling multipart form data (resume/cover letter files).
   * Validates posting status, uploads documents to Storage, creates Application, 
   * creates WorkflowInstance, creates StageInstances, logs History.
   */
  async submitApplication(jobPostingIdOrSlug, candidateId, organizationId, files, payload) {
    // 1. Verify Job Posting is active
    let posting;
    if (jobPostingIdOrSlug.match(/^[0-9a-fA-F]{24}$/)) {
      posting = await jobPostingRepository.findByIdAndTenant(jobPostingIdOrSlug, organizationId);
    } else {
      posting = await jobPostingRepository.findBySlugAndTenant(jobPostingIdOrSlug, organizationId);
    }

    if (!posting || posting.status !== 'PUBLISHED') {
      throw new NotFoundError('Job posting not found or is no longer active.');
    }

    // 2. Prevent duplicate applications
    const existingApp = await JobApplication.findOne({ 
      jobPostingId: posting._id, 
      candidateId 
    });
    if (existingApp) {
      throw new ConflictError('You have already applied to this job posting.');
    }

    // 3. Extract Files
    const resumeFile = files.resume ? files.resume[0] : null;
    const coverLetterFile = files.coverLetter ? files.coverLetter[0] : null;

    if (!resumeFile) {
      throw new ValidationError('A resume file is required to apply.');
    }

    // 4. Resolve Workflow Template from Requisition
    const requisition = await jobRequisitionRepository.findByIdAndTenant(posting.jobRequisitionId, organizationId);
    if (!requisition) {
      throw new NotFoundError('Underlying Job Requisition not found.');
    }

    let workflowStages = requisition.customWorkflow;
    if (!workflowStages || workflowStages.length === 0) {
      if (requisition.workflowTemplateId) {
        const template = await HiringWorkflowTemplate.findOne({ _id: requisition.workflowTemplateId, organizationId });
        if (template) {
          workflowStages = template.stages;
        }
      }
    }

    if (!workflowStages || workflowStages.length === 0) {
      throw new ValidationError('Job Requisition has no defined hiring workflow.');
    }

    // Sort stages by order
    workflowStages.sort((a, b) => a.order - b.order);
    const firstStageId = workflowStages[0]._id.toString();

    let applicationNumber = `APP-${Math.floor(Date.now() / 1000).toString().substring(2)}-${Math.floor(Math.random() * 1000)}`;

    let resumeStoragePath = null;
    let coverLetterStoragePath = null;

    try {
      return await runInTransaction(async (session) => {
        // 5. Upload Resume via DocumentService
        const resumeMetadata = {
          category: 'candidate-resume',
          ownerType: 'CANDIDATE',
          ownerId: candidateId.toString(),
          description: `Resume for Job Posting ${posting.title}`
        };
        
        const resumeDoc = await documentService.createDocument(resumeFile, resumeMetadata, organizationId, candidateId);
        resumeStoragePath = resumeDoc.storagePath;
        
        // Store reference in CandidateDocument
        const candidateResume = new CandidateDocument({
          candidateId,
          organizationId,
          documentId: resumeDoc._id,
          type: 'RESUME',
          isDefault: true
        });
        await candidateResume.save({ session });

        // 6. Upload Cover Letter if exists
        let coverLetterDoc = null;
        if (coverLetterFile) {
          const clMetadata = {
            category: 'candidate-cover-letter',
            ownerType: 'CANDIDATE',
            ownerId: candidateId.toString(),
            description: `Cover Letter for Job Posting ${posting.title}`
          };
          coverLetterDoc = await documentService.createDocument(coverLetterFile, clMetadata, organizationId, candidateId);
          coverLetterStoragePath = coverLetterDoc.storagePath;
          
          const candidateCL = new CandidateDocument({
            candidateId,
            organizationId,
            documentId: coverLetterDoc._id,
            type: 'COVER_LETTER',
            isDefault: false
          });
          await candidateCL.save({ session });
        }

        // 7. Create JobApplication
        const application = new JobApplication({
          organizationId,
          jobPostingId: posting._id,
          candidateId,
          applicationNumber,
          submittedResumeDocumentId: resumeDoc._id,
          submittedCoverLetterDocumentId: coverLetterDoc ? coverLetterDoc._id : null,
          status: 'APPLIED',
          source: {
            type: 'CAREERS_PORTAL',
            reference: payload.referralCode || 'Website'
          },
          expectedSalary: payload.expectedSalary,
          noticePeriod: payload.noticePeriod,
          currentCompany: payload.currentCompany,
          currentCTC: payload.currentCTC,
          expectedCTC: payload.expectedCTC,
          availabilityDate: payload.availabilityDate
        });
        await application.save({ session });

        // 8. Create ApplicationWorkflowInstance
        const workflowInstance = new ApplicationWorkflowInstance({
          applicationId: application._id,
          organizationId,
          candidateId,
          workflowTemplateVersion: requisition.version,
          workflowSnapshot: workflowStages,
          currentStageId: firstStageId
        });
        await workflowInstance.save({ session });

        // 9. Update JobApplication with workflowInstanceId
        application.workflowInstanceId = workflowInstance._id;
        await application.save({ session });

        // 10. Create ApplicationStageInstance records
        const stageInstances = workflowStages.map((stage) => {
          return new ApplicationStageInstance({
            workflowInstanceId: workflowInstance._id,
            applicationId: application._id,
            organizationId,
            stageId: stage._id.toString(),
            order: stage.order,
            status: stage._id.toString() === firstStageId ? 'IN_PROGRESS' : 'PENDING'
          });
        });
        await ApplicationStageInstance.insertMany(stageInstances, { session });

        // 11. Create ApplicationHistory
        const history = new ApplicationHistory({
          applicationId: application._id,
          organizationId,
          action: 'Applied',
          performedBy: candidateId,
          performedByType: 'Candidate',
          comment: 'Application submitted successfully via Careers Portal'
        });
        await history.save({ session });

        // 12. Increment JobPosting applicationCount
        posting.applicationCount += 1;
        await posting.save({ session });

        return application;
      });
    } catch (error) {
      // Rollback uploaded files in storage if transaction failed
      const { storageService } = await import('#@/platform/storage/index.js');
      if (resumeStoragePath) {
        try { await storageService.delete(resumeStoragePath); } catch (e) { /* ignore */ }
      }
      if (coverLetterStoragePath) {
        try { await storageService.delete(coverLetterStoragePath); } catch (e) { /* ignore */ }
      }
      throw error;
    }
  }
  
  /**
   * Retrieves applications for a candidate (Public Portal)
   */
  async getCandidateApplications(candidateId, organizationId) {
    return await JobApplication.find({ candidateId, organizationId })
      .populate('jobPostingId', 'title slug location department workMode employmentType status')
      .sort({ appliedAt: -1 });
  }

  /**
   * Candidate withdraws their application.
   * Business rules: cannot withdraw after HIRED or after accepting an offer.
   */
  async withdrawApplication(applicationId, candidateId, organizationId) {
    const application = await JobApplication.findOne({ _id: applicationId, candidateId, organizationId });
    if (!application) {
      throw new NotFoundError('Job application not found.');
    }

    if (application.status === 'HIRED') {
      throw new ValidationError('Cannot withdraw an application after being hired.');
    }
    if (application.status === 'WITHDRAWN') {
      throw new ValidationError('Application is already withdrawn.');
    }

    // Block if candidate already accepted an offer
    const acceptedOffer = await Offer.findOne({ applicationId, organizationId, status: 'ACCEPTED' });
    if (acceptedOffer) {
      throw new ValidationError('Cannot withdraw an application after accepting an offer.');
    }

    application.status = 'WITHDRAWN';
    application.withdrawnAt = new Date();

    await runInTransaction(async (session) => {
      await application.save({ session });
      const history = new ApplicationHistory({
        applicationId,
        organizationId,
        action: 'Withdrawn',
        performedBy: candidateId,
        performedByType: 'Candidate',
        comment: 'Candidate voluntarily withdrew their application'
      });
      await history.save({ session });
    });

    return application;
  }

  /**
   * Hires a candidate: creates an Employee record, generates an invite token,
   * and updates Requisition filledPositions.
   * Idempotent — throws ConflictError if already HIRED.
   *
   * @param {string} applicationId
   * @param {string} organizationId
   * @param {object} userContext - { userId }
   * @param {object} [payload] - Optional { shiftId, managerId }
   */
  async hireCandidate(applicationId, organizationId, userContext, payload = {}) {
    const application = await JobApplication.findOne({ _id: applicationId, organizationId });
    if (!application) throw new NotFoundError('Job application not found.');

    if (application.status === 'HIRED') {
      throw new ConflictError('Candidate has already been hired for this application.');
    }
    if (['REJECTED', 'WITHDRAWN'].includes(application.status)) {
      throw new ValidationError(`Cannot hire candidate with application status: ${application.status}.`);
    }

    // Require an accepted offer
    const acceptedOffer = await Offer.findOne({ applicationId, organizationId, status: 'ACCEPTED' });
    if (!acceptedOffer) {
      throw new ValidationError('Cannot hire candidate without an ACCEPTED offer.');
    }

    // Fetch candidate scoped to organization
    const candidate = await Candidate.findOne({ _id: application.candidateId, organizationId });
    if (!candidate) throw new NotFoundError('Candidate not found.');

    // Fetch candidate profile for name fields
    const candidateProfile = await CandidateProfile.findOne({ candidateId: candidate._id, organizationId });
    const firstName = candidateProfile?.firstName || 'Unknown';
    const lastName = candidateProfile?.lastName || 'Candidate';

    const posting = await jobPostingRepository.findByIdAndTenant(application.jobPostingId, organizationId);
    const requisition = await jobRequisitionRepository.findByIdAndTenant(posting.jobRequisitionId, organizationId);

    let employeeId;
    let invitationLink;

    await runInTransaction(async (session) => {
      // Idempotency guard: employee uniqueness by email
      const existingEmployee = await Employee.findOne({ workEmail: candidate.email, organizationId }).session(session);
      if (existingEmployee) {
        throw new ConflictError(`An employee with email ${candidate.email} already exists.`);
      }

      const employeeCode = `EMP-${Math.floor(Date.now() / 1000).toString().substring(2)}-${Math.floor(Math.random() * 1000)}`;

      const newEmployee = new Employee({
        organizationId,
        employeeCode,
        firstName,
        lastName,
        workEmail: candidate.email,
        departmentId: acceptedOffer.departmentId || requisition.departmentId,
        designationId: acceptedOffer.designationId,
        locationId: requisition.location,
        shiftId: payload.shiftId || requisition.shiftId,
        managerId: payload.managerId || null,
        joiningDate: acceptedOffer.joiningDate,
        status: 'INVITED'
      });
      await newEmployee.save({ session });
      employeeId = newEmployee._id;

      // Create invitation (cryptographic token — SHA-256 stored)
      const plaintextToken = randomBytes(16).toString('hex');
      const tokenHash = createHash('sha256').update(plaintextToken).digest('hex');
      const expiresAt = new Date(Date.now() + 168 * 3600 * 1000); // 7 days

      const invite = new Invitation({
        organizationId,
        tokenHash,
        email: candidate.email,
        defaultRoleIds: [],
        issuedBy: userContext.userId,
        maxUses: 1,
        usedCount: 0,
        status: 'ACTIVE',
        expiresAt
      });
      await invite.save({ session });

      const baseUrl = env.CLIENT_URL || 'http://localhost:3000';
      invitationLink = `${baseUrl}/join?token=${plaintextToken}`;

      // Mark application HIRED
      application.status = 'HIRED';
      await application.save({ session });

      // Increment filledPositions on Requisition
      requisition.filledPositions = (requisition.filledPositions || 0) + 1;
      await requisition.save({ session });

      // Audit history
      const history = new ApplicationHistory({
        applicationId,
        organizationId,
        action: 'Hired',
        performedBy: userContext.userId,
        performedByType: 'User',
        comment: `Candidate hired and employee profile created (Code: ${employeeCode})`
      });
      await history.save({ session });
    });

    // TODO: Send email notification to new employee
    return { employeeId, invitationLink };
  }
}

export default new JobApplicationService();
