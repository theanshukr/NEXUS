import { z } from 'zod';
import executor from '#ai/tools/ToolExecutor.js';

/**
 * Designation Tools — mcp_desig_*
 * Specified in docs/mcp/designation-tools.md
 */

export const mcp_desig_list = {
  name: 'mcp_desig_list',
  description: 'Lists all job designations/titles in the organization.',
  requiredPermissions: ['designation.read'],
  inputSchema: z.object({
    status: z.string().optional().describe('Filter by status (e.g. ACTIVE, INACTIVE)'),
  }),
  async execute(args, ctx) {
    const result = await executor.get('/api/v1/designations', args, ctx.jwt, ctx.correlationId);
    if (!result.success) throw new Error(result.error);
    return result.data;
  },
};

export const mcp_desig_get_by_id = {
  name: 'mcp_desig_get_by_id',
  description: 'Retrieves details for a specific job designation.',
  requiredPermissions: ['designation.read'],
  inputSchema: z.object({
    id: z.string().describe('The designation ObjectId'),
  }),
  async execute(args, ctx) {
    const result = await executor.get(`/api/v1/designations/${args.id}`, {}, ctx.jwt, ctx.correlationId);
    if (!result.success) throw new Error(result.error);
    return result.data;
  },
};

export const mcp_desig_create = {
  name: 'mcp_desig_create',
  description: 'Creates a new job designation/title.',
  requiredPermissions: ['designation.create'],
  inputSchema: z.object({
    name:        z.string().describe('Job designation title/name'),
    code:        z.string().describe('Unique uppercase alphanumeric code for the designation'),
    description: z.string().optional().describe('Brief description of role responsibilities'),
  }),
  async execute(args, ctx) {
    const result = await executor.post('/api/v1/designations', args, ctx.jwt, ctx.correlationId);
    if (!result.success) throw new Error(result.error);
    return result.data;
  },
};

export const mcp_desig_update = {
  name: 'mcp_desig_update',
  description: 'Updates job designation metadata.',
  requiredPermissions: ['designation.update'],
  inputSchema: z.object({
    id:          z.string().describe('The designation ObjectId to update'),
    name:        z.string().optional().describe('New designation title/name'),
    description: z.string().optional().describe('New description of role responsibilities'),
  }),
  async execute(args, ctx) {
    const { id, ...payload } = args;
    const result = await executor.patch(`/api/v1/designations/${id}`, payload, ctx.jwt, ctx.correlationId);
    if (!result.success) throw new Error(result.error);
    return result.data;
  },
};

export const mcp_desig_archive = {
  name: 'mcp_desig_archive',
  description: 'Soft-deletes/archives a designation.',
  requiredPermissions: ['designation.delete'],
  inputSchema: z.object({
    id: z.string().describe('The designation ObjectId to archive'),
  }),
  async execute(args, ctx) {
    const result = await executor.post(`/api/v1/designations/${args.id}/archive`, {}, ctx.jwt, ctx.correlationId);
    if (!result.success) throw new Error(result.error);
    return result.data;
  },
};

export const designationTools = [
  mcp_desig_list,
  mcp_desig_get_by_id,
  mcp_desig_create,
  mcp_desig_update,
  mcp_desig_archive,
];
export default designationTools;
