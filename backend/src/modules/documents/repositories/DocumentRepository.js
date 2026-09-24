import BaseRepository from '#@/core/repositories/BaseRepository.js';
import Document from '../models/Document.js';

/**
 * DocumentRepository
 * Enforces zero-trust multi-tenancy for the Document ledger.
 */
class DocumentRepository extends BaseRepository {
  constructor() {
    super(Document);
  }

  /**
   * Retrieves a document along with basic scoped checks.
   */
  async findActiveByIdAndTenant(id, organizationId, options = {}) {
    return await this.findOne(
      { _id: id, status: 'ACTIVE' },
      organizationId,
      options
    );
  }

  /**
   * Soft deletes a document by transitioning status to ARCHIVED.
   * @param {string} id 
   * @param {string} organizationId 
   * @param {Object} options 
   */
  async archiveByIdAndTenant(id, organizationId, options = {}) {
    return await this.updateByIdAndTenant(
      id,
      { status: 'ARCHIVED' },
      organizationId,
      options
    );
  }
}

export const documentRepository = new DocumentRepository();
export default documentRepository;
