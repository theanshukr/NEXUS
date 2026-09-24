import BaseRepository from '#@/core/repositories/BaseRepository.js';
import JobRequisition from '../models/JobRequisition.js';
import JobSequence from '../models/JobSequence.js';

class JobRequisitionRepository extends BaseRepository {
  constructor() {
    super(JobRequisition);
  }

  /**
   * Generates a sequential Job Code for the specified organization.
   * Format: REC-[YEAR]-[0000X]
   * Relies on MongoDB $inc for atomic operations to prevent collisions.
   * 
   * @param {string} organizationId 
   * @param {Object} options - Mongoose options like session
   * @returns {string} The generated job code
   */
  async generateJobCode(organizationId, options = {}) {
    const sequence = await JobSequence.findOneAndUpdate(
      { organizationId },
      { $inc: { sequenceValue: 1 } },
      { new: true, upsert: true, ...options }
    );

    const year = new Date().getFullYear();
    const formattedNumber = String(sequence.sequenceValue).padStart(5, '0');
    return `REC-${year}-${formattedNumber}`;
  }

  async findActiveByIdAndTenant(id, organizationId, options = {}) {
    return await this.model.findOne({
      _id: id,
      organizationId,
      workflowStatus: { $ne: 'ARCHIVED' }
    }, null, options);
  }
}

export const jobRequisitionRepository = new JobRequisitionRepository();
export default jobRequisitionRepository;
