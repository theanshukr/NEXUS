/**
 * BaseProvider — Abstract interface that all LLM provider adapters must implement.
 *
 * Every provider must implement:
 *   - chat(messages, tools, options) → AsyncGenerator<token>
 *   - generateEmbedding(text)        → Promise<number[]>
 *   - get name()                     → string
 *   - get supportedFeatures()        → { streaming, toolCalling, embeddings }
 */
export class BaseProvider {
  constructor(config = {}) {
    if (new.target === BaseProvider) {
      throw new Error('BaseProvider is abstract and cannot be instantiated directly.');
    }
    this.config = config;
  }

  /**
   * Send a chat completion request.
   * Must return an async generator that yields { type, content/toolCall, usage } objects.
   *
   * Yield types:
   *   { type: 'token', content: 'Hello' }                  → streaming token
   *   { type: 'tool_call', toolCall: { name, arguments } } → tool invocation request
   *   { type: 'done', usage: { inputTokens, outputTokens, costUsd } } → final event
   *   { type: 'error', error: Error }                       → provider error
   *
   * @param {Array<{role: string, content: string}>} messages
   * @param {Array<object>} tools  JSON Schema tool definitions
   * @param {object} options  { maxTokens, temperature, topP }
   * @returns {AsyncGenerator}
   */
  // eslint-disable-next-line no-unused-vars
  async *chat(messages, tools = [], options = {}) {
    throw new Error(`[${this.name}] chat() must be implemented by provider subclass.`);
  }

  /**
   * Generate a fixed-dimension embedding vector for a text input.
   * Used by the RAG pipeline for document chunking and query retrieval.
   *
   * @param {string} text
   * @returns {Promise<number[]>}
   */
  // eslint-disable-next-line no-unused-vars
  async generateEmbedding(text) {
    throw new Error(`[${this.name}] generateEmbedding() must be implemented by provider subclass.`);
  }

  /**
   * Provider display name — used in logs, audit records, and usage analytics.
   * @returns {string}
   */
  get name() {
    throw new Error('BaseProvider.name must be implemented.');
  }

  /**
   * Describes which features this provider supports.
   * @returns {{ streaming: boolean, toolCalling: boolean, embeddings: boolean }}
   */
  get supportedFeatures() {
    return { streaming: false, toolCalling: false, embeddings: false };
  }

  /**
   * Estimates the USD cost for a given token usage.
   * Override in each provider with accurate pricing.
   * @param {number} inputTokens
   * @param {number} outputTokens
   * @returns {number}
   */
  estimateCost(inputTokens, outputTokens) {
    return 0;
  }
}

export default BaseProvider;
