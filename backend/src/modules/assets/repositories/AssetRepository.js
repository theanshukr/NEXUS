import BaseRepository from '../../../core/repositories/BaseRepository.js';
import Asset from '../models/Asset.js';

class AssetRepository extends BaseRepository {
  constructor() {
    super(Asset);
  }

  async findByOrganization(organizationId, filter = {}, options = {}) {
    return this.find(filter, organizationId, { populate: 'assignedTo', ...options });
  }

  async findMyAssets(organizationId, userId, options = {}) {
    return this.find({ assignedTo: userId }, organizationId, { populate: 'assignedTo', ...options });
  }
}

export default new AssetRepository();
