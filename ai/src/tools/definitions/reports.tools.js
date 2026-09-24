import { z } from 'zod';
import executor from '#ai/tools/ToolExecutor.js';

/** Reports & Analytics Tools — M-14 */
export const getHeadcountReport = {
  name: 'getHeadcountReport',
  description: 'Returns current headcount grouped by department, designation, employment type, and work location.',
  requiredPermissions: ['reports.read'],
  inputSchema: z.object({ asOfDate: z.string().optional().describe('Report snapshot date (YYYY-MM-DD). Defaults to today.') }),
  async execute(args, ctx) {
    throw new Error("Action unavailable: The Executive Reports & Analytics (M-14) module is currently planned but not yet implemented in the backend. Please check back once the module has been fully provisioned.");
  },
};

export const getAttritionReport = {
  name: 'getAttritionReport',
  description: 'Returns monthly attrition rate, voluntary vs involuntary breakdown, and exit reason analysis for a specified period.',
  requiredPermissions: ['reports.read'],
  inputSchema: z.object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Report start date'),
    endDate:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Report end date'),
  }),
  async execute(args, ctx) {
    throw new Error("Action unavailable: The Executive Reports & Analytics (M-14) module is currently planned but not yet implemented in the backend. Please check back once the module has been fully provisioned.");
  },
};

export const getLeaveUtilizationReport = {
  name: 'getLeaveUtilizationReport',
  description: 'Returns leave utilization rates broken down by leave type, department, and employee seniority band.',
  requiredPermissions: ['reports.read'],
  inputSchema: z.object({
    year:         z.number().int().min(2020).max(2030).describe('Report year'),
    departmentId: z.string().optional().describe('Filter to a specific department'),
  }),
  async execute(args, ctx) {
    throw new Error("Action unavailable: The Executive Reports & Analytics (M-14) module is currently planned but not yet implemented in the backend. Please check back once the module has been fully provisioned.");
  },
};

export const getAttendanceComplianceReport = {
  name: 'getAttendanceComplianceReport',
  description: 'Returns attendance regularity scores, late check-in violations, and absenteeism rates by department.',
  requiredPermissions: ['reports.read'],
  inputSchema: z.object({
    month: z.number().int().min(1).max(12),
    year:  z.number().int().min(2020).max(2030),
    departmentId: z.string().optional(),
  }),
  async execute(args, ctx) {
    throw new Error("Action unavailable: The Executive Reports & Analytics (M-14) module is currently planned but not yet implemented in the backend. Please check back once the module has been fully provisioned.");
  },
};

export const reportsTools = [getHeadcountReport, getAttritionReport, getLeaveUtilizationReport, getAttendanceComplianceReport];
export default reportsTools;
