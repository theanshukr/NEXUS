import BaseRepository from '#@/core/repositories/BaseRepository.js';
import LeaveBalanceLedger from '../models/LeaveBalanceLedger.js';
import { AppError } from '#@/core/errors/AppError.js';

class UnsupportedOperationError extends AppError {
  constructor(message) {
    super(message, 405);
  }
}

class LeaveBalanceLedgerRepository extends BaseRepository {
  constructor() {
    super(LeaveBalanceLedger);
  }

  async append(organizationId, payload, session = null) {
    return await this.createScoped(payload, organizationId, { session });
  }

  // Enforce Immutability
  async updateByIdAndTenant() {
    throw new UnsupportedOperationError('LeaveBalanceLedger is append-only. Updates are not allowed.');
  }

  async deleteByIdAndTenant() {
    throw new UnsupportedOperationError('LeaveBalanceLedger is append-only. Deletions are not allowed.');
  }
}

export default new LeaveBalanceLedgerRepository();
