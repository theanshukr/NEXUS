import LeaveBalanceService from '../services/LeaveBalanceService.js';
import OrganizationService from '#@/modules/organization/services/OrganizationService.js';
import CacheService from '#@/platform/cache/index.js';
import logger from '#@/platform/logger/index.js';

class LeaveAccrualScheduler {
  constructor() {
    this.intervalId = null;
  }

  start() {
    // Run every day at 1 AM to check if it's the 1st of the month
    this.intervalId = setInterval(() => this.executeBatch(), 24 * 60 * 60 * 1000);
    logger.info('LeaveAccrualScheduler started.');
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  async executeBatch() {
    try {
      const today = new Date();
      if (today.getDate() !== 1) return; // Only run on the 1st of the month

      const lockKey = `lock:leave_accrual:${today.getFullYear()}_${today.getMonth()}`;
      
      // Distributed lock: Try to set flag, if already set, another instance is running it
      const locked = await CacheService.set(lockKey, 'running', 24 * 60 * 60, { nx: true });
      if (!locked) {
        logger.info('LeaveAccrualScheduler: Batch already running on another instance.');
        return;
      }

      logger.info('LeaveAccrualScheduler: Running monthly accrual batch...');

      // Fetch all organizations (In reality, we'd paginate)
      const organizations = await OrganizationService.getAllOrganizations();
      
      for (const org of organizations) {
        try {
          const result = await LeaveBalanceService.runMonthlyAccrual(org._id);
          logger.info(`LeaveAccrualScheduler: Accrued ${result.accruedEmployees} employees for org ${org._id}`);
        } catch (orgError) {
          logger.error(`LeaveAccrualScheduler: Failed for org ${org._id}`, orgError);
        }
      }

      logger.info('LeaveAccrualScheduler: Monthly accrual batch completed.');
    } catch (error) {
      logger.error('LeaveAccrualScheduler: Fatal error during batch execution.', error);
    }
  }
}

export default new LeaveAccrualScheduler();
