import { Router } from 'express';
import env from '#@/config/env.js';
import storageTestRoutes from '#@/platform/storage/routes/storageTestRoutes.js';
import authRoutes from '#@/modules/auth/routes/authRoutes.js';
import roleRoutes from '#@/modules/roles/routes/roleRoutes.js';
import inviteRoutes from '#@/modules/invitations/routes/inviteRoutes.js';
import organizationRoutes from '#@/modules/organization/routes/organizationRoutes.js';
import roleDelegationRoutes from '#@/modules/roles/routes/roleDelegationRoutes.js';
import departmentRoutes from '#@/modules/departments/routes/departmentRoutes.js';
import designationRoutes from '#@/modules/organization/routes/designationRoutes.js';
import locationRoutes from '#@/modules/organization/routes/locationRoutes.js';
import shiftRoutes from '#@/modules/organization/routes/shiftRoutes.js';
import holidayRoutes from '#@/modules/organization/routes/holidayRoutes.js';
import employeeRoutes from '#@/modules/employees/routes/employeeRoutes.js';
import requisitionRoutes from '#@/modules/recruitment/routes/requisitionRoutes.js';
import atsApplicationRoutes from '#@/modules/recruitment/routes/atsApplicationRoutes.js';
import attendanceModuleRoutes from '#@/modules/attendance/routes/index.js';
import attendancePolicyRoutes from '#@/modules/attendance/routes/attendancePolicyRoutes.js';
import calendarRoutes from '#@/modules/calendar/routes/CalendarRoutes.js';
import leaveModuleRoutes from '#@/modules/leave/routes/index.js';
import payrollModuleRoutes from '#@/modules/payroll/routes/index.js';
import notificationRoutes from '#@/modules/notifications/routes/notificationRoutes.js';
import aiRoutes from '#@/modules/ai/routes/aiRoutes.js';
import helpdeskRoutes from '#@/modules/helpdesk/routes/TicketRoutes.js';
import projectRoutes from '#@/modules/projects/routes/ProjectRoutes.js';
import performanceRoutes from '#@/modules/performance/routes/PerformanceRoutes.js';
import assetRoutes from '#@/modules/assets/routes/AssetRoutes.js';
import expenseRoutes from '#@/modules/expenses/routes/ExpenseRoutes.js';
import documentRoutes from '#@/modules/documents/routes/DocumentRoutes.js';
import nexusRoutes from '#@/modules/nexus/routes/nexusRoutes.js';

import userRoutes from '#@/modules/users/routes/userRoutes.js';

import candidateAuthRoutes from '#@/modules/candidate/routes/candidateAuthRoutes.js';
import candidateProfileRoutes from '#@/modules/candidate/routes/candidateProfileRoutes.js';
import publicJobRoutes from '#@/modules/recruitment/routes/publicJobRoutes.js';
import publicApplicationRoutes from '#@/modules/recruitment/routes/publicApplicationRoutes.js';

const router = Router();

// Public / Candidate Routes
router.use('/public/organizations/:slug/auth', candidateAuthRoutes);
router.use('/public/organizations/:slug/profile', candidateProfileRoutes);
router.use('/public/organizations/:slug/jobs', publicJobRoutes);
router.use('/public/organizations/:slug/applications', publicApplicationRoutes);

// API v1 Mount Points
router.use('/auth', authRoutes);
router.use('/roles', roleRoutes);
router.use('/invites', inviteRoutes);
router.use('/organizations', organizationRoutes);
router.use('/users', userRoutes);
router.use('/role-delegation-policies', roleDelegationRoutes);
router.use('/role-assignment-policies', roleDelegationRoutes); // Alias for compatibility
router.use('/departments', departmentRoutes);
router.use('/designations', designationRoutes);
router.use('/locations', locationRoutes);
router.use('/shifts', shiftRoutes);
router.use('/locations', holidayRoutes); // Mount holiday routes under /locations (matches /locations/:locationId/holidays/:year)
router.use('/employees', employeeRoutes);
router.use('/requisitions', requisitionRoutes);
router.use('/applications', atsApplicationRoutes);
router.use('/attendance', attendanceModuleRoutes);
router.use('/attendance-policies', attendancePolicyRoutes);
router.use('/calendars', calendarRoutes);
router.use('/leave', leaveModuleRoutes);
router.use('/payroll', payrollModuleRoutes);
router.use('/notifications', notificationRoutes);
router.use('/ai', aiRoutes);
router.use('/tickets', helpdeskRoutes);
router.use('/projects', projectRoutes);
router.use('/performance', performanceRoutes);
router.use('/assets', assetRoutes);
router.use('/expenses', expenseRoutes);
router.use('/documents', documentRoutes);
router.use('/nexus', nexusRoutes);

// Storage Infrastructure Diagnostic Routes (Development/Testing only)
if (env.NODE_ENV !== 'production') {
  router.use('/storage/test', storageTestRoutes);
}

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Enterprise Workforce Management Platform API v1'
  });
});

export default router;
