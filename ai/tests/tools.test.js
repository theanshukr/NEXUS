import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import ToolManager from '#ai/tools/ToolManager.js';

describe('ToolManager', () => {
  // Register a mock tool for testing
  const mockTool = {
    name: 'testCalculate',
    description: 'A test calculator tool',
    requiredPermissions: ['test.calc'],
    inputSchema: z.object({
      a: z.number().describe('First number'),
      b: z.number().describe('Second number'),
    }),
    execute: vi.fn(async (args) => {
      return { result: args.a + args.b };
    }),
  };

  ToolManager.register(mockTool);

  const mockUserCtx = {
    userId: 'user_123',
    organizationId: 'org_abc',
    permissions: ['test.calc'],
  };

  it('should return schema definitions for permitted users', () => {
    const definitions = ToolManager.getToolDefinitionsForLLM(['test.calc']);
    const testDef = definitions.find(d => d.name === 'testCalculate');
    
    expect(testDef).toBeDefined();
    expect(testDef.description).toBe(mockTool.description);
    expect(testDef.parameters).toBeDefined();
  });

  it('should exclude tools user lacks permissions for', () => {
    const definitions = ToolManager.getToolDefinitionsForLLM(['user.read_self']);
    const testDef = definitions.find(d => d.name === 'testCalculate');
    
    expect(testDef).toBeUndefined();
  });

  it('should execute tool successfully with valid args and permissions', async () => {
    const result = await ToolManager.execute('testCalculate', { a: 10, b: 20 }, mockUserCtx);
    
    expect(result.success).toBe(true);
    expect(result.data.result).toBe(30);
    expect(mockTool.execute).toHaveBeenCalledWith({ a: 10, b: 20 }, mockUserCtx);
  });

  it('should fail execution on invalid argument schema', async () => {
    const result = await ToolManager.execute('testCalculate', { a: 'ten', b: 20 }, mockUserCtx);
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid arguments');
  });

  it('should reject execution when lacking permissions', async () => {
    const result = await ToolManager.execute('testCalculate', { a: 10, b: 20 }, {
      ...mockUserCtx,
      permissions: ['user.read_self'], // missing test.calc
    });
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('Permission denied');
  });
});
