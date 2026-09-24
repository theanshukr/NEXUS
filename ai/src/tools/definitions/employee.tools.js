import { z } from 'zod';
import executor from '#ai/tools/ToolExecutor.js';

/**
 * Employee Management Tools — mcp_emp_*
 * Specified in docs/mcp/employee-tools.md
 */

export const mcp_emp_list = {
  name: 'mcp_emp_list',
  description: 'Retrieves paginated employee workforce records with filtering.',
  requiredPermissions: ['user.read'],
  inputSchema: z.object({
    status:          z.string().optional().describe('Filter by business status'),
    departmentId:    z.string().optional().describe('Filter by department ID'),
    search:          z.string().optional().describe('Search keyword (first/last name, email)'),
    includeArchived: z.boolean().optional().describe('Include archived profiles'),
    onlyArchived:    z.boolean().optional().describe('Only retrieve archived profiles'),
    page:            z.number().int().min(1).default(1),
    limit:           z.number().int().min(1).default(50),
  }),
  async execute(args, ctx) {
    const result = await executor.get('/api/v1/employees', args, ctx.jwt, ctx.correlationId);
    if (!result.success) throw new Error(result.error);
    return result.data;
  },
};

export const mcp_emp_get_org_chart = {
  name: 'mcp_emp_get_org_chart',
  description: 'Retrieves the organizational reporting hierarchy tree (who reports to whom).',
  requiredPermissions: ['user.read'],
  inputSchema: z.object({}),
  async execute(_args, ctx) {
    const result = await executor.get('/api/v1/employees/org-chart', {}, ctx.jwt, ctx.correlationId);
    if (!result.success) throw new Error(result.error);
    return result.data;
  },
};

export const mcp_emp_get_by_id = {
  name: 'mcp_emp_get_by_id',
  description: 'Retrieves complete profile and employment history for a specific employee.',
  requiredPermissions: ['user.read'],
  inputSchema: z.object({
    id: z.string().describe('The employee ObjectId'),
  }),
  async execute(args, ctx) {
    const result = await executor.get(`/api/v1/employees/${args.id}`, {}, ctx.jwt, ctx.correlationId);
    if (!result.success) throw new Error(result.error);
    return result.data;
  },
};

export const mcp_emp_create = {
  name: 'mcp_emp_create',
  description: 'Provisions a new employee profile with status ONBOARDING.',
  requiredPermissions: ['user.create'],
  inputSchema: z.object({
    firstName:          z.string().describe('First name of the employee'),
    lastName:           z.string().describe('Last name of the employee'),
    workEmail:          z.string().email().describe('Work email address'),
    departmentId:       z.string().describe('Department ObjectId assignment'),
    designationId:      z.string().optional().describe('Designation ObjectId assignment'),
    reportingManagerId: z.string().optional().describe('Manager user ObjectId'),
    joinDate:           z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Start date (YYYY-MM-DD)'),
  }),
  async execute(args, ctx) {
    const result = await executor.post('/api/v1/employees', args, ctx.jwt, ctx.correlationId);
    if (!result.success) throw new Error(result.error);
    return result.data;
  },
};

export const mcp_emp_update_profile = {
  name: 'mcp_emp_update_profile',
  description: 'Modifies biographical or organizational profile attributes and logs an EmploymentHistory record.',
  requiredPermissions: ['user.update'],
  inputSchema: z.object({
    id:           z.string().describe('The employee ObjectId'),
    firstName:    z.string().optional().describe('Updated first name'),
    lastName:     z.string().optional().describe('Updated last name'),
    departmentId: z.string().optional().describe('Updated department assignment ID'),
    changeReason: z.string().optional().describe('Reason for updating profile details'),
  }),
  async execute(args, ctx) {
    const { id, ...payload } = args;
    const result = await executor.patch(`/api/v1/employees/${id}/profile`, payload, ctx.jwt, ctx.correlationId);
    if (!result.success) throw new Error(result.error);
    return result.data;
  },
};

