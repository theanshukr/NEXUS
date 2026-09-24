import BaseRepository from '#@/core/repositories/BaseRepository.js';
import EmploymentHistory from '../models/EmploymentHistory.js';

/**
 * EmploymentHistoryRepository — M-03
 *
 * Append-only ledger repository. Records are NEVER updated or deleted.
 * All writes are delegated exclusively from EmployeeService.
 *
 * Inherits organizationId scoping and session support from BaseRepository.
 */
export class EmploymentHistoryRepository extends BaseRepository {
  constructor() {
    super(EmploymentHistory);
  }

  /**
   * Append a new immutable history entry for an employee.
   * This is the only write operation permitted on this collection.
   */
  async appendEntry({ employeeId, organizationId, type, previousValue, newValue, changedBy, changeReason = null }, options = {}) {
    this._validateTenantScope(organizationId);
    return await this.createScoped({
      employeeId,
      type,
      previousValue: previousValue ?? null,
      newValue: newValue ?? null,
      changedBy,
      changeReason: changeReason?.trim() || null
    }, organizationId, options);
  }

  /**
   * Retrieve full chronological history for a specific employee.
   * Ordered newest-first for typical HR timeline display.
   */
  async findByEmployee(employeeId, organizationId, options = {}) {
    return await this.findPaginated({
      filter: { employeeId },
      page: options.page || 1,
      limit: options.limit || 50,
      sort: { createdAt: -1 }
    }, organizationId, options);
  }

  /**
   * Retrieve history entries by type (e.g., all promotions in the organization).
   */
  async findByType(type, organizationId, options = {}) {
    return await this.findPaginated({
      filter: { type },
      page: options.page || 1,
      limit: options.limit || 50,
      sort: { createdAt: -1 }
    }, organizationId, options);
  }
}

export default new EmploymentHistoryRepository();
