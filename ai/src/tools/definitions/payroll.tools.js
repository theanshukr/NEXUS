import { z } from 'zod';
import executor from '#ai/tools/ToolExecutor.js';

/**
 * Payroll Engine Tools — M-07
 */

export const getMyPayslip = {
  name: 'getMyPayslip',
  description: 'Returns the authenticated employee\'s payslips for the specified month/year.',
  requiredPermissions: [],
  inputSchema: z.object({
    month: z.number().int().min(1).max(12).optional().describe('Filter by month (1-12)'),
    year:  z.number().int().min(2020).max(2030).optional().describe('Filter by year'),
  }),
  async execute(args, ctx) {
    // 1. Get current user's profile to find their email
    const meResult = await executor.get('/api/v1/auth/me', {}, ctx.jwt, ctx.correlationId);
    if (!meResult.success) throw new Error(meResult.error);
    const email = meResult.data.user.email;

    // 2. Find employee profile by email keyword
    const empResult = await executor.get('/api/v1/employees', { keyword: email }, ctx.jwt, ctx.correlationId);
    if (!empResult.success) throw new Error(empResult.error);
    
    const employees = empResult.data.data || empResult.data;
    const employee = employees.find(e => e.workEmail.toLowerCase() === email.toLowerCase());
    if (!employee) throw new Error(`No employee profile found for user email ${email}`);

    // 3. Call the payslips route with the employeeId
    const result = await executor.get(`/api/v1/payroll/payslips/employee/${employee._id}`, args, ctx.jwt, ctx.correlationId);
    if (!result.success) throw new Error(result.error);
    return result.data;
  },
};

export const initiatePayrollRun = {
  name: 'initiatePayrollRun',
  description: 'Triggers the payroll calculation engine for a specific payroll cycle. Returns the payroll run summary.',
  requiredPermissions: ['payroll.run'],
  inputSchema: z.object({
    payrollCycleId: z.string().describe('The open payroll cycle ID to execute payroll for'),
  }),
  async execute(args, ctx) {
    const result = await executor.post('/api/v1/payroll/runs', { payrollCycleId: args.payrollCycleId }, ctx.jwt, ctx.correlationId);
    if (!result.success) throw new Error(result.error);
    return result.data;
  },
};

export const lockAndPublishPayroll = {
  name: 'lockAndPublishPayroll',
  description: 'Locks the payroll ledger for the specified period and triggers payslip generation. This action is IRREVERSIBLE.',
  requiredPermissions: ['payroll.lock'],
  inputSchema: z.object({
    payrollRunId: z.string().describe('The payroll run ID returned by initiatePayrollRun'),
    confirmLock:  z.boolean().describe('Must be explicitly set to true to confirm this irreversible action'),
  }),
  async execute(args, ctx) {
    if (!args.confirmLock) {
      return { message: 'Action cancelled: confirmLock must be true to proceed with locking payroll.' };
    }
    const result = await executor.post(`/api/v1/payroll/runs/${args.payrollRunId}/lock`, {}, ctx.jwt, ctx.correlationId);
    if (!result.success) throw new Error(result.error);
    return result.data;
  },
};

export const getCompensationStructure = {
  name: 'getCompensationStructure',
  description: 'Returns the detailed gross-to-net salary breakdown for a specific employee.',
  requiredPermissions: ['payroll.view_salary'],
  inputSchema: z.object({
    employeeId: z.string().describe('Employee ID to view compensation for'),
  }),
  async execute(args, ctx) {
    const query = { targetType: 'EMPLOYEE', targetId: args.employeeId };
    const result = await executor.get('/api/v1/payroll/structures', query, ctx.jwt, ctx.correlationId);
    if (!result.success) throw new Error(result.error);
    return result.data;
  },
};

export const payrollTools = [getMyPayslip, initiatePayrollRun, lockAndPublishPayroll, getCompensationStructure];
export default payrollTools;
