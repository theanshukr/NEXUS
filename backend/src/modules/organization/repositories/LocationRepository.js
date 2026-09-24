import BaseRepository from '#@/core/repositories/BaseRepository.js';
import Location from '../models/Location.js';

export class LocationRepository extends BaseRepository {
  constructor() {
    super(Location);
  }

  async findByCode(code, organizationId, options = {}) {
    this._validateTenantScope(organizationId);
    const filter = this._scopeFilter({ code: code.trim().toUpperCase() }, organizationId);
    return await this.model.findOne(filter, null, options);
  }
}

export default new LocationRepository();
