import BaseRepository from '#@/core/repositories/BaseRepository.js';
import { PayrollRun } from '../models/PayrollRun.js';

export class PayrollRunRepository extends BaseRepository {
  constructor() {
    super(PayrollRun);
  }

  async findByCycle(payrollCycleId, organizationId, options = {}) {
    return await this.find({ payrollCycleId }, organizationId, options);
  }

  async findLatestByCycle(payrollCycleId, organizationId, options = {}) {
    return await this.model
      .findOne(this._scopeFilter({ payrollCycleId }, organizationId))
      .sort({ createdAt: -1 })
      .session(options.session || null);
  }
}

export default PayrollRunRepository;
