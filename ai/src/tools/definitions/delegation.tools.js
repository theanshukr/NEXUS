import { z } from 'zod';
import executor from '#ai/tools/ToolExecutor.js';

/**
 * Role Delegation Tools — mcp_delegation_*
 * Specified in docs/mcp/role-delegation-tools.md
 */

export const mcp_delegation_list = {
  name: 'mcp_delegation_list',
  description: 'Lists all active role delegation policy rules (sourceRoleId -> targetRoleId) in the organization.',
  requiredPermissions: ['role.read'],
  inputSchema: z.object({}),
  async execute(_args, ctx) {
    const result = await executor.get('/api/v1/role-delegation-policies', {}, ctx.jwt, ctx.correlationId);
    if (!result.success) throw new Error(result.error);
    return result.data;
  },
};

export const mcp_delegation_create = {
  name: 'mcp_delegation_create',
  description: 'Authorizes a source role to assign/grant a target role to other users.',
  requiredPermissions: ['role.create', 'role.update'],
  inputSchema: z.object({
    sourceRoleId: z.string().describe('The source role ObjectId (who can delegate)'),
    targetRoleId: z.string().describe('The target role ObjectId (what can be delegated)'),
  }),
  async execute(args, ctx) {
    const result = await executor.post('/api/v1/role-delegation-policies', args, ctx.jwt, ctx.correlationId);
    if (!result.success) throw new Error(result.error);
    return result.data;
  },
};

export const mcp_delegation_delete = {
  name: 'mcp_delegation_delete',
  description: 'Revokes a role delegation policy rule.',
  requiredPermissions: ['role.delete'],
  inputSchema: z.object({
    id: z.string().describe('The delegation policy rule ObjectId to delete'),
  }),
  async execute(args, ctx) {
    const result = await executor.delete(`/api/v1/role-delegation-policies/${args.id}`, {}, ctx.jwt, ctx.correlationId);
    if (!result.success) throw new Error(result.error);
    return result.data;
  },
};

export const delegationTools = [
  mcp_delegation_list,
  mcp_delegation_create,
  mcp_delegation_delete,
];
export default delegationTools;
