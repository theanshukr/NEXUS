import cache from '#ai/platform/cache.js';
import env from '#ai/config/env.js';
import logger from '#ai/platform/logger.js';

/**
 * ConversationManager — Tier-1 short-term session memory backed by Upstash Redis.
 *
 * Key design:
 *   - Each conversation is a Redis list keyed by orgId:userId:sessionId
 *   - Sliding window of MAX_TURNS turns maintained in active memory
 *   - On overflow (>MAX_TURNS), fires EventBus event for async summarization
 *   - TTL resets on each message to keep active sessions alive
 *
 * Redis key: ai:conv:{orgId}:{userId}:{sessionId}
 * TTL: AI_CONVERSATION_TTL_HOURS (default 24h)
 *
 * Message format stored:
 *   { role: 'user'|'assistant'|'tool', content: string, toolName?: string,
 *     toolCallId?: string, toolCall?: object, timestamp: number }
 */
class ConversationManager {
  constructor() {
    this._ttlSeconds = env.AI_CONVERSATION_TTL_HOURS * 3600;
    this._maxTurns = env.AI_CONVERSATION_MAX_TURNS;
    this._summaryTurns = env.AI_CONTEXT_SUMMARY_TURNS;
  }

  /**
   * Builds the Redis key for a conversation.
   */
  _key(orgId, userId, sessionId) {
    return `ai:conv:${orgId}:${userId}:${sessionId}`;
  }

  /**
   * Retrieves the full conversation history for a session.
   * Returns ordered array from oldest to newest.
   *
   * @param {string} orgId
   * @param {string} userId
   * @param {string} sessionId
   * @returns {Promise<Array<object>>}
   */
  async getHistory(orgId, userId, sessionId) {
    const key = this._key(orgId, userId, sessionId);
    const messages = await cache.listGetAll(key);
    return messages;
  }

  /**
   * Appends a single message to the conversation history.
   * Enforces the sliding window by trimming old messages when MAX_TURNS is exceeded.
   * Returns a boolean indicating whether the context summarizer should be triggered.
   *
   * @param {string} orgId
   * @param {string} userId
   * @param {string} sessionId
   * @param {object} message  { role, content, ...optional }
   * @returns {Promise<{ shouldSummarize: boolean }>}
   */
  async appendMessage(orgId, userId, sessionId, message) {
    const key = this._key(orgId, userId, sessionId);

    const enrichedMessage = {
      ...message,
      timestamp: Date.now(),
    };

    await cache.listAppend(key, enrichedMessage, this._ttlSeconds);

    const currentLen = await cache.listLen(key);

    // When we exceed the window, trim and signal summarization
    if (currentLen > this._maxTurns) {
      const history = await this.getHistory(orgId, userId, sessionId);
      const turnsToSummarize = history.slice(0, 6); // Capture oldest 6 turns before we trim

      await cache.listTrim(key, this._maxTurns - this._summaryTurns);
      logger.debug({ orgId, userId, sessionId, currentLen }, '[ConversationManager] Context window trimmed');
      return { shouldSummarize: true, turnsToSummarize };
    }

    return { shouldSummarize: false };
  }

  /**
   * Appends both the user message and the assistant response in sequence.
   * Convenience wrapper used by the Orchestrator after each LLM turn.
   *
   * @param {string} orgId
   * @param {string} userId
   * @param {string} sessionId
   * @param {string} userContent
   * @param {string} assistantContent
   * @returns {Promise<{ shouldSummarize: boolean, turnsToSummarize: Array }>}
   */
  async appendTurn(orgId, userId, sessionId, userContent, assistantContent) {
    const userRes = await this.appendMessage(orgId, userId, sessionId, { role: 'user', content: userContent });
    const assistantRes = await this.appendMessage(orgId, userId, sessionId, { role: 'assistant', content: assistantContent });
    
    return {
      shouldSummarize: userRes.shouldSummarize || assistantRes.shouldSummarize,
      turnsToSummarize: userRes.turnsToSummarize || assistantRes.turnsToSummarize || null,
    };
  }

  /**
   * Appends a tool call and its result to the conversation.
   * Used during agentic loops when the LLM invokes a tool.
   *
   * @param {string} orgId
   * @param {string} userId
   * @param {string} sessionId
   * @param {object} toolCall  { name, arguments }
   * @param {string} toolCallId
   * @param {*} result  Tool execution result (will be JSON.stringify'd)
   */
  async appendToolExchange(orgId, userId, sessionId, toolCall, toolCallId, result) {
    // Record the assistant's decision to invoke the tool
    await this.appendMessage(orgId, userId, sessionId, {
      role: 'assistant',
      content: null,
      toolCall: { name: toolCall.name, arguments: toolCall.arguments },
      toolCallId,
    });

    // Record the tool's result
    await this.appendMessage(orgId, userId, sessionId, {
      role: 'tool',
      toolName: toolCall.name,
      toolCallId,
      content: typeof result === 'string' ? result : JSON.stringify(result),
    });
  }

  /**
   * Prepends a session summary as a system message at position 0 of the key.
   * Called by ContextSummarizer after it finishes compressing old turns.
   *
   * @param {string} orgId
   * @param {string} userId
   * @param {string} sessionId
   * @param {string} summaryText  150-word compressed summary
   */
  async injectSummary(orgId, userId, sessionId, summaryText) {
    const summaryKey = `ai:summary:${orgId}:${userId}`;
    await cache.set(summaryKey, summaryText, 7 * 24 * 3600); // 7 days
    logger.info({ orgId, userId, sessionId }, '[ConversationManager] Context summary injected');
  }

  /**
   * Retrieves any stored context summary for a user.
   * Injected into the system prompt by PromptBuilder.
   */
  async getSummary(orgId, userId) {
    return cache.get(`ai:summary:${orgId}:${userId}`);
  }

  /**
   * Clears all conversation history for a session.
   * Called via DELETE /api/v1/ai/conversations/:sessionId.
   */
  async clearSession(orgId, userId, sessionId) {
    const key = this._key(orgId, userId, sessionId);
    await cache.del(key);
    logger.info({ orgId, userId, sessionId }, '[ConversationManager] Session cleared');
  }

  /**
   * Returns a message count for a session without loading all messages.
   */
  async getSessionLength(orgId, userId, sessionId) {
    return cache.listLen(this._key(orgId, userId, sessionId));
  }
}

export default new ConversationManager();
