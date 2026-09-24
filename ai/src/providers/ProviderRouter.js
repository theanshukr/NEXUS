import { GeminiProvider } from '#ai/providers/GeminiProvider.js';
import { GroqProvider } from '#ai/providers/GroqProvider.js';
import { OpenRouterProvider } from '#ai/providers/OpenRouterProvider.js';
import env from '#ai/config/env.js';
import logger from '#ai/platform/logger.js';

/**
 * ProviderRouter — Smart multi-LLM routing with automatic failover.
 *
 * Routing Strategy:
 *   PRIMARY:   Configured via AI_DEFAULT_PROVIDER (default: gemini)
 *   SECONDARY: Configured via AI_FALLBACK_PROVIDER (default: openrouter)
 *   TERTIARY:  Always the remaining third provider
 *
 * Failover triggers on:
 *   - HTTP 429 (rate limit)
 *   - HTTP 503 (service unavailable)
 *   - HTTP 502 (bad gateway)
 *   - Network timeout errors
 *   - Provider API key not configured
 *
 * Embeddings always route to Gemini (text-embedding-004).
 * If Gemini is unavailable, embeddings fail — they cannot degrade to other providers.
 */
class ProviderRouter {
  constructor() {
    this._providers = new Map();
    this._routeOrder = [];
    this._initialized = false;
  }

  /**
   * Initialize all configured providers.
   * Called once at startup by the AI Platform index.
   */
  initialize() {
    if (this._initialized) return;

    const providerMap = {
      gemini:      () => new GeminiProvider(),
      groq:        () => new GroqProvider(),
      openrouter:  () => new OpenRouterProvider(),
    };

    // Register all providers (even if API key is missing — they'll fail gracefully)
    for (const [name, factory] of Object.entries(providerMap)) {
      try {
        this._providers.set(name, factory());
      } catch (err) {
        logger.warn({ provider: name, err }, '[ProviderRouter] Failed to initialize provider');
      }
    }

    // Build fallback chain: default → fallback → remaining
    const defaultProvider = env.AI_DEFAULT_PROVIDER;
    const fallbackProvider = env.AI_FALLBACK_PROVIDER;
    const allProviders = ['gemini', 'groq', 'openrouter'];
    const tertiary = allProviders.find(p => p !== defaultProvider && p !== fallbackProvider);

    this._routeOrder = [defaultProvider, fallbackProvider, tertiary].filter(Boolean);
    this._initialized = true;

    logger.info({ routeOrder: this._routeOrder }, '[ProviderRouter] Initialized with failover chain');
  }

  /**
   * Returns the appropriate provider by name.
   */
  _getProvider(name) {
    const provider = this._providers.get(name);
    if (!provider) throw new Error(`[ProviderRouter] Unknown provider: ${name}`);
    return provider;
  }

  /**
   * Determines if an error should trigger a provider failover.
   */
  _isRetryableError(error) {
    const msg = error.message?.toLowerCase() || '';
    return (
      msg.includes('429') || msg.includes('rate limit') ||
      msg.includes('413') || msg.includes('too large') || msg.includes('request too large') ||
      msg.includes('503') || msg.includes('502') ||
      msg.includes('service unavailable') ||
      msg.includes('network') || msg.includes('timeout') ||
      msg.includes('econnrefused') || msg.includes('enotfound') ||
      msg.includes('api error 429') || msg.includes('api error 503')
    );
  }

  /**
   * Route a chat request through the fallback chain.
   * Returns an async generator from the first successful provider.
   *
   * @param {Array} messages
   * @param {Array} tools
   * @param {object} options
   * @returns {AsyncGenerator}
   */
  async *chat(messages, tools = [], options = {}) {
    if (!this._initialized) this.initialize();

    let lastError;

    for (const providerName of this._routeOrder) {
      try {
        const provider = this._getProvider(providerName);
        logger.info({ provider: providerName }, '[ProviderRouter] Routing chat to provider');

        yield* provider.chat(messages, tools, options);
        return; // Successful — stop routing
      } catch (error) {
        lastError = error;
        logger.warn({ provider: providerName, err: error.message }, '[ProviderRouter] Provider failed — attempting failover');

        if (!this._isRetryableError(error)) {
          // Non-retryable error (e.g., invalid API key) — still try next provider
          // but log at error level
          logger.error({ provider: providerName, err: error.message }, '[ProviderRouter] Non-retryable provider error');
        }

        continue;
      }
    }

    // All providers exhausted
    logger.error({ routeOrder: this._routeOrder }, '[ProviderRouter] All providers failed');
    throw new Error(`All LLM providers failed. Last error: ${lastError?.message}`);
  }

  /**
   * Generate embeddings — always uses Gemini (text-embedding-004).
   * Falls back to error — no alternative embedding provider available.
   *
   * @param {string} text
   * @returns {Promise<number[]>}
   */
  async generateEmbedding(text) {
    if (!this._initialized) this.initialize();
    const gemini = this._getProvider('gemini');
    return gemini.generateEmbedding(text);
  }

  /**
   * Returns the name of the currently active primary provider.
   */
  get primaryProviderName() {
    return this._routeOrder[0];
  }

  /**
   * Returns all registered providers for health check endpoints.
   */
  get registeredProviders() {
    return [...this._providers.keys()];
  }
}

// Singleton — shared across the entire AI platform
export default new ProviderRouter();
