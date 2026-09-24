import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { BaseProvider } from '#ai/providers/BaseProvider.js';
import env from '#ai/config/env.js';
import logger from '#ai/platform/logger.js';

/**
 * GeminiProvider — Google Gemini 1.5 Pro adapter.
 *
 * Primary provider for:
 *   - Multi-turn tool calling (complex agentic tasks)
 *   - RAG-grounded synthesis (long context documents)
 *   - Embedding generation via text-embedding-004
 *
 * Streaming is implemented via the Gemini generateContentStream API.
 * Tool calling uses Gemini's native `functionDeclarations` format.
 */
export class GeminiProvider extends BaseProvider {
  constructor() {
    super();
    this._client = new GoogleGenerativeAI(env.GEMINI_API_KEY);
    this._modelName = env.AI_GEMINI_MODEL;
    this._embeddingModel = 'text-embedding-004';
    this._safetySettings = [
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT,        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,       threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    ];
  }

  get name() { return 'GeminiProvider'; }

  get supportedFeatures() {
    return { streaming: true, toolCalling: true, embeddings: true };
  }

  /**
   * Converts OpenAI-style messages array → Gemini's history + systemInstruction format.
   */
  _convertMessages(messages) {
    const systemMessages = messages.filter(m => m.role === 'system');
    const conversationMessages = messages.filter(m => m.role !== 'system');

    const systemInstruction = systemMessages.map(m => m.content).join('\n\n');

    const history = conversationMessages.map(m => {
      if (m.role === 'tool') {
        return {
          role: 'user',
          parts: [{ functionResponse: { name: m.toolName, response: { content: m.content } } }],
        };
      }
      if (m.role === 'assistant' && m.toolCall) {
        return {
          role: 'model',
          parts: [{ functionCall: { name: m.toolCall.name, args: m.toolCall.arguments } }],
        };
      }
      return {
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content || '' }],
      };
    });

    // Ensure history starts with a regular user message (role: 'user' and contains a text part)
    // Gemini strictly requires the first message in startChat history to be a user message with text.
    while (history.length > 0) {
      const first = history[0];
      const hasText = first.parts?.some(p => p.hasOwnProperty('text'));
      if (first.role === 'user' && hasText) {
        break;
      }
      history.shift();
    }

    return { systemInstruction, history };
  }

  /**
   * Converts JSON Schema tool definitions → Gemini functionDeclarations format.
   */
  _convertTools(tools) {
    if (!tools?.length) return [];
    return [{
      functionDeclarations: tools.map(t => ({
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      })),
    }];
  }

  /**
   * Streaming chat with function calling support.
   * Yields tokens, tool_call requests, and a final done event with usage.
   */
  async *chat(messages, tools = [], options = {}) {
    const { maxTokens = 4096, temperature = 0.7, topP = 0.95 } = options;
    const { systemInstruction, history } = this._convertMessages(messages);

    const model = this._client.getGenerativeModel({
      model: this._modelName,
      systemInstruction: systemInstruction || undefined,
      safetySettings: this._safetySettings,
      generationConfig: { maxOutputTokens: maxTokens, temperature, topP },
      tools: this._convertTools(tools),
    });

    // Remove last user message from history to use as the new prompt
    const lastUserMsg = history.pop();
    const chat = model.startChat({ history });

    const lastContent = lastUserMsg?.parts[0]?.text || '';
    const result = await chat.sendMessageStream(lastContent);

    let fullText = '';
    let inputTokens = 0;
    let outputTokens = 0;

    for await (const chunk of result.stream) {
      const candidate = chunk.candidates?.[0];
      if (!candidate) continue;

      // Handle function call
      const functionCall = candidate.content?.parts?.find(p => p.functionCall);
      if (functionCall) {
        yield {
          type: 'tool_call',
          toolCall: {
            name: functionCall.functionCall.name,
            arguments: functionCall.functionCall.args,
          },
        };
        continue;
      }

      // Handle streaming text token
      const token = candidate.content?.parts?.map(p => p.text || '').join('');
      if (token) {
        fullText += token;
        yield { type: 'token', content: token };
      }

      // Capture usage metadata from the last chunk
      if (chunk.usageMetadata) {
        inputTokens = chunk.usageMetadata.promptTokenCount || 0;
        outputTokens = chunk.usageMetadata.candidatesTokenCount || 0;
      }
    }

    const costUsd = this.estimateCost(inputTokens, outputTokens);
    logger.debug({ provider: this.name, inputTokens, outputTokens, costUsd }, 'Chat completed');

    yield { type: 'done', content: fullText, provider: this.name, model: this._modelName, usage: { inputTokens, outputTokens, costUsd } };
  }

  /**
   * Generate a 1536-dim embedding using text-embedding-004.
   */
  async generateEmbedding(text) {
    const embeddingModel = this._client.getGenerativeModel({ model: this._embeddingModel });
    const result = await embeddingModel.embedContent(text);
    return result.embedding.values;
  }

  estimateCost(inputTokens, outputTokens) {
    return (inputTokens * env.GEMINI_INPUT_COST_PER_1M + outputTokens * env.GEMINI_OUTPUT_COST_PER_1M) / 1_000_000;
  }
}

export default GeminiProvider;
