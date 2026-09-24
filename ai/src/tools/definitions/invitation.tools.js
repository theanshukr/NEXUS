import { z } from 'zod';
import executor from '#ai/tools/ToolExecutor.js';

/**
 * Invitation Tools — mcp_invites_*
 * Specified in docs/mcp/invitation-tools.md
 */

export const mcp_invites_validate = {
  name: 'mcp_invites_validate',
  description: 'Verifies an onboarding invitation token and returns associated metadata.',
  requiredPermissions: [], // Public endpoint
  inputSchema: z.object({
    token: z.string().describe('64-character hex invitation token'),
  }),
  async execute(args, ctx) {
    const result = await executor.get(`/api/v1/invites/validate/${args.token}`, {}, ctx.jwt, ctx.correlationId);
    if (!result.success) throw new Error(result.error);
    return result.data;
  },
};

export const mcp_invites_create = {
  name: 'mcp_invites_create',
  description: 'Issues a cryptographic onboarding invitation to a new team member with pre-assigned target roles. Returns the actual invitation URL (inviteUrl) in the response, which you must use when replying to the user.',
  requiredPermissions: ['invite.create'],
  inputSchema: z.object({
    email:      z.string().email().describe('Invitee email address'),
    roleIds:    z.array(z.string()).describe('Target role ObjectIds to grant on registration'),
    employeeId: z.string().optional().describe('Link to an existing employee profile ObjectId'),
  }),
  async execute(args, ctx) {
    const result = await executor.post('/api/v1/invites', args, ctx.jwt, ctx.correlationId);
    if (!result.success) throw new Error(result.error);
    return result.data;
  },
};

export const mcp_invites_list = {
  name: 'mcp_invites_list',
  description: 'Lists all pending, accepted, and revoked invitations in the organization.',
  requiredPermissions: ['invite.read'],
  inputSchema: z.object({}),
  async execute(_args, ctx) {
    const result = await executor.get('/api/v1/invites', {}, ctx.jwt, ctx.correlationId);
    if (!result.success) throw new Error(result.error);
    return result.data;
  },
};

export const mcp_invites_revoke = {
  name: 'mcp_invites_revoke',
  description: 'Cancels a pending invitation, preventing token redemption.',
  requiredPermissions: ['invite.delete'],
  inputSchema: z.object({
    id:     z.string().describe('The invitation ObjectId to revoke'),
    reason: z.string().optional().describe('Reason for revoking the invitation'),
  }),
  async execute(args, ctx) {
    const { id, ...payload } = args;
    const result = await executor.delete(`/api/v1/invites/${id}`, payload, ctx.jwt, ctx.correlationId);
    if (!result.success) throw new Error(result.error);
    return result.data;
  },
};

export const invitationTools = [
  mcp_invites_validate,
  mcp_invites_create,
  mcp_invites_list,
  mcp_invites_revoke,
];
export default invitationTools;
