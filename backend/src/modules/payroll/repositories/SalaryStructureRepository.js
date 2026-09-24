import BaseRepository from '#@/core/repositories/BaseRepository.js';
import { SalaryStructure } from '../models/SalaryStructure.js';
import { AppError } from '#@/core/errors/AppError.js';

export class SalaryStructureRepository extends BaseRepository {
  constructor() {
    super(SalaryStructure);
  }

  /**
   * Overridden to prevent accidental in-place mutations of salary rules.
   */
  async updateByIdAndTenant(id, updateData, organizationId, options = {}) {
    // Only allow status changes (e.g., superseding an old structure)
    const allowedKeys = Object.keys(updateData);
    if (allowedKeys.some(key => key !== 'status' && key !== 'effectiveTo')) {
      throw new AppError('Salary structures are immutable and cannot be updated in-place. Create a new version instead.', 400);
    }
    return await super.updateByIdAndTenant(id, updateData, organizationId, options);
  }

  async supersedeStructure(id, organizationId, effectiveTo = Date.now(), options = {}) {
    return await super.updateByIdAndTenant(id, { status: 'SUPERSEDED', effectiveTo }, organizationId, options);
  }

  _getEffectiveFilter(options = {}) {
    if (!options.effectiveDate) {
      return { status: 'ACTIVE' };
    }
    const date = new Date(options.effectiveDate);
    return {
      effectiveFrom: { $lte: date },
      $or: [
        { effectiveTo: null },
        { effectiveTo: { $exists: false } },
        { effectiveTo: { $gt: date } }
      ]
    };
  }

  async findActiveByEmployee(employeeId, organizationId, options = {}) {
    const filter = { employeeId, ...this._getEffectiveFilter(options) };
    return await this.model
      .findOne(this._scopeFilter(filter, organizationId))
      .sort({ version: -1 })
      .session(options.session || null);
  }

  async findActiveByDesignation(designationId, organizationId, options = {}) {
    const filter = { designationId, employeeId: null, ...this._getEffectiveFilter(options) };
    return await this.model
      .findOne(this._scopeFilter(filter, organizationId))
      .sort({ version: -1 })
      .session(options.session || null);
  }

  async findActiveByDepartment(departmentId, organizationId, options = {}) {
    const filter = { departmentId, designationId: null, employeeId: null, ...this._getEffectiveFilter(options) };
    return await this.model
      .findOne(this._scopeFilter(filter, organizationId))
      .sort({ version: -1 })
      .session(options.session || null);
  }

  async findActiveDefault(organizationId, options = {}) {
    const filter = { departmentId: null, designationId: null, employeeId: null, ...this._getEffectiveFilter(options) };
    return await this.model
      .findOne(this._scopeFilter(filter, organizationId))
      .sort({ version: -1 })
      .session(options.session || null);
  }

  async getNextVersion(organizationId, filter = {}, options = {}) {
    const latest = await this.model
      .findOne(this._scopeFilter(filter, organizationId))
      .sort({ version: -1 })
      .session(options.session || null);
    return latest ? latest.version + 1 : 1;
  }
}

export default SalaryStructureRepository;
