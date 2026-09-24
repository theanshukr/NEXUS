import { z } from 'zod';
import executor from '#ai/tools/ToolExecutor.js';

/**
 * Shift Tools — mcp_shift_*
 * Specified in docs/mcp/shift-tools.md
 */

export const mcp_shift_list = {
  name: 'mcp_shift_list',
  description: 'Lists all work schedule shifts.',
  requiredPermissions: ['shift.read'],
  inputSchema: z.object({
    status: z.string().optional().describe('Filter by status (e.g. ACTIVE, INACTIVE)'),
  }),
  async execute(args, ctx) {
    const result = await executor.get('/api/v1/shifts', args, ctx.jwt, ctx.correlationId);
    if (!result.success) throw new Error(result.error);
    return result.data;
  },
};

export const mcp_shift_get_by_id = {
  name: 'mcp_shift_get_by_id',
  description: 'Retrieves details for a specific shift schedule.',
  requiredPermissions: ['shift.read'],
  inputSchema: z.object({
    id: z.string().describe('The shift ObjectId'),
  }),
  async execute(args, ctx) {
    const result = await executor.get(`/api/v1/shifts/${args.id}`, {}, ctx.jwt, ctx.correlationId);
    if (!result.success) throw new Error(result.error);
    return result.data;
  },
};

export const mcp_shift_create = {
  name: 'mcp_shift_create',
  description: 'Creates a new shift schedule with start time, end time, and break durations.',
  requiredPermissions: ['shift.create'],
  inputSchema: z.object({
    name:      z.string().describe('Shift display name (e.g. Morning Shift)'),
    code:      z.string().describe('Unique uppercase shift code (e.g. SH-MORN)'),
    startTime: z.string().regex(/^(([0-1][0-9])|(2[0-3])):[0-5][0-9]$/).describe('Start time in HH:MM format'),
    endTime:   z.string().regex(/^(([0-1][0-9])|(2[0-3])):[0-5][0-9]$/).describe('End time in HH:MM format'),
  }),
  async execute(args, ctx) {
    const result = await executor.post('/api/v1/shifts', args, ctx.jwt, ctx.correlationId);
    if (!result.success) throw new Error(result.error);
    return result.data;
  },
};

export const mcp_shift_update = {
  name: 'mcp_shift_update',
  description: 'Updates work shift timing or break rules.',
  requiredPermissions: ['shift.update'],
  inputSchema: z.object({
    id:        z.string().describe('The shift ObjectId to update'),
    name:      z.string().optional().describe('New shift display name'),
    startTime: z.string().optional().describe('New shift start time in HH:MM format'),
    endTime:   z.string().optional().describe('New shift end time in HH:MM format'),
  }),
  async execute(args, ctx) {
    const { id, ...payload } = args;
    const result = await executor.patch(`/api/v1/shifts/${id}`, payload, ctx.jwt, ctx.correlationId);
    if (!result.success) throw new Error(result.error);
    return result.data;
  },
};

export const mcp_shift_archive = {
  name: 'mcp_shift_archive',
  description: 'Soft-deletes/archives a shift schedule.',
  requiredPermissions: ['shift.delete'],
  inputSchema: z.object({
    id: z.string().describe('The shift ObjectId to archive'),
  }),
  async execute(args, ctx) {
    const result = await executor.post(`/api/v1/shifts/${args.id}/archive`, {}, ctx.jwt, ctx.correlationId);
    if (!result.success) throw new Error(result.error);
    return result.data;
  },
};

export const shiftTools = [
  mcp_shift_list,
  mcp_shift_get_by_id,
  mcp_shift_create,
  mcp_shift_update,
  mcp_shift_archive,
];
export default shiftTools;
