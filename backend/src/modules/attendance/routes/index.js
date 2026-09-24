import { Router } from 'express';
import attendanceOperationalRoutes from './attendanceOperationalRoutes.js';
import attendanceReportRoutes from './attendanceReportRoutes.js';
import regularizationRoutes from './regularizationRoutes.js';
import attendancePolicyRoutes from './attendancePolicyRoutes.js';
import attendanceReconciliationRoutes from './attendanceReconciliationRoutes.js';
import attendanceConflictRoutes from './AttendanceConflictRoutes.js';

const router = Router();

// /api/v1/attendance
router.use('/regularizations', regularizationRoutes);
router.use('/reconciliation', attendanceReconciliationRoutes);
router.use('/', attendanceConflictRoutes);
router.use('/', attendanceReportRoutes);
router.use('/', attendanceOperationalRoutes);

export default router;
