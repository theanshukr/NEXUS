import BaseRepository from '#@/core/repositories/BaseRepository.js';
import { PayrollFormula } from '../models/PayrollFormula.js';

export class PayrollFormulaRepository extends BaseRepository {
  constructor() {
    super(PayrollFormula);
  }

  async findActiveFormula(organizationId, options = {}) {
    return await this.findOne({ isActive: true }, organizationId, options);
  }

  async findByVersion(version, organizationId, options = {}) {
    return await this.findOne({ version }, organizationId, options);
  }

  async getNextVersion(organizationId, options = {}) {
    const latest = await this.model
      .findOne(this._scopeFilter({}, organizationId))
      .sort({ version: -1 })
      .session(options.session || null);
    return latest ? latest.version + 1 : 1;
  }
}

export default PayrollFormulaRepository;
