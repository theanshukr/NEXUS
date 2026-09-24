import BaseRepository from '#@/core/repositories/BaseRepository.js';
import AuditLog from '../models/AuditLog.js';

export class AuditRepository extends BaseRepository {
  constructor() {
    super(AuditLog);
  }

  /**
   * Retrieves paginated audit logs for a tenant, sorted chronologically descending.
   */
  async findLogsByTenant(organizationId, filter = {}, options = {}) {
    return await this.find(filter, organizationId, {
      sort: { timestamp: -1 },
      limit: options.limit || 50,
      skip: options.skip || 0,
      ...options
    });
  }
}

export default new AuditRepository();
