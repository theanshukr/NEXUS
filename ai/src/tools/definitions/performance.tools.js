import { z } from 'zod';
import executor from '#ai/tools/ToolExecutor.js';

/** Performance Management Tools — M-08 */
export const getMyKpiSummary = {
  name: 'getMyKpiSummary',
  description: 'Returns the authenticated user\'s current performance cycle KPI scores, review status, and goal completion percentages.',
  requiredPermissions: [],
  inputSchema: z.object({ cycleId: z.string().optional().describe('Performance cycle ID. Defaults to current active cycle.') }),
  async execute(args, ctx) {
    throw new Error("Action unavailable: The Performance Management (M-08) module is currently planned but not yet implemented in the backend. Please check back once the module has been fully provisioned.");
  },
};

export const submitPerformanceReview = {
  name: 'submitPerformanceReview',
  description: 'Submit a manager\'s performance evaluation and rating for a direct report for the current cycle.',
  requiredPermissions: ['performance.review'],
  inputSchema: z.object({
    revieweeId:   z.string().describe('Employee being reviewed'),
    cycleId:      z.string().describe('Performance cycle ID'),
    overallRating:z.number().min(1).max(5).describe('Overall performance rating (1-5)'),
    strengths:    z.string().min(20).describe('Key strengths observed'),
    improvements: z.string().min(20).describe('Areas for improvement'),
    goals:        z.array(z.object({ description: z.string(), achievementPercent: z.number().min(0).max(100) })).optional(),
  }),
  async execute(args, ctx) {
    throw new Error("Action unavailable: The Performance Management (M-08) module is currently planned but not yet implemented in the backend. Please check back once the module has been fully provisioned.");
  },
};

export const getTeamPerformanceSummary = {
  name: 'getTeamPerformanceSummary',
  description: 'Returns aggregated performance scores for all team members for the current or specified cycle.',
  requiredPermissions: ['performance.read'],
  inputSchema: z.object({ departmentId: z.string().optional(), cycleId: z.string().optional() }),
  async execute(args, ctx) {
    throw new Error("Action unavailable: The Performance Management (M-08) module is currently planned but not yet implemented in the backend. Please check back once the module has been fully provisioned.");
  },
};

export const performanceTools = [getMyKpiSummary, submitPerformanceReview, getTeamPerformanceSummary];
export default performanceTools;
