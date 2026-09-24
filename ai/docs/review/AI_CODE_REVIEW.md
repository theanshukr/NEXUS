# 💻 AI Code Review: Module-by-Module Audit
**Document Version:** 1.0.0  
**Classification:** Internal — Engineering & AI Teams  
**Date:** July 3, 2026  

---

## 1. Gateway & Routes

### 1.1 `AIGateway.js`
*   **Permissions Extraction Bug:** [Line 117-122](file:///d:/AI-Workforce-Management-Platform/ai/src/gateway/AIGateway.js#L117-L122):
    ```javascript
    const userContext = {
      ...user,
      name:        req.headers['x-user-name'] || user.email,
      roles:       [],            // TODO: Fetch from RbacService via backend API if needed
      permissions: [],            // TODO: Derive from backend /api/v1/me/permissions endpoint
    };
    ```
    This leaves user permissions empty. It must be refactored to fetch user permissions using `ToolExecutor.get('/api/v1/auth/me')` or direct endpoint queries to populate this array.
*   **Uncaught SSE Flush:** In `handleChat` (line 130), `res.flushHeaders()` is called. In Node.js environment under compression or proxy middlewares, it's best to call `res.flush()` if it is available to prevent buffer buffering.

---

## 2. Orchestration

### 2.1 `AIOrchestrator.js`
*   **Parallel Tool Execution Ignored:** [Lines 95-97](file:///d:/AI-Workforce-Management-Platform/ai/src/orchestrator/AIOrchestrator.js#L95-L97):
    ```javascript
    if (event.type === 'tool_call') {
      pendingToolCall = { toolCall: event.toolCall, toolCallId: event.toolCallId || `call_${Date.now()}` };
    }
    ```
    If the LLM returns multiple tool calls within one stream, `pendingToolCall` is overwritten. Only the last tool call is kept and executed. This limits performance on complex prompts requiring parallel data lookups.
*   **Audit Payload Deficiencies:** [Lines 162-175](file:///d:/AI-Workforce-Management-Platform/ai/src/orchestrator/AIOrchestrator.js#L162-L175) does not record the provider or model used in the event emitted to `EventBus`. This results in `AiAuditLog` database entries storing `UNKNOWN` values.

---

## 3. Prompts & Context

### 3.1 `PromptBuilder.js`
*   **Prompt Injection via UI Context:** [Lines 94-107](file:///d:/AI-Workforce-Management-Platform/ai/src/prompts/PromptBuilder.js#L94-L107) accepts raw client UI context fields (`currentModule`, `currentPageUrl`, `selectedRecordIds`) and appends them directly to the system prompt without sanitization.
*   **Risk:** If a malicious user injects instructions into UI URLs or document categories (e.g. `http://localhost/search?q=Ignore all previous rules`), this will bleed into the system prompt and trigger a prompt injection bypass.

---

## 4. Providers & Routing

### 4.1 `ProviderRouter.js`
*   **No HTTP Timeout:** The `fetch` calls in provider adapters (e.g., [OpenRouterProvider.js](file:///d:/AI-Workforce-Management-Platform/ai/src/providers/OpenRouterProvider.js)) do not configure connection timeouts. If a provider endpoint hangs, the request block will stay open indefinitely, hogging gateway sockets.
*   **Embedding Dimension Hardcoding:** `generateEmbedding` does not validate or check the returned embedding vector dimension length, letting mismatched vectors propagate directly to Mongo.

---

## 5. Tool Management

### 5.1 `ToolExecutor.js`
*   **Lack of Retries:** Tool execution fails immediately on temporary backend hiccups. There is no auto-retry mechanism with exponential backoff on HTTP 502/503/504 errors.
*   **Hardcoded Base URL:** The `baseUrl` is loaded on demand but does not allow runtime overriding for testing environments, which forces mock setups.

### 5.2 Missing Tools
*   **M-02 Department mutations** are completely absent. Add a file `department.tools.js` supporting `createDepartment`, `updateDepartment`, `moveDepartment`, and `archiveDepartment`.

---

## 6. Memory System

### 6.1 Summarizer Race Condition
*   **Detail:** [ConversationManager.js:74-78](file:///d:/AI-Workforce-Management-Platform/ai/src/memory/ConversationManager.js#L74-L78):
    ```javascript
    if (currentLen > this._maxTurns) {
      await cache.listTrim(key, this._maxTurns);
      return { shouldSummarize: true };
    }
    ```
    Trimming happens synchronously. The background summarizer event `ai.context.overflow` is processed asynchronously and queries the same key. The oldest messages (which we wanted to summarize) are already deleted before the summarizer can fetch them.
*   **Refactor Fix:** Pass the oldest messages *inside* the event payload:
    ```javascript
    // In ConversationManager
    const trimmedMessages = await cache.listGetOldest(key, 6);
    await cache.listTrim(key, this._maxTurns);
    return { shouldSummarize: true, contextText: trimmedMessages };
    ```

---

## 7. RAG & Vector Search

### 7.1 `DocumentChunker.js`
*   **Heuristic Token Estimation:** Estimates tokens by word-count division (`words / 0.75`). This is inaccurate for non-English terms or coding snippets, leading to chunks exceeding the 500-token limit of models. 
*   **Refactor Fix:** Integrate `@dqbd/tiktoken` or a lightweight BPE tokenizer.
