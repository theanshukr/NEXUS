import jobPostingRepository from '../repositories/JobPostingRepository.js';
import departmentService from '#@/modules/departments/services/DepartmentService.js';
import { NotFoundError } from '#@/core/errors/AppError.js';

export class JobPostingService {
  
  /**
   * Called internally when a Requisition is published.
   * Upserts the JobPosting snapshot.
   */
  async syncJobPosting(requisition, userId, session) {
    const orgId = requisition.organizationId.toString();
    
    // Resolve department name for public consumption
    let departmentName = 'General';
    try {
      const dept = await departmentService.getDepartmentById(requisition.departmentId, orgId);
      if (dept) {
        departmentName = dept.name;
      }
    } catch (e) {
      // Ignore if department not found
    }

    // Prepare snapshot data
    const snapshot = {
      organizationId: orgId,
      jobRequisitionId: requisition._id,
      jobRequisitionVersion: requisition.version || 1,
      slug: this._generateSlug(requisition.title, requisition.jobCode),
      title: requisition.title,
      description: requisition.description,
      department: departmentName,
      location: requisition.location,
      employmentType: requisition.employmentType,
      workMode: requisition.workMode,
      skills: requisition.technicalRequirements ? requisition.technicalRequirements.map(t => t.name) : [],
      status: 'PUBLISHED',
      visibility: 'PUBLIC',
      postedBy: userId,
      publishedAt: new Date(),
      expiresAt: requisition.applicationDeadline || null
    };

    // Check if it already exists
    const existing = await jobPostingRepository.findByRequisitionIdAndTenant(requisition._id, orgId, { session });
    
    if (existing) {
      // Update existing
      return await jobPostingRepository.updateByIdAndTenant(existing._id, snapshot, orgId, { session });
    } else {
      // Create new
      return await jobPostingRepository.createScoped(snapshot, orgId, { session });
    }
  }

  /**
   * Called internally when a Requisition is closed.
   */
  async closeJobPosting(requisitionId, organizationId, session) {
    const existing = await jobPostingRepository.findByRequisitionIdAndTenant(requisitionId, organizationId, { session });
    if (existing) {
      return await jobPostingRepository.updateByIdAndTenant(
        existing._id, 
        { status: 'CLOSED' }, 
        organizationId, 
        { session }
      );
    }
  }

  /**
   * Public API: Get all published job postings for an organization
   */
  async getPublicJobs(filters, organizationId) {
    const { page = 1, limit = 20, department, employmentType, workMode, isRemote } = filters;
    const queryFilter = { status: 'PUBLISHED' };
    
    if (department) queryFilter.department = department;
    if (employmentType) queryFilter.employmentType = employmentType;
    if (workMode) queryFilter.workMode = workMode;
    if (isRemote !== undefined) queryFilter.isRemote = isRemote === 'true';

    return await jobPostingRepository.findPaginated(
      { filter: queryFilter, page, limit, sort: { publishedAt: -1 } },
      organizationId
    );
  }

  /**
   * Public API: Get specific job posting by ID or Slug
   */
  async getPublicJobByIdOrSlug(idOrSlug, organizationId) {
    let posting;
    // Check if it's a valid ObjectId
    if (idOrSlug.match(/^[0-9a-fA-F]{24}$/)) {
      posting = await jobPostingRepository.findByIdAndTenant(idOrSlug, organizationId);
    } else {
      posting = await jobPostingRepository.findBySlugAndTenant(idOrSlug, organizationId);
    }

    if (!posting || posting.status !== 'PUBLISHED') {
      throw new NotFoundError('Job posting not found or is no longer active.');
    }
    
    return posting;
  }

  _generateSlug(title, jobCode) {
    const baseSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    return `${baseSlug}-${jobCode.toLowerCase()}`;
  }
}

export default new JobPostingService();
