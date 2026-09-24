import BaseRepository from '#@/core/repositories/BaseRepository.js';
import LeaveBalance from '../models/LeaveBalance.js';
import { ConflictError } from '#@/core/errors/AppError.js';

class LeaveBalanceRepository extends BaseRepository {
  constructor() {
    super(LeaveBalance);
  }

  async getEmployeeBalance(organizationId, employeeId, year) {
    const balances = await this.find({ employeeId, year }, organizationId);
    return balances.length > 0 ? balances[0] : null;
  }

  /**
   * Mutates an employee's leave balance using optimistic concurrency control.
   */
  async mutateBalanceWithLock(organizationId, employeeId, year, mutationFn, session = null) {
    const balance = await this.getEmployeeBalance(organizationId, employeeId, year);
    if (!balance) return null;

    const currentLockVersion = balance.lockVersion;
    
    // Apply mutation
    await mutationFn(balance);

    const updatePayload = {
      $set: { balances: balance.balances },
      $inc: { lockVersion: 1 }
    };

    const result = await this.model.updateOne(
      this._scopeFilter({
        _id: balance._id,
        lockVersion: currentLockVersion
      }, organizationId),
      updatePayload,
      { session }
    );

    if (result.modifiedCount === 0) {
      throw new ConflictError('Concurrent modification detected on leave balance. Please retry.');
    }

    return await this.findByIdAndTenant(balance._id, organizationId, { session });
  }
}

export default new LeaveBalanceRepository();
