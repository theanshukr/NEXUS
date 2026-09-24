import ToolManager from '#ai/tools/ToolManager.js';
import ToolExecutor from '#ai/tools/ToolExecutor.js';
import logger from '#ai/platform/logger.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * McpController — Model Context Protocol compatibility endpoints.
 *
 * Exposes AI tools for external MCP clients (Claude Desktop, Cursor, custom agents):
 *   GET  /api/v1/mcp/tools    → Returns RBAC-filtered tool registry as JSON Schema
 *   POST /api/v1/mcp/execute  → Direct tool execution bypassing the chat Orchestrator
 *
 * MCP clients must provide the same Bearer JWT as the regular API.
 * RBAC is always enforced — tool permissions are checked before execution.
 */
class McpController {
  /**
   * GET /api/v1/mcp/tools
   * Returns the filtered tool definitions the requesting user can access.
   */
  async listTools(req, res) {
    const { user } = req;
    let permissions = [];
    try {
      const profileRes = await ToolExecutor.get('/api/v1/auth/me', {}, user.jwt, uuidv4());
      if (profileRes.success && profileRes.data) {
        permissions = profileRes.data.permissions || [];
      }
    } catch (err) {
      logger.error({ err, userId: user.userId }, '[McpController] Error calling backend /api/v1/auth/me');
    }

    const definitions = ToolManager.getToolDefinitionsForLLM(permissions);

    return res.json({
      success: true,
      tools: definitions,
      count: definitions.length,
      userId: user.userId,
      organizationId: user.organizationId,
    });
  }

  /**
   * POST /api/v1/mcp/execute
   * Body: { toolName: string, arguments: object }
   *
   * Allows external MCP clients to directly invoke NexusOps tools.
   */
  async executeTool(req, res) {
    const { toolName, arguments: toolArgs = {} } = req.body;
    const { user } = req;
    const correlationId = uuidv4();

    if (!toolName || typeof toolName !== 'string') {
      return res.status(400).json({ success: false, error: 'toolName is required' });
    }

    logger.info({ toolName, userId: user.userId, correlationId }, '[McpController] Direct tool execution request');

    let permissions = [];
    let roles = [];
    try {
      const profileRes = await ToolExecutor.get('/api/v1/auth/me', {}, user.jwt, correlationId);
      if (profileRes.success && profileRes.data) {
        permissions = profileRes.data.permissions || [];
        roles = profileRes.data.user?.roles || [];
      }
    } catch (err) {
      logger.error({ err, userId: user.userId }, '[McpController] Error calling backend /api/v1/auth/me in executeTool');
    }

    const userContext = {
      ...user,
      roles,
      permissions,
      correlationId,
    };

    const result = await ToolManager.execute(toolName, toolArgs, userContext);

    return res.json({
      success: result.success,
      toolName,
      correlationId,
      result: result.data || null,
      error: result.error || null,
      executionTimeMs: result.executionTimeMs,
    });
  }
}

export default new McpController();
