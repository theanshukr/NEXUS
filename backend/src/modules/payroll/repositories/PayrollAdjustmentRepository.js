import BaseRepository from '#@/core/repositories/BaseRepository.js';
import { PayrollAdjustment } from '../models/PayrollAdjustment.js';

export class PayrollAdjustmentRepository extends BaseRepository {
  constructor() {
    super(PayrollAdjustment);
  }

  async findPendingByEmployeeAndCycle(employeeId, payrollCycleId, organizationId, options = {}) {
    return await this.find({ employeeId, payrollCycleId, status: 'PENDING' }, organizationId, options);
  }

  async findPendingByCycle(payrollCycleId, organizationId, options = {}) {
    return await this.find({ payrollCycleId, status: 'PENDING' }, organizationId, options);
  }

  async markProcessed(ids = [], organizationId, options = {}) {
    return await this.model.updateMany(
      this._scopeFilter({ _id: { $in: ids } }, organizationId),
      { $set: { status: 'PROCESSED' } },
      { session: options.session || null }
    );
  }
}

export default PayrollAdjustmentRepository;
