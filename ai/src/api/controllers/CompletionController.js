import ProviderRouter from '#ai/providers/ProviderRouter.js';
import logger from '#ai/platform/logger.js';

/**
 * CompletionController — Non-streaming JSON completion endpoint.
 *
 * Used by backend services (e.g., OnboardingAIService) that need a
 * single structured JSON response from the LLM provider chain, rather
 * than a streaming SSE connection.
 *
 * The backend constructs the full messages array server-side.
 * This controller validates the request, routes it through the existing
 * ProviderRouter (with full failover), collects all streamed tokens,
 * and returns the assembled text as a JSON response.
 *
 * SECURITY:
 *   - Only accepts requests with a valid x-internal-key header.
 *   - The internal key is set via AI_INTERNAL_KEY env var.
 *   - This endpoint is NOT exposed to the public internet.
 *   - All tenant/auth validation is done by the CALLING backend service.
 */
class CompletionController {
  /**
   * POST /api/v1/ai/complete
   *
   * Body:
   *   { messages: Array<{role, content}>, options?: { maxTokens, temperature } }
   *
   * Response:
   *   { success: true, content: string, usage: { inputTokens, outputTokens } }
   */
  async complete(req, res) {
    const { messages, options = {} } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_MESSAGES', message: 'messages must be a non-empty array' }
      });
    }

    let assembled = '';
    let usage = { inputTokens: 0, outputTokens: 0 };
    let provider = 'UNKNOWN';

    try {
      for await (const event of ProviderRouter.chat(messages, [], options)) {
        if (event.type === 'token') {
          assembled += event.content;
        }
        if (event.type === 'done') {
          usage = event.usage || usage;
          if (event.provider) provider = event.provider;
        }
        if (event.type === 'error') {
          throw new Error(event.error?.message || 'Provider streaming error');
        }
      }

      logger.info({ provider, inputTokens: usage.inputTokens, outputTokens: usage.outputTokens }, '[CompletionController] Completion successful');

      return res.status(200).json({
        success: true,
        content: assembled,
        usage,
        provider,
      });
    } catch (err) {
      logger.error({ err: err.message }, '[CompletionController] Completion failed');
      return res.status(503).json({
        success: false,
        error: {
          code: 'AI_UNAVAILABLE',
          message: 'All LLM providers are currently unavailable. Please try again later.',
        }
      });
    }
  }
}

export default new CompletionController();
