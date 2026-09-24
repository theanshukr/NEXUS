import LeaveBalanceSnapshotRepository from '../repositories/LeaveBalanceSnapshotRepository.js';
import LeaveBalanceRepository from '../repositories/LeaveBalanceRepository.js';
import { runInTransaction } from '#@/platform/database/db.js';
import logger from '#@/platform/logger/index.js';
import AuditService from '#@/modules/audit/services/AuditService.js';

class LeaveSnapshotService {
  /**
   * Creates point-in-time snapshots of all employee leave balances for a specific payroll cycle.
   * This is typically triggered by the Payroll Engine (M-07) when locking a pay period.
   * 
   * @param {string} organizationId 
   * @param {string} cycleIdentifier - e.g., '2026-P01'
   * @param {Date} cycleStartDate 
   * @param {Date} cycleEndDate 
   */
  async takeSnapshotForPayrollCycle(organizationId, cycleIdentifier, cycleStartDate, cycleEndDate) {
    const year = new Date(cycleEndDate).getFullYear();
    const snapshotDate = new Date();

    // In a real high-scale system, this should be a background job with cursor pagination.
    // For now, we fetch all active balances for the year.
    const balances = await LeaveBalanceRepository.find({ year }, organizationId);

    if (balances.length === 0) {
      logger.info(`LeaveSnapshotService: No active balances found for year ${year} in org ${organizationId}`);
      return { createdCount: 0 };
    }

    let createdCount = 0;

    await runInTransaction(async (session) => {
      // Upsert snapshots
      for (const balance of balances) {
        // Check if snapshot already exists for this cycle
        const existing = await LeaveBalanceSnapshotRepository.findOne({
          employeeId: balance.employeeId,
          cycleIdentifier
        }, organizationId, { session });

        if (!existing) {
          await LeaveBalanceSnapshotRepository.createScoped({
            employeeId: balance.employeeId,
            cycleIdentifier,
            snapshotDate,
            cycleStartDate,
            cycleEndDate,
            balances: balance.balances
          }, organizationId, { session });
          createdCount++;
        } else {
          // Update existing if re-running for the same cycle
          await LeaveBalanceSnapshotRepository.updateByIdAndTenant(existing._id, {
            snapshotDate,
            cycleStartDate,
            cycleEndDate,
            balances: balance.balances
          }, organizationId, { session });
          createdCount++;
        }
      }

      await AuditService.logAction({
        organizationId,
        actorId: organizationId, // System job
        action: 'LEAVE_SNAPSHOT_CREATED',
        entityType: 'Organization',
        entityId: organizationId, // multiple entities
        metadata: { cycleIdentifier, createdCount }
      }, session);
    });

    logger.info(`LeaveSnapshotService: Created/Updated ${createdCount} snapshots for cycle ${cycleIdentifier}`);
    return { createdCount };
  }
}

export default new LeaveSnapshotService();
