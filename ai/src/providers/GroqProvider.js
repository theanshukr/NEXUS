import Groq from 'groq-sdk';
import { BaseProvider } from '#ai/providers/BaseProvider.js';
import env from '#ai/config/env.js';
import logger from '#ai/platform/logger.js';

/**
 * GroqProvider — Groq Llama-3.3-70B adapter.
 *
 * Used for:
 *   - Fast Q&A and intent classification (<300ms target)
 *   - Simple tool calls that don't require deep reasoning
 *   - High-throughput conversational tasks
 *
 * Groq uses the OpenAI-compatible API format, making message conversion minimal.
 * Tool calling follows the OpenAI `tools` + `tool_calls` convention.
 */
export class GroqProvider extends BaseProvider {
  constructor() {
    super();
    this._client = new Groq({ apiKey: env.GROQ_API_KEY });
    this._modelName = env.AI_GROQ_MODEL;
  }

  get name() { return 'GroqProvider'; }

  get supportedFeatures() {
    return { streaming: true, toolCalling: true, embeddings: false };
  }

  /**
   * Converts our internal messages to Groq/OpenAI format.
   * Tool result messages use role: 'tool' with tool_call_id.
   */
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

  /**
   * Converts our JSON Schema tools to OpenAI tool format.
   */
  _convertTools(tools) {
    return tools.map(t => ({
      type: 'function',
      function: { name: t.name, description: t.description, parameters: t.parameters },
    }));
  }

  /**
   * Streaming chat with parallel tool call support.
   */
  async *chat(messages, tools = [], options = {}) {
    const { maxTokens = 4096, temperature = 0.7, topP = 0.95 } = options;

    const request = {
      model: this._modelName,
      messages: this._convertMessages(messages),
      max_tokens: maxTokens,
      temperature,
      top_p: topP,
      stream: true,
    };

    if (tools.length > 0) {
      request.tools = this._convertTools(tools);
      request.tool_choice = 'auto';
    }

    const stream = await this._client.chat.completions.create(request);

    let fullText = '';
    let pendingToolCall = null;
    let inputTokens = 0;
    let outputTokens = 0;

    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta;
      if (!delta) continue;

      // Streaming token
      if (delta.content) {
        fullText += delta.content;
        yield { type: 'token', content: delta.content };
      }

      // Tool call detection (Groq streams tool_calls delta)
      if (delta.tool_calls?.length > 0) {
        const tc = delta.tool_calls[0];
        if (!pendingToolCall) {
          pendingToolCall = { id: tc.id || `call_${Date.now()}`, name: '', argumentsRaw: '' };
        }
        if (tc.function?.name) pendingToolCall.name += tc.function.name;
        if (tc.function?.arguments) pendingToolCall.argumentsRaw += tc.function.arguments;
      }

      // Finish reason
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

      // Usage (in the final chunk with x_groq extension)
      if (chunk.x_groq?.usage) {
        inputTokens = chunk.x_groq.usage.prompt_tokens || 0;
        outputTokens = chunk.x_groq.usage.completion_tokens || 0;
      }
    }

    const costUsd = this.estimateCost(inputTokens, outputTokens);
    logger.debug({ provider: this.name, inputTokens, outputTokens, costUsd }, 'Chat completed');

    yield { type: 'done', content: fullText, provider: this.name, model: this._modelName, usage: { inputTokens, outputTokens, costUsd } };
  }

  /**
   * Groq does not provide embeddings. Throws to signal fallback to Gemini.
   */
  async generateEmbedding(_text) {
    throw new Error('[GroqProvider] Embeddings not supported. Route to GeminiProvider.');
  }

  estimateCost(inputTokens, outputTokens) {
    return (inputTokens * env.GROQ_INPUT_COST_PER_1M + outputTokens * env.GROQ_OUTPUT_COST_PER_1M) / 1_000_000;
  }
}

export default GroqProvider;
