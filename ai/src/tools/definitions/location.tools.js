import { z } from 'zod';
import executor from '#ai/tools/ToolExecutor.js';

/**
 * Location Tools — mcp_loc_*
 * Specified in docs/mcp/location-tools.md
 */

export const mcp_loc_list = {
  name: 'mcp_loc_list',
  description: 'Lists office locations and operational sites.',
  requiredPermissions: ['location.read'],
  inputSchema: z.object({
    status: z.string().optional().describe('Filter by status (e.g. ACTIVE, INACTIVE)'),
  }),
  async execute(args, ctx) {
    const result = await executor.get('/api/v1/locations', args, ctx.jwt, ctx.correlationId);
    if (!result.success) throw new Error(result.error);
    return result.data;
  },
};

export const mcp_loc_get_by_id = {
  name: 'mcp_loc_get_by_id',
  description: 'Retrieves details for a specific location.',
  requiredPermissions: ['location.read'],
  inputSchema: z.object({
    id: z.string().describe('The location ObjectId'),
  }),
  async execute(args, ctx) {
    const result = await executor.get(`/api/v1/locations/${args.id}`, {}, ctx.jwt, ctx.correlationId);
    if (!result.success) throw new Error(result.error);
    return result.data;
  },
};

export const mcp_loc_create = {
  name: 'mcp_loc_create',
  description: 'Creates a new office location with timezone specifications.',
  requiredPermissions: ['location.create'],
  inputSchema: z.object({
    name:     z.string().describe('Office/site location name'),
    code:     z.string().describe('Unique uppercase alphanumeric code for the location'),
    timezone: z.string().describe('IANA timezone string (e.g., America/New_York)'),
    address:  z.string().optional().describe('Physical mailing address'),
  }),
  async execute(args, ctx) {
    const result = await executor.post('/api/v1/locations', args, ctx.jwt, ctx.correlationId);
    if (!result.success) throw new Error(result.error);
    return result.data;
  },
};

export const mcp_loc_update = {
  name: 'mcp_loc_update',
  description: 'Updates office location details or timezone.',
  requiredPermissions: ['location.update'],
  inputSchema: z.object({
    id:       z.string().describe('The location ObjectId to update'),
    name:     z.string().optional().describe('New office/site name'),
    timezone: z.string().optional().describe('New IANA timezone string'),
  }),
  async execute(args, ctx) {
    const { id, ...payload } = args;
    const result = await executor.patch(`/api/v1/locations/${id}`, payload, ctx.jwt, ctx.correlationId);
    if (!result.success) throw new Error(result.error);
    return result.data;
  },
};

export const mcp_loc_archive = {
  name: 'mcp_loc_archive',
  description: 'Soft-deletes/archives an office location.',
  requiredPermissions: ['location.delete'],
  inputSchema: z.object({
    id: z.string().describe('The location ObjectId to archive'),
  }),
  async execute(args, ctx) {
    const result = await executor.post(`/api/v1/locations/${args.id}/archive`, {}, ctx.jwt, ctx.correlationId);
    if (!result.success) throw new Error(result.error);
    return result.data;
  },
};

export const locationTools = [
  mcp_loc_list,
  mcp_loc_get_by_id,
  mcp_loc_create,
  mcp_loc_update,
  mcp_loc_archive,
];
export default locationTools;
