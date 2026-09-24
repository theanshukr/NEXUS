# 🔍 AI Platform Gap Analysis
**Document Version:** 1.0.0  
**Classification:** Internal — Engineering & AI Teams  
**Date:** July 3, 2026  

---

## 1. Executive Summary

This gap analysis compares the existing AI layer implementation (`ai/` directory) against the specification documentation, planned module roadmaps, and backend capabilities. It identifies missing features, incomplete integrations, and gaps in tooling.

---

## 2. Gap Matrix: Implementation vs. Specifications

| Component / Feature | Documented Target | Actual Implementation | Gap Severity | Description |
|---|---|---|---|---|
| **M-02 Department Tools** | Support department creation, movement, archiving, and editing. | **None** of the mutation tools are implemented. Only `listDepartments` exists. | 🔴 **High** | The AI cannot manage department structure or hierarchy despite this being frozen on the backend. |
| **Hierarchy Tool API** | Query `/api/v1/departments/:id/hierarchy` | Queries non-existent endpoint. | 🔴 **High** | Causes `getHierarchyMap` to crash with a 404. |
| **Authentication JWT Roles & Permissions** | Extract dynamic permissions from JWT context. | Hardcoded to `permissions: []` and `roles: []`. | 🔴 **Critical** | Prevents non-owner users from executing any tool calls. |
| **RAG Embedding Dimension** | 1536 dimensions for similarity search. | Gemini Provider outputs 768 dimensions. | 🔴 **Critical** | Will crash vector search execution due to index dimension mismatch. |
| **Safety Layer Output Validation** | Sanitize and filter LLM narrative output. | Only filters user input prompt. | 🟡 **Medium** | Sensitive data or leaked system instructions from output are not blocked. |
| **RAG Re-ranking** | Cross-encoder or re-ranking step for search quality. | None implemented. | 🟢 **Low** | Direct Mongo vector search results are forwarded without re-ranking. |
| **Long-Term Memory Integration** | Persistence of user preference, style, context. | Defined in memory tier but never fetched. | 🟡 **Medium** | MongoDB long-term memory remains stubbed; only short-term summaries are used. |
| **Event Bus RAG Trigger** | Trigger indexing on `document.uploaded` event. | Trigger exists in AI but backend does not emit it. | 🟡 **Medium** | Requires backend module M-12 Document Management integration. |

---

## 3. Detailed Gap Review

### 3.1 Missing Department Mutation Tools
The backend completed Module M-02 (Departments) with comprehensive controllers, routes, and validation schemas for creating, updating, moving, and archiving departments. 
*   **Gap:** The AI platform contains no tools in [ai/src/tools/definitions/](file:///d:/AI-Workforce-Management-Platform/ai/src/tools/definitions/) to write to these endpoints.
*   **Impact:** The AI is read-only for department management, violating **Scenario 1** in `scenarios.md`.
*   **Remedy:** Implement `createDepartment.tool.js`, `updateDepartment.tool.js`, and `moveDepartment.tool.js` calling the corresponding endpoints (`POST /api/v1/departments`, `PUT /api/v1/departments/:id`, `POST /api/v1/departments/:id/move`).

### 3.2 Incorrect Hierarchy Map Routing
The AI tool `getHierarchyMap` in [organization.tools.js](file:///d:/AI-Workforce-Management-Platform/ai/src/tools/definitions/organization.tools.js#L34-L49) attempts to call `/api/v1/departments/:departmentId/hierarchy`.
*   **Gap:** The backend routing table ([departmentRoutes.js](file:///d:/AI-Workforce-Management-Platform/backend/src/modules/departments/routes/departmentRoutes.js)) does not expose a `/hierarchy` sub-route. Instead, it exposes `GET /api/v1/departments/tree`.
*   **Impact:** Running the tool leads to a `404 Not Found` API exception.
*   **Remedy:** Refactor the tool to call `/api/v1/departments/tree` and filter or construct the subtree in the tool adapter if a specific `departmentId` is provided.

### 3.3 JWT Auth Integration Lack of Permissions
The gateway's auth parser in [AIGateway.js](file:///d:/AI-Workforce-Management-Platform/ai/src/gateway/AIGateway.js#L117-L122) fails to fetch the user's roles and permissions from the JWT claims or backend.
*   **Gap:** Since permissions are not encoded in the access token, the gateway must make an HTTP call to `/api/v1/auth/me` on request intake to populate `userContext.permissions`.
*   **Impact:** The security layer in `ToolManager` receives empty permissions, denying access to all tools.
*   **Remedy:** Fetch the user profile and permissions from `/api/v1/auth/me` on session startup and cache it, or retrieve it during request processing.

### 3.4 Vector Search Dimension Mismatch
The index `nexusops_vector_index` is documented to require `1536` dimensions, but `text-embedding-004` (configured in [GeminiProvider.js](file:///d:/AI-Workforce-Management-Platform/ai/src/providers/GeminiProvider.js)) outputs `768`.
*   **Gap:** Model output dimensions and database schema expectation are misaligned.
*   **Impact:** Mongo Atlas throws a runtime execution error when running the aggregation pipeline containing `$vectorSearch` with a mismatched float array size.
*   **Remedy:** Update `RAG_VECTOR_DIMENSIONS` to `768` and align index schemas in MongoDB documentation.

### 3.5 Placeholder AI Documentation Files
Multiple files under `docs/ai/` are templates with placeholder structures (e.g., [users.md](file:///d:/AI-Workforce-Management-Platform/docs/ai/users.md) and [role-delegation.md](file:///d:/AI-Workforce-Management-Platform/docs/ai/role-delegation.md)).
*   **Gap:** Documentation is out-of-date and contains boilerplates.
*   **Impact:** Reduced developers' ability to reference the API requirements for AI tools.
*   **Remedy:** Fill in correct parameters, response schemas, and execution flows.
