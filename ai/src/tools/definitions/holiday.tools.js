import { z } from 'zod';
import executor from '#ai/tools/ToolExecutor.js';

/**
 * Holiday Tools — mcp_holidays_*
 * Specified in docs/mcp/holiday-tools.md
 */

export const mcp_holidays_get_calendar = {
  name: 'mcp_holidays_get_calendar',
  description: 'Retrieves the holiday calendar for a specific office location and year.',
  requiredPermissions: ['holiday.read'],
  inputSchema: z.object({
    locationId: z.string().describe('The location ObjectId'),
    year:       z.number().int().describe('Calendar year (e.g. 2026)'),
  }),
  async execute(args, ctx) {
    const { locationId, year } = args;
    const result = await executor.get(`/api/v1/locations/${locationId}/holidays/${year}`, {}, ctx.jwt, ctx.correlationId);
    if (!result.success) throw new Error(result.error);
    return result.data;
  },
};

export const mcp_holidays_create_or_update = {
  name: 'mcp_holidays_create_or_update',
  description: 'Creates or replaces the holiday calendar for a location and year.',
  requiredPermissions: ['holiday.update'],
  inputSchema: z.object({
    locationId: z.string().describe('The location ObjectId'),
    year:       z.number().int().describe('Calendar year (e.g. 2026)'),
    holidays:   z.array(
      z.object({
        name: z.string().describe('Holiday name (e.g. Christmas Day)'),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Date in YYYY-MM-DD format'),
        type: z.enum(['MANDATORY', 'OPTIONAL']).describe('Type of holiday'),
      })
    ).describe('Array of holidays to populate in the calendar'),
  }),
  async execute(args, ctx) {
    const { locationId, year, holidays } = args;
    const result = await executor.put(`/api/v1/locations/${locationId}/holidays/${year}`, { holidays }, ctx.jwt, ctx.correlationId);
    if (!result.success) throw new Error(result.error);
    return result.data;
  },
};

export const holidayTools = [
  mcp_holidays_get_calendar,
  mcp_holidays_create_or_update,
];
export default holidayTools;
