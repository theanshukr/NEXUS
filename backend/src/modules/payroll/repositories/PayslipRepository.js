import BaseRepository from '#@/core/repositories/BaseRepository.js';
import { Payslip } from '../models/Payslip.js';
import { AppError } from '#@/core/errors/AppError.js';

export class PayslipRepository extends BaseRepository {
  constructor() {
    super(Payslip);
  }

  async updateByIdAndTenant(id, updateData, organizationId, options = {}) {
    const existing = await this.findByIdAndTenant(id, organizationId, options);
    if (existing && existing.status === 'FINALIZED' && updateData.status !== 'FINALIZED') {
      throw new AppError('Finalized payslips are immutable and cannot be modified.', 400);
    }
    return await super.updateByIdAndTenant(id, updateData, organizationId, options);
  }

  async findByRun(payrollRunId, organizationId, options = {}) {
    return await this.find({ payrollRunId }, organizationId, options);
  }

  async findByEmployeeAndCycle(employeeId, payrollCycleId, organizationId, options = {}) {
    return await this.findOne({ employeeId, payrollCycleId }, organizationId, options);
  }

  async findByEmployee(employeeId, organizationId, options = {}) {
    return await this.find({ employeeId }, organizationId, options);
  }

  async deleteByRunAndDraftStatus(payrollRunId, organizationId, options = {}) {
    return await this.model.deleteMany(
      this._scopeFilter({ payrollRunId, status: 'DRAFT' }, organizationId),
      { session: options.session || null }
    );
  }
}

export default PayslipRepository;
