import { z } from 'zod';
import executor from '#ai/tools/ToolExecutor.js';

/** Asset Management Tools — M-10 */
export const listAvailableAssets = {
  name: 'listAvailableAssets',
  description: 'Lists all unallocated company assets available for assignment by category.',
  requiredPermissions: ['asset.read'],
  inputSchema: z.object({
    category: z.enum(['LAPTOP', 'PHONE', 'MONITOR', 'KEYBOARD', 'CHAIR', 'DESK', 'OTHER']).optional(),
    page: z.number().default(1), limit: z.number().default(20),
  }),
  async execute(args, ctx) {
    throw new Error("Action unavailable: The Asset Management (M-10) module is currently planned but not yet implemented in the backend. Please check back once the module has been fully provisioned.");
  },
};

export const allocateAsset = {
  name: 'allocateAsset',
  description: 'Assign a company asset to an employee and record the handover date.',
  requiredPermissions: ['asset.manage'],
  inputSchema: z.object({
    assetId:       z.string().describe('Asset ID to allocate'),
    employeeId:    z.string().describe('Employee to assign the asset to'),
    handoverDate:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('Handover date, defaults to today'),
    notes:         z.string().optional(),
  }),
  async execute(args, ctx) {
    throw new Error("Action unavailable: The Asset Management (M-10) module is currently planned but not yet implemented in the backend. Please check back once the module has been fully provisioned.");
  },
};

export const reclaimAsset = {
  name: 'reclaimAsset',
  description: 'Mark an asset as returned by an employee and update its condition record.',
  requiredPermissions: ['asset.manage'],
  inputSchema: z.object({
    assetId:   z.string(),
    condition: z.enum(['GOOD', 'DAMAGED', 'NEEDS_REPAIR', 'LOST']).describe('Return condition of the asset'),
    notes:     z.string().optional(),
  }),
  async execute(args, ctx) {
    throw new Error("Action unavailable: The Asset Management (M-10) module is currently planned but not yet implemented in the backend. Please check back once the module has been fully provisioned.");
  },
};

export const assetTools = [listAvailableAssets, allocateAsset, reclaimAsset];
export default assetTools;
