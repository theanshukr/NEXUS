import BaseRepository from '#@/core/repositories/BaseRepository.js';
import Designation from '../models/Designation.js';

export class DesignationRepository extends BaseRepository {
  constructor() {
    super(Designation);
  }

  async findByCode(code, organizationId, options = {}) {
    this._validateTenantScope(organizationId);
    const filter = this._scopeFilter({ code: code.trim().toUpperCase() }, organizationId);
    return await this.model.findOne(filter, null, options);
  }
}

export default new DesignationRepository();
