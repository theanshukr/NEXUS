import { Router } from 'express';
import AIGateway from '#ai/gateway/AIGateway.js';
import McpController from '#ai/api/controllers/McpController.js';

const router = Router();

// MCP routes require the same authentication
router.use(AIGateway.authenticate.bind(AIGateway));

/**
 * GET /api/v1/mcp/tools
 * Returns RBAC-filtered tool definitions for external MCP clients
 */
router.get('/tools', McpController.listTools.bind(McpController));

/**
 * POST /api/v1/mcp/execute
 * Direct tool execution for external MCP clients (Claude Desktop, Cursor, etc.)
 */
router.post('/execute', McpController.executeTool.bind(McpController));

export default router;
