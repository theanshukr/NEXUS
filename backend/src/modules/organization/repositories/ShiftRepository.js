import BaseRepository from '#@/core/repositories/BaseRepository.js';
import Shift from '../models/Shift.js';

export class ShiftRepository extends BaseRepository {
  constructor() {
    super(Shift);
  }

  async findByCode(code, organizationId, options = {}) {
    this._validateTenantScope(organizationId);
    const filter = this._scopeFilter({ code: code.trim().toUpperCase() }, organizationId);
    return await this.model.findOne(filter, null, options);
  }
}

export default new ShiftRepository();
