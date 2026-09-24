import { z } from 'zod';
import executor from '#ai/tools/ToolExecutor.js';

/**
 * Attendance Tracking Tools — M-05
 */

export const getMyAttendanceSummary = {
  name: 'getMyAttendanceSummary',
  description: 'Returns the authenticated employee\'s attendance records for the current or specified period.',
  requiredPermissions: ['attendance.mark'],
  inputSchema: z.object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('Start date in YYYY-MM-DD format'),
    endDate:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('End date in YYYY-MM-DD format'),
  }),
  async execute(args, ctx) {
    const result = await executor.get('/api/v1/attendance/me', args, ctx.jwt, ctx.correlationId);
    if (!result.success) throw new Error(result.error);
    return result.data;
  },
};

export const getTeamAttendance = {
  name: 'getTeamAttendance',
  description: 'Returns the attendance report for all members of a department over a specified date range.',
  requiredPermissions: ['attendance.approve'],
  inputSchema: z.object({
    departmentId: z.string().describe('Department ID to pull attendance for'),
    startDate:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Start date (YYYY-MM-DD)'),
    endDate:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('End date (YYYY-MM-DD)'),
  }),
  async execute(args, ctx) {
    const queryParams = {
      type: 'department',
      departmentId: args.departmentId,
      dateFrom: args.startDate,
      dateTo: args.endDate
    };
    const result = await executor.get('/api/v1/attendance/reports', queryParams, ctx.jwt, ctx.correlationId);
    if (!result.success) throw new Error(result.error);
    return result.data;
  },
};

export const approveAttendanceRegularization = {
  name: 'approveAttendanceRegularization',
  description: 'Approves an employee\'s attendance regularization request for a missed check-in or absent day.',
  requiredPermissions: ['attendance.approve'],
  inputSchema: z.object({
    requestId: z.string().describe('Regularization request ID'),
    comment:   z.string().max(300).optional().describe('Approval comment'),
  }),
  async execute(args, ctx) {
    const result = await executor.post(`/api/v1/attendance/regularizations/${args.requestId}/approve`, { comment: args.comment }, ctx.jwt, ctx.correlationId);
    if (!result.success) throw new Error(result.error);
    return result.data;
  },
};

export const attendanceTools = [getMyAttendanceSummary, getTeamAttendance, approveAttendanceRegularization];
export default attendanceTools;
