import BaseRepository from '#@/core/repositories/BaseRepository.js';
import JobPosting from '../models/JobPosting.js';

export class JobPostingRepository extends BaseRepository {
  constructor() {
    super(JobPosting);
  }

  async findBySlugAndTenant(slug, organizationId, options = {}) {
    return await this.model.findOne({ slug, organizationId, status: 'PUBLISHED' }).session(options.session || null);
  }

  async findByRequisitionIdAndTenant(jobRequisitionId, organizationId, options = {}) {
    return await this.model.findOne({ jobRequisitionId, organizationId }).session(options.session || null);
  }
}

export default new JobPostingRepository();
