import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';
import AIOrchestrator from '#ai/orchestrator/AIOrchestrator.js';
import SafetyGuard from '#ai/safety/SafetyGuard.js';
import ConversationManager from '#ai/memory/ConversationManager.js';
import executor from '#ai/tools/ToolExecutor.js';
import env from '#ai/config/env.js';
import logger from '#ai/platform/logger.js';

/**
 * AIGateway — Entry point for all AI chat requests.
 *
 * Responsibilities:
 *   - JWT validation and user context extraction
 *   - Rate limiting (20 requests / 15 minutes per user)
 *   - SSE stream initialization and lifecycle management
 *   - Safety guard check before Orchestrator dispatch
 *   - Conversation session management
 *
 * SSE Event stream format:
 *   event: token\ndata: {"content": "Hello"}\n\n
 *   event: tool_start\ndata: {"name": "getMyLeaveBalances", "args": {}}\n\n
 *   event: tool_result\ndata: {"name": "...", "result": {...}}\n\n
 *   event: done\ndata: {"usage": {...}, "toolsInvoked": [...]}\n\n
 *   event: error\ndata: {"message": "..."}\n\n
 */
class AIGateway {
  /**
   * Rate limiter middleware — 20 requests per 15 minutes per userId.
   * Keyed by the authenticated userId from the JWT, not by IP.
   */
  get rateLimiter() {
    return rateLimit({
      windowMs: env.AI_RATE_LIMIT_WINDOW_MS,
      max: env.AI_RATE_LIMIT_REQUESTS,
      keyGenerator: (req) => req.user?.userId || req.ip,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        success: false,
        error: 'ERR_AI_RATE_LIMITED',
        message: 'Too many AI requests. Please wait before sending another message.',
      },
    });
  }

  /**
   * JWT authentication middleware — validates the user's access token.
   * Extracts userId, organizationId, email, and sessionId into req.user.
   */
  authenticate(req, res, next) {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, error: 'Missing Authorization Bearer token' });
      }

      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);

      req.user = {
        userId:         decoded.userId,
        organizationId: decoded.organizationId,
        email:          decoded.email,
        sessionId:      decoded.sessionId,
        jwt:            token, // Forward to ToolExecutor for backend API calls
      };

      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ success: false, error: 'Access token expired' });
      }
      return res.status(401).json({ success: false, error: 'Invalid access token' });
    }
  }

  /**
   * Feature flag middleware — blocks requests when AI_ENABLED=false.
   */
  featureFlag(req, res, next) {
    if (!env.AI_ENABLED) {
      return res.status(503).json({ success: false, error: 'AI Co-Pilot is currently disabled' });
    }
    next();
  }

  /**
   * POST /api/v1/ai/chat — Main streaming chat endpoint.
   *
   * Request body:
   *   { userPrompt: string, sessionId?: string, clientContext?: { currentModule, currentPageUrl, selectedRecordIds } }
   *
   * Response: text/event-stream (SSE)
   */
  async handleChat(req, res) {
    const { userPrompt, sessionId: requestedSession, clientContext = {} } = req.body;

    if (!userPrompt || typeof userPrompt !== 'string' || !userPrompt.trim()) {
      return res.status(400).json({ success: false, error: 'userPrompt is required and must be a non-empty string' });
    }

    const { user } = req;
    const sessionId = requestedSession || uuidv4(); // Generate new session if not provided

    // ── Safety check ──────────────────────────────────────────────────────────
    const safety = SafetyGuard.validate(userPrompt.trim(), user);
    if (safety.blocked) {
      return res.status(400).json({
        success: false,
        error: 'ERR_SAFETY_BLOCKED',
        message: safety.reason,
      });
    }

    const correlationId = uuidv4();

    // ── Fetch user permissions from backend /api/v1/auth/me ──────────────
    let permissions = [];
    let roles = [];
    try {
      const profileRes = await executor.get('/api/v1/auth/me', {}, user.jwt, correlationId);
      if (profileRes.success && profileRes.data?.data) {
        permissions = profileRes.data.data.permissions || [];
        roles = profileRes.data.data.user?.roles || [];
      } else {
        logger.warn({ userId: user.userId, error: profileRes.error || 'Empty payload' }, '[AIGateway] Failed to fetch permissions from backend');
      }
    } catch (err) {
      logger.error({ err, userId: user.userId }, '[AIGateway] Error calling backend /api/v1/auth/me');
    }

    const userContext = {
      ...user,
      name:        req.headers['x-user-name'] || user.email,
      roles,
      permissions,
    };

    // ── Initialize SSE stream ─────────────────────────────────────────────────
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Session-ID', sessionId);
    res.setHeader('X-Correlation-ID', correlationId);
    res.flushHeaders();

    const sendEvent = (event, data) => {
      if (!res.writableEnded) {
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      }
    };

    // Send session start event
    sendEvent('session', { sessionId, timestamp: Date.now() });

    // ── Handle client disconnect ───────────────────────────────────────────────
    req.on('close', () => {
      logger.info({ userId: user.userId, sessionId }, '[AIGateway] Client disconnected — stream closed');
    });

    try {
      // ── Stream from Orchestrator ─────────────────────────────────────────────
      for await (const sseEvent of AIOrchestrator.execute({
        userPrompt: safety.sanitizedPrompt,
        sessionId,
        userContext,
        orgContext:    {},   // TODO: Fetch org context from backend
        clientContext,
      })) {
        sendEvent(sseEvent.event, sseEvent.data);
      }
    } catch (error) {
      logger.error({ err: error, userId: user.userId, sessionId }, '[AIGateway] Unhandled error in chat stream');
      sendEvent('error', { message: 'An unexpected error occurred. Please try again.' });
    } finally {
      if (!res.writableEnded) {
        res.end();
      }
    }
  }

  /**
   * GET /api/v1/ai/conversations/:sessionId — Retrieve conversation history.
   */
  async getConversationHistory(req, res) {
    const { sessionId } = req.params;
    const { user } = req;

    try {
      const history = await ConversationManager.getHistory(
        user.organizationId, user.userId, sessionId
      );
      return res.json({ success: true, sessionId, messages: history, count: history.length });
    } catch (error) {
      logger.error({ err: error }, '[AIGateway] Failed to retrieve conversation history');
      return res.status(500).json({ success: false, error: 'Failed to retrieve conversation history' });
    }
  }

  /**
   * DELETE /api/v1/ai/conversations/:sessionId — Clear conversation context.
   */
  async clearConversation(req, res) {
    const { sessionId } = req.params;
    const { user } = req;

    try {
      await ConversationManager.clearSession(user.organizationId, user.userId, sessionId);
      return res.json({ success: true, message: 'Conversation cleared successfully', sessionId });
    } catch (error) {
      logger.error({ err: error }, '[AIGateway] Failed to clear conversation');
      return res.status(500).json({ success: false, error: 'Failed to clear conversation' });
    }
  }
}

export default new AIGateway();
