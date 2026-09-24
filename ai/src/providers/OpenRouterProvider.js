import { BaseProvider } from '#ai/providers/BaseProvider.js';
import env from '#ai/config/env.js';
import logger from '#ai/platform/logger.js';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

/**
 * OpenRouterProvider — Universal fallback provider via OpenRouter.ai.
 *
 * Default model: anthropic/claude-3.5-sonnet (highest quality)
 * Alternative models configurable via AI_OPENROUTER_MODEL env var.
 *
 * Used as:
 *   - Tier-3 fallback when both Gemini and Groq are unavailable
 *   - Access to specialized models (Claude 3.5 Sonnet, Mistral, etc.)
 *
 * OpenRouter uses the OpenAI-compatible streaming API (text/event-stream).
 * Native fetch is used — no SDK dependency needed.
 */
export class OpenRouterProvider extends BaseProvider {
  constructor() {
    super();
    this._model = env.AI_OPENROUTER_MODEL;
    this._apiKey = env.OPENROUTER_API_KEY;
    this._headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this._apiKey}`,
      'HTTP-Referer': 'https://nexusops.ai',
      'X-Title': 'NexusOps AI Co-Pilot',
    };
  }

  get name() { return 'OpenRouterProvider'; }

  get supportedFeatures() {
    return { streaming: true, toolCalling: true, embeddings: false };
  }

  _convertMessages(messages) {
    return messages.map(m => {
      if (m.role === 'tool') {
        return { role: 'tool', tool_call_id: m.toolCallId || `call_${Date.now()}`, content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) };
      }
      if (m.role === 'assistant' && m.toolCall) {
        return {
          role: 'assistant',
          tool_calls: [{
            id: m.toolCallId || `call_${Date.now()}`,
            type: 'function',
            function: { name: m.toolCall.name, arguments: JSON.stringify(m.toolCall.arguments) },
          }],
        };
      }
      return { role: m.role, content: m.content || '' };
    });
  }

  _convertTools(tools) {
    return tools.map(t => ({
      type: 'function',
      function: { name: t.name, description: t.description, parameters: t.parameters },
    }));
  }

  /**
   * Streaming chat via native fetch with SSE parsing.
   */
  async *chat(messages, tools = [], options = {}) {
    const { maxTokens = 4096, temperature = 0.7, topP = 0.95 } = options;

    const body = {
      model: this._model,
      messages: this._convertMessages(messages),
      max_tokens: maxTokens,
      temperature,
      top_p: topP,
      stream: true,
    };

    if (tools.length > 0) {
      body.tools = this._convertTools(tools);
      body.tool_choice = 'auto';
    }

    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: this._headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`[OpenRouterProvider] API error ${response.status}: ${errorText}`);
    }

    let fullText = '';
    let pendingToolCall = null;
    let inputTokens = 0;
    let outputTokens = 0;

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const dataStr = line.slice(6).trim();
          if (dataStr === '[DONE]') {
            yield { type: 'done', content: fullText, provider: this.name, model: this._model, usage: { inputTokens, outputTokens, costUsd: this.estimateCost(inputTokens, outputTokens) } };
            return;
          }

          let chunk;
          try { chunk = JSON.parse(dataStr); } catch { continue; }

          const delta = chunk.choices?.[0]?.delta;
          if (!delta) continue;

          if (delta.content) {
            fullText += delta.content;
            yield { type: 'token', content: delta.content };
          }

          if (delta.tool_calls?.length > 0) {
            const tc = delta.tool_calls[0];
            if (tc.id || !pendingToolCall) {
              pendingToolCall = { id: tc.id || `call_${Date.now()}`, name: '', argumentsRaw: '' };
            }
            if (tc.function?.name) pendingToolCall.name += tc.function.name;
            if (tc.function?.arguments) pendingToolCall.argumentsRaw += tc.function.arguments;
          }

          if (chunk.choices?.[0]?.finish_reason === 'tool_calls' && pendingToolCall) {
            let parsedArgs = {};
            try { parsedArgs = JSON.parse(pendingToolCall.argumentsRaw); } catch { parsedArgs = {}; }
            yield {
              type: 'tool_call',
              toolCallId: pendingToolCall.id,
              toolCall: { name: pendingToolCall.name, arguments: parsedArgs },
            };
            pendingToolCall = null;
          }

          if (chunk.usage) {
            inputTokens = chunk.usage.prompt_tokens || 0;
            outputTokens = chunk.usage.completion_tokens || 0;
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    const costUsd = this.estimateCost(inputTokens, outputTokens);
    logger.debug({ provider: this.name, inputTokens, outputTokens, costUsd }, 'Chat completed');
    yield { type: 'done', content: fullText, provider: this.name, model: this._model, usage: { inputTokens, outputTokens, costUsd } };
  }

  async generateEmbedding(_text) {
    throw new Error('[OpenRouterProvider] Embeddings not supported. Route to GeminiProvider.');
  }

  estimateCost(inputTokens, outputTokens) {
    return (inputTokens * env.OPENROUTER_INPUT_COST_PER_1M + outputTokens * env.OPENROUTER_OUTPUT_COST_PER_1M) / 1_000_000;
  }
}

export default OpenRouterProvider;
