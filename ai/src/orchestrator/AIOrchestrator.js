import { v4 as uuidv4 } from 'uuid';
import ProviderRouter from '#ai/providers/ProviderRouter.js';
import ToolManager from '#ai/tools/ToolManager.js';
import ConversationManager from '#ai/memory/ConversationManager.js';
import ContextSummarizer from '#ai/memory/ContextSummarizer.js';
import PromptBuilder from '#ai/prompts/PromptBuilder.js';
import EventBus from '#ai/events/EventBus.js';
import logger from '#ai/platform/logger.js';

const MAX_TOOL_ITERATIONS = 10; // Safety cap on agentic loops

/**
 * AIOrchestrator — The agentic execution loop manager.
 *
 * Orchestrates the full cycle of:
 *   1. Assembling the system prompt (PromptBuilder)
 *   2. Loading conversation history (ConversationManager)
 *   3. Getting permitted tool definitions (ToolManager)
 *   4. Calling the LLM (ProviderRouter)
 *   5. If tool_call → execute tool → inject result → repeat loop
 *   6. Streaming final text response to the SSE client
 *   7. Persisting the conversation turn
 *   8. Emitting audit and usage events
 *
 * The orchestrator yields SSE-compatible events that the Gateway streams
 * directly to the client's EventSource connection.
 *
 * @yields {object} SSE event objects:
 *   { event: 'token', data: { content: '...' } }
 *   { event: 'tool_start', data: { name: '...', args: {...} } }
 *   { event: 'tool_result', data: { name: '...', result: {...} } }
 *   { event: 'done', data: { usage: { inputTokens, outputTokens, costUsd }, toolsInvoked: [] } }
 *   { event: 'error', data: { message: '...' } }
 */
