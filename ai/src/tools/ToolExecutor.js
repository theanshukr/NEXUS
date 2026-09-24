import env from '#ai/config/env.js';
import logger from '#ai/platform/logger.js';

/**
 * ToolExecutor — HTTP executor that calls the NexusOps backend REST API.
 *
 * The AI Platform never touches the backend's database directly.
 * Every tool execution is an authenticated HTTP request to the backend REST API,
 * forwarding the user's JWT token — identical to how the React UI calls the API.
 *
 * Security model:
 *   - User's Bearer JWT is forwarded as-is (no token minting or escalation)
 *   - RBAC is enforced BOTH here (pre-check) AND by the backend middleware
 *   - If the backend returns 403, the tool returns a permission error to the LLM
 *
 * All requests include:
 *   Authorization: Bearer <userJwt>
 *   Content-Type: application/json
 *   X-Correlation-ID: <correlationId>   (for distributed tracing)
 */
class ToolExecutor {
  constructor() {
    this._baseUrl = null; // Set lazily from env after initialization
  }

  get baseUrl() {
    if (!this._baseUrl) this._baseUrl = env.BACKEND_API_URL;
    return this._baseUrl;
  }

  /**
   * Execute an HTTP request to the backend REST API.
   *
   * @param {object} params
   * @param {string} params.method    HTTP method (GET|POST|PUT|PATCH|DELETE)
   * @param {string} params.path      API path (e.g., '/api/v1/leaves/apply')
   * @param {object} params.body      Request body for POST/PUT/PATCH
   * @param {object} params.query     URL query parameters
   * @param {string} params.jwt       User's JWT access token
   * @param {string} params.correlationId   Request correlation ID
   * @returns {Promise<{ success: boolean, data?: any, error?: string, statusCode: number }>}
   */
  async request({ method, path, body = null, query = {}, jwt, correlationId }) {
    const url = new URL(path, this.baseUrl);

    // Append query parameters
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${jwt}`,
      'X-Correlation-ID': correlationId || 'ai-tool-call',
      'X-AI-Platform': 'nexusops-ai/1.0',
    };

    const options = { method, headers };
    if (body && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
      options.body = JSON.stringify(body);
    }

    const startTime = Date.now();

    try {
      const response = await fetch(url.toString(), options);
      const latencyMs = Date.now() - startTime;

      logger.debug({ method, path, status: response.status, latencyMs }, '[ToolExecutor] Backend API call');

      // Parse response body
      let responseData;
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = { message: await response.text() };
      }

      if (response.ok) {
        return { success: true, data: responseData, statusCode: response.status };
      }

      // Map common HTTP errors to AI-friendly messages
      const errorMessage = this._mapHttpError(response.status, responseData);
      logger.warn({ method, path, status: response.status, responseData }, '[ToolExecutor] Backend returned error');

      return { success: false, error: errorMessage, statusCode: response.status, raw: responseData };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      logger.error({ err: error, method, path, latencyMs }, '[ToolExecutor] Network error calling backend');
      return {
        success: false,
        error: `Backend API unreachable: ${error.message}`,
        statusCode: 503,
      };
    }
  }

  /**
   * Translates HTTP status codes into LLM-friendly error messages.
   */
  _mapHttpError(status, responseData) {
    const message = responseData?.message || responseData?.error || 'Unknown error';
    switch (status) {
      case 400: return `Validation error: ${message}`;
      case 401: return 'Authentication error: your session may have expired. Please refresh and try again.';
      case 403: return `Permission denied: ${message}. You do not have the required permission to perform this action.`;
      case 404: return `Not found: ${message}`;
      case 409: return `Conflict: ${message}. This resource may already exist.`;
      case 422: return `Business rule violation: ${message}`;
      case 429: return 'Rate limit exceeded: the backend is temporarily limiting requests. Please try again shortly.';
      case 500: return 'Backend server error: please try again later or contact support.';
      case 503: return 'Backend service unavailable: please try again later.';
      default:  return `Backend error (${status}): ${message}`;
    }
  }

  // ── Convenience wrappers ──────────────────────────────────────────────────

  async get(path, query, jwt, correlationId) {
    return this.request({ method: 'GET', path, query, jwt, correlationId });
  }

  async post(path, body, jwt, correlationId) {
    return this.request({ method: 'POST', path, body, jwt, correlationId });
  }

  async put(path, body, jwt, correlationId) {
    return this.request({ method: 'PUT', path, body, jwt, correlationId });
  }

  async patch(path, body, jwt, correlationId) {
    return this.request({ method: 'PATCH', path, body, jwt, correlationId });
  }

  async delete(path, jwt, correlationId) {
    return this.request({ method: 'DELETE', path, jwt, correlationId });
  }
}

export default new ToolExecutor();
