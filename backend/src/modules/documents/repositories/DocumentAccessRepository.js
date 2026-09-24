import BaseRepository from '#@/core/repositories/BaseRepository.js';
import DocumentAccess from '../models/DocumentAccess.js';

/**
 * DocumentAccessRepository
 * Enforces zero-trust multi-tenancy for Document Access control ledger.
 */
class DocumentAccessRepository extends BaseRepository {
  constructor() {
    super(DocumentAccess);
  }

  /**
   * Retrieves all active grants for a specific document.
   * Filters out expired entries natively.
   *
   * @param {string} documentId
   * @param {string} organizationId
   */
  async findActiveGrants(documentId, organizationId) {
    return await this.findManyAndTenant(
      {
        documentId,
        $or: [
          { expiresAt: { $eq: null } },
          { expiresAt: { $gt: new Date() } }
        ]
      },
      organizationId
    );
  }
}

export const documentAccessRepository = new DocumentAccessRepository();
export default documentAccessRepository;