class AIOrchestrator {
  /**
   * Execute a full AI chat request.
   *
   * @param {object} params
   * @param {string} params.userPrompt       The user's message
   * @param {string} params.sessionId        Conversation session ID
   * @param {object} params.userContext      JWT-derived user context { userId, organizationId, email, name, roles, permissions, jwt }
   * @param {object} params.orgContext       Organization context { orgName, plan }
   * @param {object} params.clientContext    UI context { currentModule, currentPageUrl, selectedRecordIds }
   * @returns {AsyncGenerator<object>}       SSE event objects
   */
  async *execute({ userPrompt, sessionId, userContext, orgContext, clientContext }) {
    const correlationId = uuidv4();
    const startTime = Date.now();

    // Enrich userContext with correlationId for tool execution tracing
    const enrichedContext = { ...userContext, sessionId, correlationId };

    const toolsInvoked = [];
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalCostUsd = 0;
    let finalAssistantResponse = '';
    let finalProvider = 'UNKNOWN';
    let finalModel = 'UNKNOWN';

    try {
      // ── Step 1: Build system prompt ─────────────────────────────────────
      const systemPrompt = await PromptBuilder.buildSystemPrompt(userContext, orgContext, clientContext);

      // ── Step 2: Load conversation history ───────────────────────────────
      const history = await ConversationManager.getHistory(
        userContext.organizationId, userContext.userId, sessionId
      );

      // ── Step 3: Get permitted tool definitions ───────────────────────────
      const toolDefinitions = ToolManager.getToolDefinitionsForLLM(userContext.permissions);

      // ── Step 4: Build initial messages array ─────────────────────────────
      const messages = [
        { role: 'system', content: systemPrompt },
        ...history,
        { role: 'user', content: userPrompt },
      ];

      // ── Agentic execution loop ───────────────────────────────────────────
      let iteration = 0;
      let activeToolDefinitions = toolDefinitions;

      // If the provider fails with a token limit error, retry without tools
      // so basic conversational chat works even on free-tier providers.
      const attemptChat = async function* (self) {
        try {
          yield* ProviderRouter.chat(messages, activeToolDefinitions);
        } catch (firstError) {
          const msg = firstError.message?.toLowerCase() || '';
          const isTokenError = msg.includes('413') || msg.includes('too large') || msg.includes('rate_limit') || msg.includes('token');
          if (isTokenError && activeToolDefinitions.length > 0) {
            logger.warn('[Orchestrator] All providers failed with token limit — retrying without tools');
            activeToolDefinitions = []; // Strip tools to reduce token payload
            yield* ProviderRouter.chat(messages, []);
          } else {
            throw firstError;
          }
        }
      };

      while (iteration < MAX_TOOL_ITERATIONS) {
        iteration++;

        let pendingToolCall = null;
        let currentText = '';

        for await (const event of attemptChat(this)) {
          if (event.type === 'token') {
            currentText += event.content;
            finalAssistantResponse += event.content;
            yield { event: 'token', data: { content: event.content, correlationId } };
          }

          if (event.type === 'tool_call') {
            pendingToolCall = { toolCall: event.toolCall, toolCallId: event.toolCallId || `call_${Date.now()}` };
          }

          if (event.type === 'done') {
            totalInputTokens += event.usage?.inputTokens || 0;
            totalOutputTokens += event.usage?.outputTokens || 0;
            totalCostUsd += event.usage?.costUsd || 0;
            if (event.provider) finalProvider = event.provider;
            if (event.model) finalModel = event.model;
          }

          if (event.type === 'error') {
            throw new Error(event.error?.message || 'Provider error');
          }
        }

        // ── If no tool call was requested → final response ───────────────
        if (!pendingToolCall) {
          break; // Exit loop — final text response streamed
        }

        // ── Tool call was requested → execute it ─────────────────────────
        const { toolCall, toolCallId } = pendingToolCall;

        logger.info({ toolName: toolCall.name, correlationId, iteration }, '[Orchestrator] Tool call requested');
        yield { event: 'tool_start', data: { name: toolCall.name, args: toolCall.arguments, correlationId } };

        const toolStartTime = Date.now();
        const toolResult = await ToolManager.execute(toolCall.name, toolCall.arguments, enrichedContext);
        const toolExecutionTimeMs = Date.now() - toolStartTime;

        toolsInvoked.push({
          name: toolCall.name,
          args: toolCall.arguments,
          result: toolResult,
          executionTimeMs: toolExecutionTimeMs,
          status: toolResult.success ? 'SUCCESS' : 'ERROR',
        });

        yield { event: 'tool_result', data: { name: toolCall.name, result: toolResult, correlationId } };

        // Inject tool exchange into the messages for the next LLM call
        await ConversationManager.appendToolExchange(
          userContext.organizationId, userContext.userId, sessionId,
          toolCall, toolCallId, toolResult
        );

        // Update messages array with the tool exchange
        messages.push({ role: 'assistant', content: null, toolCall, toolCallId });
        messages.push({ role: 'tool', toolName: toolCall.name, toolCallId, content: JSON.stringify(toolResult) });
      }

      // ── Step 5: Persist the user + assistant turn ────────────────────────
      const { shouldSummarize, turnsToSummarize } = await ConversationManager.appendTurn(
        userContext.organizationId, userContext.userId, sessionId,
        userPrompt, finalAssistantResponse
      );

      // ── Step 6: Trigger async context summarization if needed ─────────────
      if (shouldSummarize) {
        EventBus.emit('ai.context.overflow', {
          orgId: userContext.organizationId,
          userId: userContext.userId,
          sessionId,
          turnsToSummarize,
        });
      }

      const totalLatencyMs = Date.now() - startTime;

      // ── Step 7: Emit audit event ───────────────────────────────────────────
      EventBus.emit('ai.audit', {
        organizationId: userContext.organizationId,
        userId:         userContext.userId,
        sessionId,
        correlationId,
        promptText:     userPrompt,
        responseText:   finalAssistantResponse,
        toolsInvoked,
        inputTokens:    totalInputTokens,
        outputTokens:   totalOutputTokens,
        totalCostUsd,
        totalLatencyMs,
        executionStatus: 'SUCCESS',
        provider:       finalProvider,
        model:          finalModel,
      });

      // ── Step 8: Final done event ───────────────────────────────────────────
      yield {
        event: 'done',
        data: {
          correlationId,
          usage: { inputTokens: totalInputTokens, outputTokens: totalOutputTokens, costUsd: totalCostUsd },
          toolsInvoked: toolsInvoked.map(t => ({ name: t.name, status: t.status, executionTimeMs: t.executionTimeMs })),
          totalLatencyMs,
        },
      };

    } catch (error) {
      const totalLatencyMs = Date.now() - startTime;
      logger.error({ err: error, correlationId, sessionId }, '[Orchestrator] Execution failed');

      EventBus.emit('ai.audit', {
        organizationId: userContext.organizationId,
        userId:         userContext.userId,
        sessionId,
        correlationId,
        promptText:     userPrompt,
        toolsInvoked,
        totalLatencyMs,
        executionStatus: 'FAILED',
        error: error.message,
      });

      yield { event: 'error', data: { message: error.message, correlationId } };
    }
  }
}

export default new AIOrchestrator();
