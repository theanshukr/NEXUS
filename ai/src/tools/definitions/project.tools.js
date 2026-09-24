import { z } from 'zod';
import executor from '#ai/tools/ToolExecutor.js';

/** Project & Task Management Tools — M-09 */
export const listMyProjects = {
  name: 'listMyProjects',
  description: 'Lists all active projects the authenticated user is assigned to, including completion percentage and upcoming deadlines.',
  requiredPermissions: ['project.read'],
  inputSchema: z.object({ status: z.enum(['ACTIVE', 'ON_HOLD', 'COMPLETED']).optional() }),
  async execute(args, ctx) {
    throw new Error("Action unavailable: The Project Management (M-09) module is currently planned but not yet implemented in the backend. Please check back once the module has been fully provisioned.");
  },
};

export const getProjectStatus = {
  name: 'getProjectStatus',
  description: 'Returns the full task breakdown, completion percentage, blockers, and team assignments for a specific project.',
  requiredPermissions: ['project.read'],
  inputSchema: z.object({ projectId: z.string().describe('Project ID') }),
  async execute(args, ctx) {
    throw new Error("Action unavailable: The Project Management (M-09) module is currently planned but not yet implemented in the backend. Please check back once the module has been fully provisioned.");
  },
};

export const createTask = {
  name: 'createTask',
  description: 'Create a new task within a project and assign it to an employee with a due date and priority.',
  requiredPermissions: ['project.manage'],
  inputSchema: z.object({
    projectId:   z.string().describe('Project to create the task in'),
    title:       z.string().min(3).max(200).describe('Task title'),
    description: z.string().optional().describe('Detailed task description'),
    assigneeId:  z.string().describe('User ID to assign the task to'),
    dueDate:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Due date (YYYY-MM-DD)'),
    priority:    z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  }),
  async execute(args, ctx) {
    throw new Error("Action unavailable: The Project Management (M-09) module is currently planned but not yet implemented in the backend. Please check back once the module has been fully provisioned.");
  },
};

export const updateTaskStatus = {
  name: 'updateTaskStatus',
  description: 'Move a task through its lifecycle: TODO → IN_PROGRESS → IN_REVIEW → DONE.',
  requiredPermissions: ['project.update'],
  inputSchema: z.object({
    taskId: z.string().describe('Task ID'),
    status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED']),
    comment:z.string().optional().describe('Status change comment'),
  }),
  async execute(args, ctx) {
    throw new Error("Action unavailable: The Project Management (M-09) module is currently planned but not yet implemented in the backend. Please check back once the module has been fully provisioned.");
  },
};

export const projectTools = [listMyProjects, getProjectStatus, createTask, updateTaskStatus];
export default projectTools;
