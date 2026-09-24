import EventBus from '#ai/events/EventBus.js';
import AiAuditLog from '#ai/models/AiAuditLog.js';
import AiUsage from '#ai/models/AiUsage.js';
import logger from '#ai/platform/logger.js';

/**
 * auditListener — Persists AI audit logs and usage ledger entries to MongoDB.
 * Subscribed to: 'ai.audit' events emitted by the Orchestrator after each turn.
 */
EventBus.on('ai.audit', async (payload) => {
  const {
    organizationId, userId, sessionId, correlationId,
    promptText, responseText, toolsInvoked,
    inputTokens, outputTokens, totalCostUsd, totalLatencyMs,
    executionStatus, error: errorMessage,
    provider = 'UNKNOWN', model = 'UNKNOWN',
  } = payload;

  try {
    // 1. Write immutable audit log
    await AiAuditLog.create({
      organizationId, userId, sessionId, correlationId,
      promptText,
      responseText: responseText || '',
      toolsInvoked: toolsInvoked || [],
      inputTokens:  inputTokens || 0,
      outputTokens: outputTokens || 0,
      totalCostUsd: totalCostUsd || 0,
      totalLatencyMs: totalLatencyMs || 0,
      executionStatus: executionStatus || 'SUCCESS',
      errorMessage: errorMessage || undefined,
      provider,
      model,
    });

    // 2. Upsert daily usage ledger
    if (inputTokens > 0 || outputTokens > 0) {
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0); // Normalize to UTC midnight for day-level grouping

      await AiUsage.findOneAndUpdate(
        { organizationId, userId, date: today, provider, model },
        {
          $inc: {
            promptTokens:     inputTokens || 0,
            completionTokens: outputTokens || 0,
            totalCostUsd:     totalCostUsd || 0,
            requestCount:     1,
          },
        },
        { upsert: true, returnDocument: 'after' }
      );
    }

    logger.debug({ correlationId, executionStatus }, '[auditListener] Audit log persisted');
  } catch (err) {
    // Audit failures are logged but never surfaced to the user
    logger.error({ err, correlationId }, '[auditListener] Failed to persist audit log');
  }
});

export default {};
