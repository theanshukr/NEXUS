import { z } from 'zod';
import executor from '#ai/tools/ToolExecutor.js';

/**
 * Leave Management Tools — M-06
 * This is the most feature-rich module for conversational HR workflows.
 */

export const getMyLeaveBalances = {
  name: 'getMyLeaveBalances',
  description: 'Returns the authenticated employee\'s current leave balances broken down by leave type (Annual, Sick, Casual, Maternity, etc.) including used, available, and pending days.',
  requiredPermissions: ['leave.apply'],
  inputSchema: z.object({
    year: z.number().int().min(2020).max(2030).optional().describe('Year to query balances for. Defaults to current year.'),
  }),
  async execute(args, ctx) {
    const result = await executor.get('/api/v1/leave/balances', args, ctx.jwt, ctx.correlationId);
    if (!result.success) throw new Error(result.error);
    return result.data;
  },
};

export const applyLeave = {
  name: 'applyLeave',
  description: 'Submit a new leave application for the authenticated user. Provide the leave type (code), start and end dates, and a reason.',
  requiredPermissions: ['leave.apply'],
  inputSchema: z.object({
    leaveCode:   z.enum(['ANNUAL', 'SICK', 'CASUAL', 'MATERNITY', 'PATERNITY', 'UNPAID', 'COMPENSATORY'])
                  .describe('Type of leave code to apply for'),
    startDate:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Start date in YYYY-MM-DD format'),
    endDate:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('End date in YYYY-MM-DD format'),
    reason:      z.string().min(10).max(500).describe('Reason for the leave request'),
    isHalfDay:   z.boolean().default(false).describe('Whether this is a half-day leave request'),
    halfDayPeriod: z.enum(['MORNING', 'AFTERNOON']).optional().describe('Which half period (required if isHalfDay is true)'),
  }),
  async execute(args, ctx) {
    const result = await executor.post('/api/v1/leave/requests', args, ctx.jwt, ctx.correlationId);
    if (!result.success) throw new Error(result.error);
    return result.data;
  },
};

export const getPendingLeaveApprovals = {
  name: 'getPendingLeaveApprovals',
  description: 'Returns all pending leave requests submitted by direct reports awaiting this manager\'s approval decision.',
  requiredPermissions: ['leave.approve'],
  inputSchema: z.object({
    departmentId: z.string().optional().describe('Filter by department. Defaults to all managed departments.'),
    page:  z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(50).default(10),
  }),
  async execute(args, ctx) {
    throw new Error('Action unavailable: The backend API does not currently support listing pending leave requests. Approvals must be performed using the leave ID directly via approveLeave or rejectLeave.');
  },
};

export const approveLeave = {
  name: 'approveLeave',
  description: 'Approve a pending leave application from a direct report. The employee will be notified immediately.',
  requiredPermissions: ['leave.approve'],
  inputSchema: z.object({
    leaveId: z.string().describe('The ID of the leave application to approve'),
  }),
  async execute(args, ctx) {
    const result = await executor.post(`/api/v1/leave/requests/${args.leaveId}/approve`, {}, ctx.jwt, ctx.correlationId);
    if (!result.success) throw new Error(result.error);
    return result.data;
  },
};

export const rejectLeave = {
  name: 'rejectLeave',
  description: 'Reject a pending leave application from a direct report. A reason is required for the rejection.',
  requiredPermissions: ['leave.approve'],
  inputSchema: z.object({
    leaveId: z.string().describe('The ID of the leave application to reject'),
    reason:  z.string().min(10).max(500).describe('Mandatory rejection reason to communicate to the employee'),
  }),
  async execute(args, ctx) {
    const result = await executor.post(`/api/v1/leave/requests/${args.leaveId}/reject`, { rejectionReason: args.reason }, ctx.jwt, ctx.correlationId);
    if (!result.success) throw new Error(result.error);
    return result.data;
  },
};

export const overrideLeaveBalance = {
  name: 'overrideLeaveBalance',
  description: 'Administratively adjust an employee\'s leave balance for a specific leave type. Used by HR admins only. Requires justification.',
  requiredPermissions: ['leave.override'],
  inputSchema: z.object({
    userId:      z.string().describe('The employee user ID to adjust balance for'),
    leaveType:   z.enum(['ANNUAL', 'SICK', 'CASUAL', 'MATERNITY', 'PATERNITY', 'UNPAID', 'COMPENSATORY']),
    adjustment:  z.number().describe('Number of days to add (positive) or deduct (negative)'),
    justification: z.string().min(20).describe('Audit-grade justification for the balance adjustment'),
  }),
  async execute(args, ctx) {
    throw new Error('Action unavailable: The backend API does not currently expose an endpoint for administratively adjusting leave balances.');
  },
};

export const leaveTools = [getMyLeaveBalances, applyLeave, getPendingLeaveApprovals, approveLeave, rejectLeave, overrideLeaveBalance];
export default leaveTools;
