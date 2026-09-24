# Request Lifecycle & Middleware Pipeline

## Purpose

This document describes exactly what happens from the moment an HTTP request arrives at the server to the moment a response is returned. It covers the Express application bootstrap, middleware pipeline, routing, and error handling.

## Architectural Overview

Every request passes through a sequential middleware pipeline before reaching a controller. The pipeline enforces security, tenant isolation, and permission checks in a fixed order. Bypassing any layer is architecturally impossible — each middleware calls `next()` only if its invariant is satisfied.

## Application Bootstrap Sequence

```mermaid
sequenceDiagram
    participant OS as Node.js Process
    participant CFG as env.js (envalid)
    participant DB as MongoDB Atlas
    participant APP as Express App
    participant BS as OrganizationBootstrapRegistry
    participant BUS as EventBus

    OS->>CFG: Load and validate environment variables
    CFG-->>OS: Validated config object
    OS->>DB: connectDB() — mongoose.connect()
    DB-->>OS: Connection established
    OS->>APP: Mount middleware + routes
    APP->>BS: Import (auto-initializes)
    BS->>BUS: Subscribe to TENANT_PROVISIONED
    OS->>APP: app.listen(:3000)
```

*The process startup is strictly sequential: config → database → app + event subscriptions → HTTP listener. A failure at any step aborts the process.*

## Request Pipeline

```mermaid
flowchart TD
    REQ["Incoming HTTP Request"]

    subgraph "Global Infrastructure Middleware"
        H["helmet()\nSecurity headers"]
        CORS["cors()\nOrigin whitelist"]
        JSON["express.json()\nBody parsing"]
        COOK["cookieParser()\nCookie parsing"]
    end

    subgraph "Route Middleware Chain"
        AUTH["authenticate()\nJWT verify + session liveness"]
        TENANT["requireTenant()\nInject ALS tenant context"]
        PERM["hasPermission()\nRBAC capability check"]
        VALID["validate(schema)\nZod request validation"]
    end

    CTRL["Controller\nExtract params and call service"]
    SVC["Service\nBusiness logic + DB"]
    RES["JSON Response\n{ success, data }"]

    ERR["errorHandler()\nStandardized error response\n{ success: false, error: {...} }"]

    REQ --> H --> CORS --> JSON --> COOK
    COOK --> AUTH
    AUTH -->|"401 if invalid"| ERR
    AUTH --> TENANT
    TENANT -->|"500 if missing orgId"| ERR
    TENANT --> PERM
    PERM -->|"403 if denied"| ERR
    PERM --> VALID
    VALID -->|"400 if invalid"| ERR
    VALID --> CTRL --> SVC --> RES
    SVC -->|"throws AppError"| ERR
```

*The middleware chain is ordered by security priority: authentication before authorization, authorization before business validation. Any failure short-circuits to the global error handler.*

## Middleware Responsibilities

### `authenticate` — Identity Verification

```mermaid
flowchart LR
    TOKEN["Bearer JWT\nfrom header"]
    VERIFY["jwt.verify()\nSecret + expiry"]
    SESSION["cacheService.exists()\ntenant:orgId:session:userId:sessionId"]
    BIND["Bind req.user\n{ userId, organizationId,\n  email, sessionId }"]
    NEXT["next()"]

    TOKEN --> VERIFY -->|"valid"| SESSION -->|"exists"| BIND --> NEXT
    VERIFY -->|"expired"| ERR1["401 ERR_TOKEN_EXPIRED"]
    SESSION -->|"not found"| ERR2["401 ERR_SESSION_REVOKED"]
```

Session liveness is checked on **every request**. A logout or admin suspension immediately invalidates the session key in Redis, making subsequent requests fail even if the JWT has not yet expired.

### `requireTenant` — Zero-Trust Isolation Guard

Extracts `organizationId` from `req.user` (set by `authenticate`) and binds it to:
1. `req.tenantContext.organizationId` — for controller/service parameter passing
2. **AsyncLocalStorage via `TenantContext.run()`** — the ALS context becomes the safety net inside `BaseRepository._validateTenantScope()`. If any service or repository uses a different `organizationId` than the one in ALS context, a fatal security exception is thrown.

### `hasPermission(permission)` — RBAC Enforcement

```mermaid
flowchart LR
    CHECK["RbacService.enforcePermission()\nuserId, orgId, permission"]
    CACHE["CacheService.get()\ntenant:orgId:user:userId:permissions"]
    DB["UserRoleRepository\nfetch + populate roles"]
    COMPUTE["Union all role.permissions[]"]
    STORE["CacheService.set()\nTTL: 3600s"]
    EVAL["has('*') OR\nhas(requiredPermission)"]

    CHECK --> CACHE
    CACHE -->|"hit: cached Set"| EVAL
    CACHE -->|"miss"| DB --> COMPUTE --> STORE --> EVAL
    EVAL -->|"false"| ERR["403 ForbiddenError"]
    EVAL -->|"true"| NEXT["next()"]
```

## Error Handler

The global `errorHandler` (mounted last on Express) normalizes all exceptions — operational domain errors, Mongoose driver errors, JWT errors, Zod validation failures — into a consistent JSON envelope:

```json
{
  "success": false,
  "error": {
    "code": "ERR_VALIDATION",
    "message": "Input payload validation failed.",
    "status": 400,
    "timestamp": "2026-07-08T10:00:00.000Z",
    "path": "/api/v1/employees",
    "details": [{ "field": "workEmail", "message": "Invalid email" }]
  }
}
```

| Error Type | Status | Code |
|---|---|---|
| Mongoose duplicate key (E11000) | 409 | `ERR_CONFLICT` |
| Mongoose schema validation | 400 | `ERR_VALIDATION` |
| Mongoose CastError (bad ObjectId) | 400 | `ERR_INVALID_ID` |
| Zod validation error | 400 | `ERR_VALIDATION` |
| JWT expired | 401 | `ERR_TOKEN_EXPIRED` |
| JWT invalid | 401 | `ERR_UNAUTHORIZED` |
| AppError (operational) | varies | Custom error code |
| Unhandled exception | 500 | `ERR_INTERNAL_SERVER` |

Stack traces are included in the error response only in `NODE_ENV=development`.

## Key Takeaways

- The middleware pipeline is immutable — you cannot reorder `authenticate → requireTenant → hasPermission`.
- Session revocation is **real-time**: deleting the Redis session key immediately blocks that session on the next request.
- The global error handler is the single point of truth for error formatting. Controllers must never manually write error responses.
- Every `500`-level error is logged with full stack trace via Pino; every `4xx` error is logged at `warn` level with correlation context.
