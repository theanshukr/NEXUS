import { z } from 'zod';
import executor from '#ai/tools/ToolExecutor.js';

/**
 * Department Management Tools — mcp_dept_*
 * Specified in docs/mcp/department-tools.md
 */

export const mcp_dept_list = {
  name: 'mcp_dept_list',
  description: 'Lists all departments in the organization with optional filtering by status or parent code.',
  requiredPermissions: ['department.read'],
  inputSchema: z.object({
    status:     z.string().optional().describe('Filter by status (e.g. ACTIVE, INACTIVE)'),
    parentCode: z.string().optional().describe('Filter by parent department code'),
  }),
  async execute(args, ctx) {
    const result = await executor.get('/api/v1/departments', args, ctx.jwt, ctx.correlationId);
    if (!result.success) throw new Error(result.error);
    return result.data;
  },
};

export const mcp_dept_get_tree = {
  name: 'mcp_dept_get_tree',
  description: 'Retrieves the full organizational department hierarchy structured as a nested tree.',
  requiredPermissions: ['department.read'],
  inputSchema: z.object({
    departmentId: z.string().optional().describe('Optional sub-department ID to slice the tree from'),
  }),
  async execute(args, ctx) {
    const result = await executor.get('/api/v1/departments/tree', {}, ctx.jwt, ctx.correlationId);
    if (!result.success) throw new Error(result.error);
    
    const tree = result.data;
    if (args.departmentId) {
      const findNode = (nodes, id) => {
        for (const node of nodes) {
          if (String(node._id) === String(id) || String(node.id) === String(id)) return node;
          if (node.children && node.children.length > 0) {
            const found = findNode(node.children, id);
            if (found) return found;
          }
        }
        return null;
      };
      
      // If tree is array
      const nodes = Array.isArray(tree) ? tree : [tree];
      const subtree = findNode(nodes, args.departmentId);
      if (!subtree) {
        throw new Error(`Department with ID ${args.departmentId} not found in the hierarchy.`);
      }
      return subtree;
    }
    return tree;
  },
};

export const mcp_dept_get_select_options = {
  name: 'mcp_dept_get_select_options',
  description: 'Retrieves a lightweight list of department codes and names formatted for dropdown selectors.',
  requiredPermissions: ['department.read'],
  inputSchema: z.object({}),
  async execute(_args, ctx) {
    const result = await executor.get('/api/v1/departments/select-options', {}, ctx.jwt, ctx.correlationId);
    if (!result.success) throw new Error(result.error);
    return result.data;
  },
};

export const mcp_dept_get_by_id = {
  name: 'mcp_dept_get_by_id',
  description: 'Retrieves detailed metadata and cost center info for a specific department.',
  requiredPermissions: ['department.read'],
  inputSchema: z.object({
    id: z.string().describe('The department ObjectId'),
  }),
  async execute(args, ctx) {
    const result = await executor.get(`/api/v1/departments/${args.id}`, {}, ctx.jwt, ctx.correlationId);
    if (!result.success) throw new Error(result.error);
    return result.data;
  },
};

export const mcp_dept_create = {
  name: 'mcp_dept_create',
  description: 'Creates a new organizational department or sub-department.',
  requiredPermissions: ['department.create'],
  inputSchema: z.object({
    name:       z.string().min(2).describe('Name of the new department (e.g. Engineering)'),
    code:       z.string().regex(/^[A-Z0-9_-]+$/).describe('Unique uppercase department code (e.g. ENG)'),
    parentCode: z.string().optional().describe('Parent department code'),
    costCenter: z.string().optional().describe('Cost center classification identifier'),
  }),
  async execute(args, ctx) {
    const result = await executor.post('/api/v1/departments', args, ctx.jwt, ctx.correlationId);
    if (!result.success) throw new Error(result.error);
    return result.data;
  },
};

export const mcp_dept_update = {
  name: 'mcp_dept_update',
  description: 'Updates department name, cost center, or operational metadata.',
  requiredPermissions: ['department.update'],
  inputSchema: z.object({
    id:         z.string().describe('The department ObjectId to update'),
    name:       z.string().optional().describe('New name of the department'),
    costCenter: z.string().optional().describe('New cost center classification'),
  }),
  async execute(args, ctx) {
    const { id, ...payload } = args;
    const result = await executor.put(`/api/v1/departments/${id}`, payload, ctx.jwt, ctx.correlationId);
    if (!result.success) throw new Error(result.error);
    return result.data;
  },
};

export const mcp_dept_move = {
  name: 'mcp_dept_move',
  description: 'Reorganizes the organizational hierarchy by relocating a department under a new parent code.',
  requiredPermissions: ['department.update'],
  inputSchema: z.object({
    id:            z.string().describe('The department ObjectId to relocate'),
    newParentCode: z.string().describe('The code of the new parent department'),
  }),
  async execute(args, ctx) {
    const { id, ...payload } = args;
    const result = await executor.post(`/api/v1/departments/${id}/move`, payload, ctx.jwt, ctx.correlationId);
    if (!result.success) throw new Error(result.error);
    return result.data;
  },
};

export const mcp_dept_archive = {
  name: 'mcp_dept_archive',
  description: 'Soft-deletes/archives a department if empty of active children or employees.',
  requiredPermissions: ['department.delete'],
  inputSchema: z.object({
    id: z.string().describe('The department ObjectId to archive'),
  }),
  async execute(args, ctx) {
    const result = await executor.delete(`/api/v1/departments/${args.id}`, {}, ctx.jwt, ctx.correlationId);
    if (!result.success) throw new Error(result.error);
    return result.data;
  },
};

export const departmentTools = [
  mcp_dept_list,
  mcp_dept_get_tree,
  mcp_dept_get_select_options,
  mcp_dept_get_by_id,
  mcp_dept_create,
  mcp_dept_update,
  mcp_dept_move,
  mcp_dept_archive,
];
export default departmentTools;
