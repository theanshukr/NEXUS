import { Router } from 'express';
import leavePolicyRoutes from './LeavePolicyRoutes.js';
import leaveBalanceRoutes from './LeaveBalanceRoutes.js';
import leaveRequestRoutes from './LeaveRequestRoutes.js';
import leaveReportRoutes from './LeaveReportRoutes.js';
import leaveSnapshotRoutes from './LeaveSnapshotRoutes.js';

const router = Router();

router.use('/policies', leavePolicyRoutes);
router.use('/balances', leaveBalanceRoutes);
router.use('/requests', leaveRequestRoutes);
router.use('/reports', leaveReportRoutes);
router.use('/snapshots', leaveSnapshotRoutes);

export default router;
