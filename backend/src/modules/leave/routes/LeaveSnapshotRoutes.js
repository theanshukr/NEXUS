import { Router } from 'express';
import authenticate from '#@/core/middleware/auth.js';
import { requireTenant } from '#@/core/middleware/tenant.js';
import { hasPermission } from '#@/core/middleware/hasPermission.js';
import { PERMISSIONS } from '#@/core/constants/permissions/index.js';
import LeaveSnapshotService from '../services/LeaveSnapshotService.js';
import LeaveBalanceSnapshotRepository from '../repositories/LeaveBalanceSnapshotRepository.js';

const router = Router();

// Trigger snapshot for a payroll cycle
router.post(
  '/run',
  authenticate,
  requireTenant,
  hasPermission(PERMISSIONS.LEAVE.SNAPSHOT_RUN), // Assuming HR/Admin
  async (req, res, next) => {
    try {
      const { cycleIdentifier, cycleStartDate, cycleEndDate } = req.body;
      const organizationId = req.tenantId;

      const result = await LeaveSnapshotService.takeSnapshotForPayrollCycle(
        organizationId,
        cycleIdentifier,
        new Date(cycleStartDate),
        new Date(cycleEndDate)
      );

      res.status(200).json({
        success: true,
        message: 'Snapshot completed successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get snapshots
router.get(
  '/',
  authenticate,
  requireTenant,
  hasPermission(PERMISSIONS.LEAVE.SNAPSHOT_READ),
  async (req, res, next) => {
    try {
      const { cycleIdentifier, employeeId } = req.query;
      const organizationId = req.tenantId;

      let data;
      if (employeeId && cycleIdentifier) {
        data = await LeaveBalanceSnapshotRepository.getEmployeeSnapshotForCycle(organizationId, employeeId, cycleIdentifier);
      } else if (cycleIdentifier) {
        data = await LeaveBalanceSnapshotRepository.getSnapshotsForCycle(organizationId, cycleIdentifier);
      } else {
        data = await LeaveBalanceSnapshotRepository.findPaginated(req.query, organizationId);
      }

      res.status(200).json({
        success: true,
        data
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
