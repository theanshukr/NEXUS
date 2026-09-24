import BaseRepository from '#@/core/repositories/BaseRepository.js';
import Employee from '../models/Employee.js';

/**
 * EmployeeRepository — M-03
 *
 * Extends BaseRepository to inherit all zero-trust multi-tenant scoping,
 * ALS safety net validation, and paginated query helpers.
 *
 * Repository query rules (M-02-consistent):
 *   - findById()     excludes archived by default ({ archivedAt: null })
 *   - findMany()     excludes archived by default ({ archivedAt: null })
 *   - { includeArchived: true }  — explicit override to include all records
 *   - { onlyArchived: true }     — explicit override to return only archived records
 */
export class EmployeeRepository extends BaseRepository {
  constructor() {
    super(Employee);
  }

  /**
   * Builds the archive filter based on explicit options.
   * Defaults to excluding archived records (archivedAt: null).
   */
  _archiveFilter(options = {}) {
    if (options.onlyArchived) return { archivedAt: { $ne: null } };
    if (options.includeArchived) return {};
    return { archivedAt: null };
  }

  /**
   * Find a single employee by ID within tenant scope.
   * Excludes archived records by default.
   */
  async findById(id, organizationId, options = {}) {
    const filter = this._scopeFilter({ _id: id, ...this._archiveFilter(options) }, organizationId);
    return await this.model.findOne(filter).session(options.session || null);
  }

  /**
   * Find an employee by their unique employee code within tenant scope.
   * Excludes archived by default.
   */
  async findByCode(code, organizationId, options = {}) {
    this._validateTenantScope(organizationId);
    const filter = this._scopeFilter(
      { employeeCode: code.trim().toUpperCase(), ...this._archiveFilter(options) },
      organizationId
    );
    return await this.model.findOne(filter).session(options.session || null);
  }

  /**
   * Find an employee by their linked User ID.
   * Used during invitation redemption to link M-01 User → M-03 Employee.
   */
  async findByUserId(userId, organizationId, options = {}) {
    this._validateTenantScope(organizationId);
    const filter = this._scopeFilter({ userId, ...this._archiveFilter(options) }, organizationId);
    return await this.model.findOne(filter).session(options.session || null);
  }

  /**
   * Find an employee by work email within tenant scope.
   * Excludes archived by default.
   */
  async findByEmail(workEmail, organizationId, options = {}) {
    this._validateTenantScope(organizationId);
    const filter = this._scopeFilter(
      { workEmail: workEmail.toLowerCase().trim(), ...this._archiveFilter(options) },
      organizationId
    );
    return await this.model.findOne(filter).session(options.session || null);
  }

  /**
   * Find all direct reports of a given manager within the tenant.
   * Excludes archived by default.
   */
  async findDirectReports(managerId, organizationId, options = {}) {
    const filter = { managerId, ...this._archiveFilter(options) };
    return await this.find(filter, organizationId, options);
  }

  /**
   * Paginated employee listing with search and filter support.
   * Search fields: employeeCode, firstName, lastName, workEmail.
   * Excludes archived by default.
   */
  async search({ keyword, status, departmentId, locationId, page = 1, limit = 20, sort = { createdAt: -1 } }, organizationId, options = {}) {
    const filter = { ...this._archiveFilter(options) };

    if (status) filter.status = status;
    if (departmentId) filter.departmentId = departmentId;
    if (locationId) filter.locationId = locationId;

    if (keyword) {
      const escaped = keyword.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      filter.$or = [
        { employeeCode: { $regex: regex } },
        { firstName: { $regex: regex } },
        { lastName: { $regex: regex } },
        { workEmail: { $regex: regex } }
      ];
    }

    return await this.findPaginated({ filter, page, limit, sort }, organizationId, options);
  }

  /**
   * Fetch all employees whose managerId matches the given ID.
   * Used for org chart tree building and cycle detection.
   */
  async findByManagerId(managerId, organizationId, options = {}) {
    const filter = { managerId, ...this._archiveFilter(options) };
    return await this.find(filter, organizationId, options);
  }

  /**
   * Validates that setting targetManagerId as manager for employeeId
   * does not create a circular reporting chain.
   *
   * Algorithm: walk up the reporting chain from targetManagerId.
   * If we encounter employeeId at any point, it's a cycle.
   */
  async detectsCycle(employeeId, targetManagerId, organizationId, options = {}) {
    if (!targetManagerId) return false;
    if (String(targetManagerId) === String(employeeId)) return true;

    let currentId = targetManagerId;
    const visited = new Set();

    while (currentId) {
      if (visited.has(String(currentId))) break; // Safety: broken chain
      visited.add(String(currentId));

      const manager = await this.findById(currentId, organizationId, options);
      if (!manager) break;
      if (String(manager.managerId) === String(employeeId)) return true;
      currentId = manager.managerId;
    }

    return false;
  }

  /**
   * Fetch the complete flat list of all non-archived employees for org chart building.
   * Sorted by name for predictable tree rendering.
   */
  async findAllForOrgChart(organizationId, options = {}) {
    return await this.find(
      { archivedAt: null },
      organizationId,
      { sort: { firstName: 1, lastName: 1 }, ...options }
    );
  }
}

export default new EmployeeRepository();