export const mcp_emp_change_status = {
  name: 'mcp_emp_change_status',
  description: 'Transitions employee business status lifecycle (ONBOARDING, ACTIVE, SUSPENDED, TERMINATED, RESIGNED).',
  requiredPermissions: ['user.change_status'],
  inputSchema: z.object({
    id:     z.string().describe('The employee ObjectId'),
    status: z.enum(['ONBOARDING', 'ACTIVE', 'SUSPENDED', 'TERMINATED', 'RESIGNED']).describe('Target employment status'),
    reason: z.string().optional().describe('Reason for changing the employee lifecycle status'),
  }),
  async execute(args, ctx) {
    const { id, ...payload } = args;
    const result = await executor.put(`/api/v1/employees/${id}/status`, payload, ctx.jwt, ctx.correlationId);
    if (!result.success) throw new Error(result.error);
    return result.data;
  },
};

export const mcp_emp_change_manager = {
  name: 'mcp_emp_change_manager',
  description: 'Reassigns an employee\'s reporting manager and checks for reporting loops.',
  requiredPermissions: ['user.change_manager'],
  inputSchema: z.object({
    id:           z.string().describe('The employee ObjectId'),
    newManagerId: z.string().describe('The new manager user ObjectId'),
    reason:       z.string().optional().describe('Reason for reporting line reassignment'),
  }),
  async execute(args, ctx) {
    const { id, ...payload } = args;
    const result = await executor.put(`/api/v1/employees/${id}/manager`, payload, ctx.jwt, ctx.correlationId);
    if (!result.success) throw new Error(result.error);
    return result.data;
  },
};

export const mcp_emp_invite = {
  name: 'mcp_emp_invite',
  description: 'Triggers onboarding invitation email for an employee profile. Returns the invitation details including the actual inviteUrl, which you must use when replying to the user.',
  requiredPermissions: ['user.invite'],
  inputSchema: z.object({
    id:      z.string().describe('The employee ObjectId'),
    roleIds: z.array(z.string()).describe('Target role ObjectIds to assign to the user on registration'),
  }),
  async execute(args, ctx) {
    const { id, ...payload } = args;
    const result = await executor.post(`/api/v1/employees/${id}/invite`, payload, ctx.jwt, ctx.correlationId);
    if (!result.success) throw new Error(result.error);
    return result.data;
  },
};

export const mcp_emp_archive = {
  name: 'mcp_emp_archive',
  description: 'Soft-deletes an employee profile without altering their business status.',
  requiredPermissions: ['user.archive'],
  inputSchema: z.object({
    id:     z.string().describe('The employee ObjectId'),
    reason: z.string().optional().describe('Reason for soft-deleting/archiving the employee profile'),
  }),
  async execute(args, ctx) {
    const { id, ...payload } = args;
    const result = await executor.post(`/api/v1/employees/${id}/archive`, payload, ctx.jwt, ctx.correlationId);
    if (!result.success) throw new Error(result.error);
    return result.data;
  },
};

export const mcp_emp_restore = {
  name: 'mcp_emp_restore',
  description: 'Restores a previously archived employee profile.',
  requiredPermissions: ['user.restore'],
  inputSchema: z.object({
    id: z.string().describe('The employee ObjectId'),
  }),
  async execute(args, ctx) {
    const result = await executor.post(`/api/v1/employees/${args.id}/restore`, {}, ctx.jwt, ctx.correlationId);
    if (!result.success) throw new Error(result.error);
    return result.data;
  },
};

export const employeeTools = [
  mcp_emp_list,
  mcp_emp_get_org_chart,
  mcp_emp_get_by_id,
  mcp_emp_create,
  mcp_emp_update_profile,
  mcp_emp_change_status,
  mcp_emp_change_manager,
  mcp_emp_invite,
  mcp_emp_archive,
  mcp_emp_restore,
];
export default employeeTools;
