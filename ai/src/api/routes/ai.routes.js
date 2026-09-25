import { Router } from 'express';
import AIGateway from '#ai/gateway/AIGateway.js';
import CompletionController from '#ai/api/controllers/CompletionController.js';

const router = Router();

// ── Auth middleware applied to all AI routes ───────────────────────────────
router.use(AIGateway.featureFlag.bind(AIGateway));
router.use(AIGateway.authenticate.bind(AIGateway));

// ── Chat routes ────────────────────────────────────────────────────────────

/**
 * POST /api/v1/ai/chat
 * Main streaming chat endpoint — returns SSE text/event-stream
 */
router.post(
  '/chat',
  AIGateway.rateLimiter,
  AIGateway.handleChat.bind(AIGateway)
);

/**
 * POST /api/v1/ai/complete
 * Non-streaming JSON completion — used by backend services.
 * Requires valid auth token; no SSE.
 */
router.post('/complete', CompletionController.complete.bind(CompletionController));

/**
 * GET /api/v1/ai/conversations/:sessionId
 * Retrieve conversation history for a session
 */
router.get(
  '/conversations/:sessionId',
  AIGateway.getConversationHistory.bind(AIGateway)
);

/**
 * DELETE /api/v1/ai/conversations/:sessionId
 * Clear a conversation context
 */
router.delete(
  '/conversations/:sessionId',
  AIGateway.clearConversation.bind(AIGateway)
);

export default router;
