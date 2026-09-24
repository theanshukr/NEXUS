import { z } from 'zod';
import executor from '#ai/tools/ToolExecutor.js';

/** Help Desk Tools — M-11 */
export const createSupportTicket = {
  name: 'createSupportTicket',
  description: 'Create a new IT or HR support ticket on behalf of the authenticated user.',
  requiredPermissions: [],
  inputSchema: z.object({
    type:     z.enum(['IT', 'HR', 'FINANCE', 'ADMIN', 'FACILITY']).describe('Ticket category'),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
    subject:  z.string().min(5).max(200).describe('Ticket subject/title'),
    description: z.string().min(20).max(2000).describe('Detailed description of the issue'),
  }),
  async execute(args, ctx) {
    throw new Error("Action unavailable: The Help Desk (M-11) module is currently planned but not yet implemented in the backend. Please check back once the module has been fully provisioned.");
  },
};

export const getMyTickets = {
  name: 'getMyTickets',
  description: 'Returns all support tickets raised by the authenticated user with their current status.',
  requiredPermissions: [],
  inputSchema: z.object({
    status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']).optional(),
    page: z.number().default(1), limit: z.number().default(10),
  }),
  async execute(args, ctx) {
    throw new Error("Action unavailable: The Help Desk (M-11) module is currently planned but not yet implemented in the backend. Please check back once the module has been fully provisioned.");
  },
};

export const resolveTicket = {
  name: 'resolveTicket',
  description: 'Mark a support ticket as resolved with a resolution note (IT/HR agents only).',
  requiredPermissions: ['ticket.resolve'],
  inputSchema: z.object({
    ticketId:        z.string(),
    resolutionNotes: z.string().min(10).describe('Description of how the issue was resolved'),
  }),
  async execute(args, ctx) {
    throw new Error("Action unavailable: The Help Desk (M-11) module is currently planned but not yet implemented in the backend. Please check back once the module has been fully provisioned.");
  },
};

export const helpdeskTools = [createSupportTicket, getMyTickets, resolveTicket];
export default helpdeskTools;
