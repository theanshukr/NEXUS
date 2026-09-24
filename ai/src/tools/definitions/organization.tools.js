import { z } from 'zod';
import executor from '#ai/tools/ToolExecutor.js';

/**
 * Organization Tools — mcp_org_*
 * Specified in docs/mcp/organization-tools.md
 */

export const mcp_org_create = {
  name: 'mcp_org_create',
  description: 'Provisions a new enterprise tenant organization, root admin account, settings, and default hierarchy.',
  requiredPermissions: [], // Public endpoint
  inputSchema: z.object({
    name:           z.string().min(2).describe('Full legal company name'),
    domain:         z.string().describe('Company email domain (e.g. company.com)'),
    code:           z.string().regex(/^[A-Z0-9_-]+$/).describe('Unique uppercase tenant code'),
    adminEmail:     z.string().email().describe('Admin email address'),
    adminPassword:  z.string().min(8).describe('Admin account password (min 8 chars)'),
    adminFirstName: z.string().describe('Admin first name'),
    adminLastName:  z.string().describe('Admin last name'),
  }),
  async execute(args, ctx) {
    const result = await executor.post('/api/v1/organizations', args, ctx.jwt, ctx.correlationId);
    if (!result.success) throw new Error(result.error);
    return result.data;
  },
};

export const mcp_org_get_my = {
  name: 'mcp_org_get_my',
  description: 'Retrieves details and operational configuration settings of the authenticated user\'s organization.',
  requiredPermissions: ['org.read'], // Fallback to org.read
  inputSchema: z.object({}),
  async execute(_args, ctx) {
    const result = await executor.get('/api/v1/organizations/me', {}, ctx.jwt, ctx.correlationId);
    if (!result.success) throw new Error(result.error);
    return result.data;
  },
};

export const organizationTools = [
  mcp_org_create,
  mcp_org_get_my,
];
export default organizationTools;
