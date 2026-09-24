import BaseRepository from '#@/core/repositories/BaseRepository.js';
import AttendancePolicy from '../models/AttendancePolicy.js';

export class AttendancePolicyRepository extends BaseRepository {
  constructor() {
    super(AttendancePolicy);
  }

  /**
   * Returns the organization-wide default policy (isDefault: true).
   * Used as a fallback when a Location has no policy assigned.
   */
  async findDefault(organizationId, options = {}) {
    return await this.model
      .findOne(this._scopeFilter({ isDefault: true, status: 'ACTIVE' }, organizationId))
      .session(options.session || null);
  }
}

export default new AttendancePolicyRepository();
