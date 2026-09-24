import ProviderRouter from '#ai/providers/ProviderRouter.js';
import ConversationManager from '#ai/memory/ConversationManager.js';
import logger from '#ai/platform/logger.js';

/**
 * ContextSummarizer — Async background context compression.
 *
 * Fired by EventBus when a conversation window overflows MAX_TURNS.
 * Condenses the oldest CONTEXT_SUMMARY_TURNS turns into a compact paragraph
 * which is stored in Redis and later injected by PromptBuilder into the system prompt.
 *
 * This keeps prompt length bounded at a fixed token budget while preserving
 * long-term conversation continuity across sessions.
 *
 * Flow:
 *   EventBus.emit('ai.context.overflow', { orgId, userId, sessionId })
 *   → ContextSummarizer.summarize(orgId, userId, sessionId)
 *   → LLM condenses old turns into 150-word paragraph
 *   → ConversationManager.injectSummary(orgId, userId, sessionId, text)
 */
class ContextSummarizer {
  /**
   * Summarizes the oldest N turns of a conversation into a compressed paragraph.
   * Uses a cheap, fast provider (Groq) for this background task to save costs.
   *
   * @param {string} orgId
   * @param {string} userId
   * @param {string} sessionId
   */
  async summarize(orgId, userId, sessionId, turnsToSummarize = null) {
    try {
      const activeTurns = turnsToSummarize || await ConversationManager.getHistory(orgId, userId, sessionId);
      if (!activeTurns || activeTurns.length === 0) return;

      // Take the oldest turns for summarization (not the most recent active context)
      const targetTurns = turnsToSummarize ? activeTurns : activeTurns.slice(0, 6);
      const conversationText = targetTurns
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content || '[tool call]'}`)
        .join('\n');

      if (!conversationText.trim()) return;

      const messages = [
        {
          role: 'system',
          content: `You are a conversation summarizer. Condense the following conversation exchange into a single clear paragraph of at most 150 words. 
Focus on: key decisions made, actions taken, context established, and any important data points mentioned.
Do not include greetings or pleasantries. Output ONLY the summary paragraph, nothing else.`,
        },
        {
          role: 'user',
          content: `Summarize this conversation exchange:\n\n${conversationText}`,
        },
      ];

      // Collect the full summary from the generator
      let summaryText = '';
      for await (const event of ProviderRouter.chat(messages, [], { maxTokens: 256, temperature: 0.3 })) {
        if (event.type === 'token') summaryText += event.content;
        if (event.type === 'done') break;
      }

      if (summaryText.trim()) {
        await ConversationManager.injectSummary(orgId, userId, sessionId, summaryText.trim());
        logger.info({ orgId, userId, sessionId, summaryLength: summaryText.length },
          '[ContextSummarizer] Context compressed and stored');
      }
    } catch (error) {
      // Summarization failure is non-fatal — conversation continues without summary
      logger.error({ err: error, orgId, userId, sessionId },
        '[ContextSummarizer] Failed to summarize context — continuing without compression');
    }
  }
}

export default new ContextSummarizer();
