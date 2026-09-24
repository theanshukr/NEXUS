import BaseRepository from '#@/core/repositories/BaseRepository.js';
import AttendanceRegularization from '../models/AttendanceRegularization.js';

export class AttendanceRegularizationRepository extends BaseRepository {
  constructor() {
    super(AttendanceRegularization);
  }

  /**
   * Finds all pending regularization requests assigned to a specific manager's team.
   * Used by the manager approval dashboard.
   */
  async findPendingByEmployeeIds(employeeIds, organizationId, options = {}) {
    return await this.model
      .find(this._scopeFilter({ employeeId: { $in: employeeIds }, status: 'PENDING' }, organizationId))
      .sort({ createdAt: 1 })
      .session(options.session || null);
  }
}

export default new AttendanceRegularizationRepository();
