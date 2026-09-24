import BaseRepository from '#@/core/repositories/BaseRepository.js';
import { PayrollCycle } from '../models/PayrollCycle.js';

export class PayrollCycleRepository extends BaseRepository {
  constructor() {
    super(PayrollCycle);
  }

  async findByIdentifier(cycleIdentifier, organizationId, options = {}) {
    return await this.findOne({ cycleIdentifier }, organizationId, options);
  }

  async findActiveCycle(organizationId, options = {}) {
    return await this.findOne({ status: { $in: ['OPEN', 'PROCESSING'] } }, organizationId, options);
  }
}

export default PayrollCycleRepository;
