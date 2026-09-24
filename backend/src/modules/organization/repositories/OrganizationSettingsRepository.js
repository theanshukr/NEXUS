import BaseRepository from '#@/core/repositories/BaseRepository.js';
import OrganizationSettings from '../models/OrganizationSettings.js';

export class OrganizationSettingsRepository extends BaseRepository {
  constructor() {
    super(OrganizationSettings);
  }

  /**
   * Retrieves operational settings for a specific tenant.
   */
  async findByOrganizationId(organizationId, options = {}) {
    return await this.findOneScoped({ organizationId }, organizationId, options);
  }
}

export default new OrganizationSettingsRepository();
