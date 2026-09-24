import { zodToJsonSchema } from 'zod-to-json-schema';
import logger from '#ai/platform/logger.js';

/**
 * ToolManager — Auto-registration, RBAC filtering, Zod validation, and execution hub.
 *
 * Tool Definition Contract:
 *   {
 *     name: string               Unique tool identifier (camelCase)
 *     description: string        Clear description for the LLM
 *     requiredPermissions: []    Permission strings from PERMISSIONS constants
 *     inputSchema: ZodObject     Zod schema for argument validation
 *     execute: async fn          Tool implementation — calls ToolExecutor
 *   }
 *
 * Execution flow:
 *   1. LLM calls tool by name with args
 *   2. ToolManager.execute() validates args via Zod
 *   3. Checks RBAC against user's permissions array (from JWT claims)
 *   4. Calls tool.execute(args, userContext)
 *   5. Returns result to Orchestrator for LLM injection
 */
class ToolManager {
  constructor() {
    this._tools = new Map();
  }

  /**
   * Register a single tool definition.
   * Validates that all required fields are present.
   *
   * @param {object} tool  Tool definition object
   */
  register(tool) {
    if (!tool?.name || typeof tool.name !== 'string') {
      throw new Error(`[ToolManager] Tool must have a string 'name' property`);
    }
    if (!tool?.description || typeof tool.description !== 'string') {
      throw new Error(`[ToolManager] Tool '${tool.name}' must have a string 'description'`);
    }
    if (!Array.isArray(tool?.requiredPermissions)) {
      throw new Error(`[ToolManager] Tool '${tool.name}' must have a 'requiredPermissions' array`);
    }
    if (!tool?.inputSchema || typeof tool.inputSchema.safeParse !== 'function') {
      throw new Error(`[ToolManager] Tool '${tool.name}' must have a Zod 'inputSchema'`);
    }
    if (typeof tool?.execute !== 'function') {
      throw new Error(`[ToolManager] Tool '${tool.name}' must have an 'execute' function`);
    }

    this._tools.set(tool.name, tool);
    logger.debug({ toolName: tool.name, permissions: tool.requiredPermissions }, '[ToolManager] Tool registered');
  }

  /**
   * Register an array of tools.
   * @param {Array<object>} tools
   */
  registerMany(tools) {
    for (const tool of tools) {
      this.register(tool);
    }
    logger.info({ count: tools.length }, '[ToolManager] Batch tool registration complete');
  }

  /**
   * Returns tool definitions formatted for LLM consumption.
   * Only tools the user is PERMITTED to call are included.
   * Converts Zod schemas to JSON Schema via zod-to-json-schema.
   *
   * @param {Set<string>|string[]} userPermissions  User's effective permission set
   * @returns {Array<{ name, description, parameters }>}
   */
  getToolDefinitionsForLLM(userPermissions) {
    const permSet = userPermissions instanceof Set
      ? userPermissions
      : new Set(userPermissions);

    const isWildcard = permSet.has('*');
    const definitions = [];

    for (const tool of this._tools.values()) {
      const hasPermission = isWildcard ||
        tool.requiredPermissions.every(p => permSet.has(p));

      if (hasPermission) {
        definitions.push({
          name: tool.name,
          description: tool.description,
          parameters: zodToJsonSchema(tool.inputSchema, { target: 'openApi3' }),
        });
      }
    }

    return definitions;
  }

  /**
   * Execute a tool by name with LLM-provided arguments.
   *
   * @param {string} toolName
   * @param {object} rawArgs     Arguments as provided by the LLM
   * @param {object} userContext { userId, organizationId, sessionId, jwt, permissions, correlationId }
   * @returns {Promise<object>}  Tool result to inject back into LLM messages
   */
  async execute(toolName, rawArgs, userContext) {
    const tool = this._tools.get(toolName);
    if (!tool) {
      const error = `Unknown tool: '${toolName}'. Available tools: [${[...this._tools.keys()].join(', ')}]`;
      logger.warn({ toolName }, '[ToolManager] Unknown tool requested by LLM');
      return { success: false, error };
    }

    // 1. Zod schema validation
    const parseResult = tool.inputSchema.safeParse(rawArgs);
    if (!parseResult.success) {
      const details = parseResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
      logger.warn({ toolName, rawArgs, details }, '[ToolManager] Tool argument validation failed');
      return { success: false, error: `Invalid arguments: ${details}` };
    }

    // 2. RBAC enforcement — double-check permissions before execution
    const permSet = userContext.permissions instanceof Set
      ? userContext.permissions
      : new Set(userContext.permissions || []);

    const isWildcard = permSet.has('*');
    const hasPermission = isWildcard ||
      tool.requiredPermissions.every(p => permSet.has(p));

    if (!hasPermission) {
      const missing = tool.requiredPermissions.filter(p => !permSet.has(p));
      logger.warn({ toolName, userId: userContext.userId, missing }, '[ToolManager] RBAC denied tool execution');
      return {
        success: false,
        error: `Permission denied: You need [${missing.join(', ')}] to execute this action.`,
      };
    }

    // 3. Execute the tool
    const startTime = Date.now();
    try {
      logger.info({ toolName, userId: userContext.userId, orgId: userContext.organizationId },
        '[ToolManager] Executing tool');

      const result = await tool.execute(parseResult.data, userContext);
      const executionTimeMs = Date.now() - startTime;

      logger.info({ toolName, executionTimeMs, success: true }, '[ToolManager] Tool execution succeeded');
      return { success: true, data: result, executionTimeMs };
    } catch (error) {
      const executionTimeMs = Date.now() - startTime;
      logger.error({ err: error, toolName, executionTimeMs }, '[ToolManager] Tool execution error');
      return {
        success: false,
        error: `Tool execution failed: ${error.message}`,
        executionTimeMs,
      };
    }
  }

  /**
   * Returns all registered tool names — used by MCP endpoint.
   */
  getRegisteredToolNames() {
    return [...this._tools.keys()];
  }

  /**
   * Returns full tool definition by name — used by MCP endpoint.
   */
  getTool(name) {
    return this._tools.get(name) || null;
  }

  get toolCount() {
    return this._tools.size;
  }
}

export default new ToolManager();
