import { z } from 'zod';
import executor from '#ai/tools/ToolExecutor.js';

/**
 * Role & RBAC Tools — mcp_roles_*
 * Specified in docs/mcp/role-tools.md
 */

export const mcp_roles_get_system_permissions = {
  name: 'mcp_roles_get_system_permissions',
  description: 'Lists all available atomic permission strings in the platform registry.',
  requiredPermissions: ['role.read'],
  inputSchema: z.object({}),
  async execute(_args, ctx) {
    const result = await executor.get('/api/v1/roles/system-permissions', {}, ctx.jwt, ctx.correlationId);
    if (!result.success) throw new Error(result.error);
    return result.data;
  },
};

export const mcp_roles_list = {
  name: 'mcp_roles_list',
  description: 'Retrieves all role definitions within the authenticated organization.',
  requiredPermissions: ['role.read'],
  inputSchema: z.object({}),
  async execute(_args, ctx) {
    const result = await executor.get('/api/v1/roles', {}, ctx.jwt, ctx.correlationId);
    if (!result.success) throw new Error(result.error);
    return result.data;
  },
};

export const mcp_roles_create = {
  name: 'mcp_roles_create',
  description: 'Creates a custom RBAC role with granular permission strings.',
  requiredPermissions: ['role.create'],
  inputSchema: z.object({
    name:        z.string().min(2).describe('Unique dynamic role name'),
    description: z.string().optional().describe('Description of what the role is for'),
    permissions: z.array(z.string()).describe('List of permission strings (e.g. user.read)'),
    priority:    z.number().int().optional().describe('Role evaluation precedence order priority'),
  }),
  async execute(args, ctx) {
    const result = await executor.post('/api/v1/roles', args, ctx.jwt, ctx.correlationId);
    if (!result.success) throw new Error(result.error);
    return result.data;
  },
};

export const mcp_roles_update = {
  name: 'mcp_roles_update',
  description: 'Updates permissions or metadata of a custom role.',
  requiredPermissions: ['role.update'],
  inputSchema: z.object({
    id:          z.string().describe('The role ObjectId to update'),
    name:        z.string().optional().describe('New name of the role'),
    description: z.string().optional().describe('New description of the role'),
    permissions: z.array(z.string()).optional().describe('New list of permission strings'),
  }),
  async execute(args, ctx) {
    const { id, ...payload } = args;
    const result = await executor.put(`/api/v1/roles/${id}`, payload, ctx.jwt, ctx.correlationId);
    if (!result.success) throw new Error(result.error);
    return result.data;
  },
};

export const mcp_roles_duplicate = {
  name: 'mcp_roles_duplicate',
  description: 'Clones an existing role definition with a new name.',
  requiredPermissions: ['role.create'],
  inputSchema: z.object({
    id:   z.string().describe('The role ObjectId to duplicate'),
    name: z.string().describe('New cloned role name'),
  }),
  async execute(args, ctx) {
    const { id, name } = args;
    const result = await executor.post(`/api/v1/roles/${id}/duplicate`, { name }, ctx.jwt, ctx.correlationId);
    if (!result.success) throw new Error(result.error);
    return result.data;
  },
};

export const mcp_roles_delete = {
  name: 'mcp_roles_delete',
  description: 'Archives/deletes a custom role definition.',
  requiredPermissions: ['role.delete'],
  inputSchema: z.object({
    id: z.string().describe('The role ObjectId to delete'),
  }),
  async execute(args, ctx) {
    const result = await executor.delete(`/api/v1/roles/${args.id}`, {}, ctx.jwt, ctx.correlationId);
    if (!result.success) throw new Error(result.error);
    return result.data;
  },
};

export const mcp_roles_assign = {
  name: 'mcp_roles_assign',
  description: 'Grants an RBAC role to a target user account.',
  requiredPermissions: ['role.assign'],
  inputSchema: z.object({
    userId: z.string().describe('The user ObjectId'),
    roleId: z.string().describe('The role ObjectId to assign'),
  }),
  async execute(args, ctx) {
    const result = await executor.post('/api/v1/roles/assign', args, ctx.jwt, ctx.correlationId);
    if (!result.success) throw new Error(result.error);
    return result.data;
  },
};

export const mcp_roles_remove = {
  name: 'mcp_roles_remove',
  description: 'Revokes an RBAC role from a target user account.',
  requiredPermissions: ['role.assign'],
  inputSchema: z.object({
    userId: z.string().describe('The user ObjectId'),
    roleId: z.string().describe('The role ObjectId to revoke'),
  }),
  async execute(args, ctx) {
    const result = await executor.post('/api/v1/roles/remove', args, ctx.jwt, ctx.correlationId);
    if (!result.success) throw new Error(result.error);
    return result.data;
  },
};

export const roleTools = [
  mcp_roles_get_system_permissions,
  mcp_roles_list,
  mcp_roles_create,
  mcp_roles_update,
  mcp_roles_duplicate,
  mcp_roles_delete,
  mcp_roles_assign,
  mcp_roles_remove,
];
export default roleTools;
