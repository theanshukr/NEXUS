import BaseRepository from '#@/core/repositories/BaseRepository.js';
import LeaveBalanceSnapshot from '../models/LeaveBalanceSnapshot.js';

class LeaveBalanceSnapshotRepository extends BaseRepository {
  constructor() {
    super(LeaveBalanceSnapshot);
  }

  async getSnapshotsForCycle(organizationId, cycleIdentifier) {
    return await this.find({ cycleIdentifier }, organizationId);
  }

  async getEmployeeSnapshotForCycle(organizationId, employeeId, cycleIdentifier) {
    const snapshots = await this.find({ employeeId, cycleIdentifier }, organizationId);
    return snapshots.length > 0 ? snapshots[0] : null;
  }
}

export default new LeaveBalanceSnapshotRepository();
