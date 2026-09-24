# AI Architecture — NexusOps AI Co-Pilot Platform
**Version:** 1.0.0  
**Location:** `d:\AI-Workforce-Management-Platform\ai\`  
**Type:** Independent Node.js ES Modules workspace  
**Port:** 8001 (separate from backend on 5000)

---

## 1. Architecture Philosophy

The NexusOps AI Platform is a **completely independent service** that sits beside the backend as a peer. It does not modify, extend, or depend on the backend's source code.

```
┌─────────────────────┐        ┌─────────────────────────────────┐
│   React UI (Next.js)│        │   External MCP Clients           │
│   Port: 5173        │        │   (Claude Desktop, Cursor, etc.) │
└────────┬────────────┘        └──────────────┬──────────────────┘
         │ REST + SSE                          │ MCP Protocol
         │                                     │
    ┌────▼────────────────────────────────────▼───┐
    │          NexusOps AI Platform (Port 8001)     │
    │                                               │
    │  AIGateway → AIOrchestrator → ProviderRouter  │
    │  ↓ SSE streaming to client                    │
    │  ToolManager → ToolExecutor ──────────────────┼──► Backend REST API (Port 5001)
    │  ConversationManager → Redis                  │
    │  SearchService → MongoDB Atlas $vectorSearch  │
    └───────────────────────────────────────────────┘
         │                    │
    ┌────▼────┐         ┌─────▼──────────────┐
    │ Upstash │         │ MongoDB Atlas        │
    │ Redis   │         │ nexusops_ai DB       │
    │ (Memory)│         │ (Audit, Usage, RAG)  │
    └─────────┘         └────────────────────┘

    ┌──────────────────────────────────────────────┐
    │    NexusOps Backend (Port 5001)              │
    │    Auth, RBAC, Leave, Payroll, HR data        │
    │    MongoDB nexusops DB (business collections) │
    └──────────────────────────────────────────────┘
```

---

## 2. Module Map

```
ai/src/
├── config/
│   └── env.js                 Validated env config (envalid)
├── platform/
│   ├── db.js                  MongoDB (nexusops_ai DB)
│   ├── cache.js               Upstash Redis REST client
│   └── logger.js              Pino structured logger
├── providers/
│   ├── BaseProvider.js        Abstract provider interface
│   ├── GeminiProvider.js      Google Gemini 1.5 Pro (streaming + embeddings)
│   ├── GroqProvider.js        Groq Llama-3.3-70B (fast, streaming)
│   ├── OpenRouterProvider.js  OpenRouter fallback (Claude 3.5 Sonnet)
│   └── ProviderRouter.js      Smart routing + automatic failover chain
├── memory/
│   ├── ConversationManager.js Redis sliding window conversation history
│   └── ContextSummarizer.js   Async background context compression
├── prompts/
│   └── PromptBuilder.js       Layered system prompt assembly
├── tools/
│   ├── ToolManager.js         Auto-registration, RBAC filter, Zod validation
│   ├── ToolExecutor.js        HTTP → Backend REST API with JWT forwarding
│   └── definitions/           42+ domain tool definitions (13 modules)
├── orchestrator/
│   └── AIOrchestrator.js      Agentic loop with SSE streaming
├── gateway/
│   └── AIGateway.js           JWT auth, rate limiting, SSE lifecycle
├── search/
│   ├── SearchService.js       Semantic search + RAG ingestion
│   ├── DocumentChunker.js     Sentence-aware sliding window chunker
│   └── adapters/MongoAtlasAdapter.js  $vectorSearch with tenant isolation
├── models/
│   ├── AiAuditLog.js          Immutable conversation audit ledger
│   ├── AiUsage.js             Per-day token cost ledger
│   └── DocumentChunk.js       RAG vector store
├── events/
│   ├── EventBus.js            Singleton EventEmitter
│   └── listeners/             ragListener, auditListener, contextListener
├── safety/
│   └── SafetyGuard.js         Injection detection, PII masking, jailbreak blocks
└── api/
    ├── routes/ai.routes.js    /api/v1/ai/*
    └── routes/mcp.routes.js   /api/v1/mcp/*
```

---

## 3. Data Flow Summary

### 3.1 Chat Request
```
Client → POST /api/v1/ai/chat (Bearer JWT)
→ AIGateway.authenticate()       Extract userId, orgId, jwt from token
→ AIGateway.rateLimiter          20 req/15min per userId
→ SafetyGuard.validate()         Injection + PII check
→ SSE stream initialized         text/event-stream response
→ AIOrchestrator.execute()
    → PromptBuilder.buildSystemPrompt()  System prompt assembly
    → ConversationManager.getHistory()   Redis conversation load
    → ToolManager.getToolDefinitionsForLLM()  RBAC-filtered tools
    → ProviderRouter.chat()              LLM streaming
        → On token: yield → SSE token event
        → On tool_call:
            → ToolManager.execute()
                → Zod validation + RBAC check
                → ToolExecutor.request()  → Backend REST API (user's JWT)
            → yield → SSE tool_start + tool_result events
            → inject result → continue LLM loop
    → ConversationManager.appendTurn()   Persist to Redis
    → EventBus.emit('ai.audit')          Async audit + usage write
→ yield → SSE done event
→ res.end()
```

### 3.2 RAG Query
```
User: "What is the maternity leave carry-forward policy?"
→ LLM selects tool: searchOrganizationDocuments
→ ToolManager.execute('searchOrganizationDocuments', { query: '...' }, ctx)
→ SearchService.semanticQuery()
    → Check Redis embedding cache (SHA-256 key)
    → ProviderRouter.generateEmbedding(query)  → Gemini text-embedding-004
    → MongoAtlasAdapter.vectorSearch(queryVector, orgId)
        → $vectorSearch with tenant isolation filter
        → Returns top-5 semantically similar chunks
→ Chunks injected into next LLM message as grounding context
→ LLM generates cited answer
```

---

## 4. Security Architecture

| Layer | Mechanism |
|-------|-----------|
| Authentication | JWT verification (same secret as backend) |
| Tenant isolation | organizationId in every DB query + forced in MongoAtlasAdapter |
| RBAC | Double-checked in ToolManager (pre-filter in getToolDefinitions + re-check in execute) |
| Prompt injection | SafetyGuard regex patterns + length limits |
| PII protection | SafetyGuard masking before prompt reaches LLM |
| Audit trail | Immutable AiAuditLog per conversation turn |
| Token forwarding | User's JWT forwarded as-is to backend — no privilege escalation possible |

---

## 5. Provider Failover Chain

```
Request arrives
     ↓
AI_DEFAULT_PROVIDER (gemini)
     ↓ [429 / 503 / timeout]
AI_FALLBACK_PROVIDER (openrouter)
     ↓ [also fails]
Tertiary (groq)
     ↓ [all fail]
Error: "All LLM providers failed"
```

Embeddings always route to Gemini only (text-embedding-004). No fallback for embeddings.
