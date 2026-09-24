import BaseRepository from '#@/core/repositories/BaseRepository.js';
import RequisitionHistory from '../models/RequisitionHistory.js';

class RequisitionHistoryRepository extends BaseRepository {
  constructor() {
    super(RequisitionHistory);
  }

  /**
   * Logs an action in the requisition history.
   * We don't use createScoped because the base createScoped sets standard fields.
   * 
   * @param {Object} historyData 
   * @param {string} organizationId 
   * @param {Object} options - Mongoose options like session
   */
  async logHistory(historyData, organizationId, options = {}) {
    const document = new this.model({
      ...historyData,
      organizationId
    });
    return await document.save(options);
  }
}

export const requisitionHistoryRepository = new RequisitionHistoryRepository();
export default requisitionHistoryRepository;
