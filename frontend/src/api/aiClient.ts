import { AI_API_URL } from './client';

/**
 * Dedicated AI Platform API client.
 *
 * The AI Platform runs as an independent service (port 8001) separate from
 * the backend (port 5001). This client routes all AI-specific requests
 * (chat, conversations) to the AI Platform.
 *
 * The chat endpoint returns Server-Sent Events (SSE), so we use native
 * `fetch` with a streaming reader instead of axios.
 */

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
  const token = localStorage.getItem('accessToken');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// ── SSE Event Types ─────────────────────────────────────────────────────────

export interface SSESessionEvent {
  sessionId: string;
  timestamp: number;
}

export interface SSETokenEvent {
  content: string;
  correlationId?: string;
}

export interface SSEToolStartEvent {
  name: string;
  args: Record<string, any>;
  correlationId?: string;
}

export interface SSEToolResultEvent {
  name: string;
  result: any;
  correlationId?: string;
}

export interface SSEDoneEvent {
  correlationId?: string;
  usage?: { inputTokens: number; outputTokens: number; costUsd: number };
  toolsInvoked?: Array<{ name: string; status: string; executionTimeMs: number }>;
  totalLatencyMs?: number;
}

export interface SSEErrorEvent {
  message: string;
  correlationId?: string;
}

export type SSECallbacks = {
  onSession?: (data: SSESessionEvent) => void;
  onToken?: (data: SSETokenEvent) => void;
  onToolStart?: (data: SSEToolStartEvent) => void;
  onToolResult?: (data: SSEToolResultEvent) => void;
  onDone?: (data: SSEDoneEvent) => void;
  onError?: (data: SSEErrorEvent) => void;
};

// ── Chat (SSE Streaming) ────────────────────────────────────────────────────

/**
 * Send a chat message to the AI Platform and stream the response via SSE.
 *
 * Uses native `fetch` because axios does not support streaming responses.
 * Parses the SSE text/event-stream format and dispatches to typed callbacks.
 *
 * @param userPrompt - The user's message
 * @param sessionId  - Optional session ID for conversation continuity
 * @param clientContext - Optional UI context (currentModule, currentPageUrl, etc.)
 * @param callbacks  - SSE event handlers
 * @param signal     - Optional AbortSignal to cancel the request
 */
export async function streamChat(
  userPrompt: string,
  sessionId: string | undefined,
  clientContext: Record<string, any> | undefined,
  callbacks: SSECallbacks,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch(`${AI_API_URL}/chat`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ userPrompt, sessionId, clientContext }),
    signal,
  });

  if (!response.ok) {
    // Try to parse error body
    let errorMsg = `AI Platform error (${response.status})`;
    try {
      const errBody = await response.json();
      errorMsg = errBody.message || errBody.error || errorMsg;
    } catch {
      // If body isn't JSON, use status text
      errorMsg = `AI Platform error: ${response.statusText || response.status}`;
    }
    callbacks.onError?.({ message: errorMsg });
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    callbacks.onError?.({ message: 'Failed to open response stream' });
    return;
  }

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // SSE format: "event: <type>\ndata: <json>\n\n"
      // Split on double newlines to get complete events
      const events = buffer.split('\n\n');
      // Keep the last partial chunk in the buffer
      buffer = events.pop() || '';

      for (const eventBlock of events) {
        if (!eventBlock.trim()) continue;

        const lines = eventBlock.split('\n');
        let eventType = '';
        let eventData = '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            eventData = line.slice(6);
          }
        }

        if (!eventType || !eventData) continue;

        try {
          const parsed = JSON.parse(eventData);
          switch (eventType) {
            case 'session':
              callbacks.onSession?.(parsed);
              break;
            case 'token':
              callbacks.onToken?.(parsed);
              break;
            case 'tool_start':
              callbacks.onToolStart?.(parsed);
              break;
            case 'tool_result':
              callbacks.onToolResult?.(parsed);
              break;
            case 'done':
              callbacks.onDone?.(parsed);
              break;
            case 'error':
              callbacks.onError?.(parsed);
              break;
          }
        } catch {
          // Skip malformed JSON events
          console.warn('[aiClient] Failed to parse SSE event:', eventType, eventData);
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// ── REST Helpers (Conversations) ────────────────────────────────────────────

/**
 * Fetch conversation history for a session.
 * GET /api/v1/ai/conversations/:sessionId
 */
export async function getConversation(sessionId: string) {
  const res = await fetch(`${AI_API_URL}/conversations/${sessionId}`, {
    headers: getAuthHeaders(),
  });
  return res.json();
}

/**
 * Delete / clear a conversation session.
 * DELETE /api/v1/ai/conversations/:sessionId
 */
export async function deleteConversation(sessionId: string) {
  const res = await fetch(`${AI_API_URL}/conversations/${sessionId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  return res.json();
}
