import EventBus from '#ai/events/EventBus.js';
import ContextSummarizer from '#ai/memory/ContextSummarizer.js';
import logger from '#ai/platform/logger.js';

/**
 * contextListener — Handles ai.context.overflow events.
 * Triggers async background summarization when conversation window overflows.
 */
EventBus.on('ai.context.overflow', async ({ orgId, userId, sessionId, turnsToSummarize }) => {
  logger.info({ orgId, userId, sessionId }, '[contextListener] Context overflow — starting summarization');
  await ContextSummarizer.summarize(orgId, userId, sessionId, turnsToSummarize);
});

export default {};
