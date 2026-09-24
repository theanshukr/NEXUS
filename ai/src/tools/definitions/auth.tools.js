import { z } from 'zod';
import executor from '#ai/tools/ToolExecutor.js';

/**
 * Authentication Tools — mcp_auth_*
 * Specified in docs/mcp/auth-tools.md
 */

export const mcp_auth_login = {
  name: 'mcp_auth_login',
  description: 'Authenticates a user with email and password, establishing an active session.',
  requiredPermissions: [], // Public endpoint
  inputSchema: z.object({
    email:    z.string().email().describe('User email address'),
    password: z.string().describe('User account password'),
  }),
  async execute(args, ctx) {
    const result = await executor.post('/api/v1/auth/login', args, ctx.jwt, ctx.correlationId);
    if (!result.success) throw new Error(result.error);
    return result.data;
  },
};

export const mcp_auth_refresh = {
  name: 'mcp_auth_refresh',
  description: 'Rotates short-lived JWT access tokens and refresh tokens.',
  requiredPermissions: [], // Public endpoint
  inputSchema: z.object({
    refreshToken: z.string().describe('Valid JWT refresh token'),
  }),
  async execute(args, ctx) {
    const result = await executor.post('/api/v1/auth/refresh', args, ctx.jwt, ctx.correlationId);
    if (!result.success) throw new Error(result.error);
    return result.data;
  },
};

export const mcp_auth_register_via_invite = {
  name: 'mcp_auth_register_via_invite',
  description: 'Completes onboarding registration using a validated invitation token.',
  requiredPermissions: [], // Public endpoint
  inputSchema: z.object({
    token:     z.string().describe('64-character hex invitation token'),
    firstName: z.string().min(2).describe('First name of the user'),
    lastName:  z.string().min(2).describe('Last name of the user'),
    password:  z.string().min(8).describe('New password (min 8 characters)'),
  }),
  async execute(args, ctx) {
    const result = await executor.post('/api/v1/auth/register-invite', args, ctx.jwt, ctx.correlationId);
    if (!result.success) throw new Error(result.error);
    return result.data;
  },
};

export const mcp_auth_logout = {
  name: 'mcp_auth_logout',
  description: 'Terminates user session and revokes refresh tokens.',
  requiredPermissions: [], // Any authenticated user can logout
  inputSchema: z.object({}),
  async execute(_args, ctx) {
    const result = await executor.post('/api/v1/auth/logout', {}, ctx.jwt, ctx.correlationId);
    if (!result.success) throw new Error(result.error);
    return result.data;
  },
};

export const mcp_auth_get_me = {
  name: 'mcp_auth_get_me',
  description: 'Retrieves current user identity, organization context, and computed RBAC permissions.',
  requiredPermissions: [], // Self profile lookup
  inputSchema: z.object({}),
  async execute(_args, ctx) {
    const result = await executor.get('/api/v1/auth/me', {}, ctx.jwt, ctx.correlationId);
    if (!result.success) throw new Error(result.error);
    return result.data;
  },
};

export const authTools = [
  mcp_auth_login,
  mcp_auth_refresh,
  mcp_auth_register_via_invite,
  mcp_auth_logout,
  mcp_auth_get_me,
];
export default authTools;
