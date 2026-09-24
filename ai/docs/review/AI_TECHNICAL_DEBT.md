# 💸 AI Technical Debt Ledger
**Document Version:** 1.0.0  
**Classification:** Internal — Technical Debt tracking  
**Date:** July 3, 2026  

---

## 1. Overview
This ledger identifies areas of code smell, incomplete implementations, or shortcuts taken in the `ai/` platform that require long-term refactoring to meet enterprise standards.

---

## 2. Technical Debt Log

| ID | Module / Component | Debt Description | Business Impact | Refactor Effort |
|---|---|---|---|---|
| **TD-01** | **Providers** | Absence of connection timeouts on fetch requests. | Gateway socket depletion if provider endpoints hang. | 🟢 Low (2 hours) |
| **TD-02** | **Orchestrator** | Discarding parallel tool calls; only executing the last one in the stream. | LLM logic errors when trying to gather multiple facts at once. | 🟡 Medium (1 day) |
| **TD-03** | **Search** | Heuristic word-splitting for token counting (`word / 0.75`). | Context window overflows due to inaccurate token size estimation. | 🟢 Low (3 hours) |
| **TD-04** | **Analytics** | Loss of provider/model detail in `AiUsage` (hardcoded `auto` / `mixed`). | Inability to track model usage costs by department/tenant. | 🟢 Low (4 hours) |
| **TD-05** | **Tests** | Sequential in-memory replica set spin-up on Vitest. | Flaky test runs, timeouts, and long test execution times on local machines. | 🟡 Medium (2 days) |
| **TD-06** | **Docs** | Placeholder documentation templates for 70% of domain files. | Developer confusion regarding tool specs and expected JSON models. | 🟡 Medium (3 days) |

---

## 3. High-Impact Tech Debt Details

### TD-01: Indefinite Socket Hangs in Provider Calls
The AI Platform connects to third-party APIs (Google, Groq, OpenRouter) using standard `fetch` or SDKs. If these APIs suffer from a packet drop, the request will hang indefinitely.
*   **Recommendation:** Wrap all requests in an AbortController with a 15-second timeout.

### TD-02: Parallel Tool Calls Ignored
Frontend models frequently request multiple tool calls in parallel (e.g. fetching department status and employee details in one turn).
*   **Recommendation:** Change `pendingToolCall` from an object to an array:
    ```javascript
    let pendingToolCalls = [];
    if (event.type === 'tool_call') {
      pendingToolCalls.push(event.toolCall);
    }
    ```
    Iterate over the array, execute the tools using `Promise.all`, and append all results to the message thread.

### TD-05: Flaky Test Runs and Sequential Database Bottleneck
Running 33 test suites sequentially using `fileParallelism: false` takes over **15 minutes** (989s) and triggers connection resets because each file initiates its own `MongoMemoryReplSet` instance.
*   **Recommendation:** Initialize a single, shared `MongoMemoryReplSet` instance once globally for all Vitest suites, and run collections cleanup between test files.
