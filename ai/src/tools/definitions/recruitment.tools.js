import { z } from 'zod';
import executor from '#ai/tools/ToolExecutor.js';

/** Recruitment Tools — M-04 */
export const listOpenPositions = {
  name: 'listOpenPositions',
  description: 'Returns all open/active job requisitions with applicant counts, hiring manager, and expected fill date.',
  requiredPermissions: ['recruitment.read'],
  inputSchema: z.object({
    departmentId: z.string().optional(),
    page: z.number().default(1),
    limit: z.number().default(10)
  }),
  async execute(args, ctx) {
    const query = { status: 'ACTIVE', ...args };
    const result = await executor.get('/api/v1/requisitions', query, ctx.jwt, ctx.correlationId);
    if (!result.success) throw new Error(result.error);
    return result.data;
  },
};

export const advanceApplicationStage = {
  name: 'advanceApplicationStage',
  description: 'Advance a candidate\'s application to the next sequential stage in the hiring workflow.',
  requiredPermissions: ['recruitment.manage'],
  inputSchema: z.object({
    applicationId: z.string().describe('Candidate application ID'),
  }),
  async execute(args, ctx) {
    const result = await executor.patch(`/api/v1/applications/${args.applicationId}/advance`, {}, ctx.jwt, ctx.correlationId);
    if (!result.success) throw new Error(result.error);
    return result.data;
  },
};

export const scheduleInterview = {
  name: 'scheduleInterview',
  description: 'Schedule an interview slot for a shortlisted candidate application.',
  requiredPermissions: ['recruitment.manage'],
  inputSchema: z.object({
    applicationId:  z.string().describe('Candidate application ID'),
    stageId:        z.string().describe('The stage ID from the workflow'),
    round:          z.number().int().min(1).default(1),
    title:          z.string().describe('Interview title (e.g. Technical Round 1)'),
    interviewType:  z.enum(['ONLINE', 'OFFLINE', 'PHONE']).describe('Type of interview'),
    scheduledStart: z.string().describe('ISO 8601 datetime string for start time'),
    scheduledEnd:   z.string().describe('ISO 8601 datetime string for end time'),
    timezone:       z.string().describe('Timezone string (e.g. UTC, Asia/Kolkata)'),
    meetingUrl:     z.string().url().optional().describe('Video meeting URL (required for ONLINE)'),
    location:       z.string().optional().describe('Meeting room/address'),
    interviewerIds: z.array(z.string()).describe('Array of interviewer user IDs'),
  }),
  async execute(args, ctx) {
    const { applicationId, ...body } = args;
    const result = await executor.post(`/api/v1/applications/${applicationId}/interviews`, body, ctx.jwt, ctx.correlationId);
    if (!result.success) throw new Error(result.error);
    return result.data;
  },
};

export const recruitmentTools = [listOpenPositions, advanceApplicationStage, scheduleInterview];
export default recruitmentTools;
