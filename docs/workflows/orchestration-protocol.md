> **Orchestration Workflows** | Version: 2.0 | REST API is the single source of truth

# AI Communication Protocol & HTTP Response Handling

## Overview

This document defines how an AI orchestrator must structure its HTTP requests to the NexusOps REST API and how it should parse and communicate responses to end users.

The orchestrator interacts with the backend exclusively via the **HTTP REST API v1** (`/api/v1/*`). The OpenAPI specification at `docs/openapi/openapi.yaml` is the canonical schema contract for all request and response shapes.

---

## 1. Request Construction

All mutative actions (POST, PUT, PATCH, DELETE) require:

- **Header:** `Authorization: Bearer <access_token>`
- **Header:** `Content-Type: application/json`
- **Body:** JSON matching the schema defined in `docs/openapi/openapi.yaml` for that endpoint.

**Example — creating a department:**
```http
POST /api/v1/departments
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "name": "Engineering",
  "code": "ENG",
  "parentCode": "TECH"
}
```

### Context Injection (Automatic)

The AI orchestrator does **not** pass `organizationId` in request bodies or URL paths. The tenant context is automatically derived from the Bearer JWT by the `requireTenant` middleware on the backend. Attempting to pass or override `organizationId` externally will be rejected.

---

## 2. Response Handling

### Success Response (2xx)

```json
{
  "success": true,
  "data": {
    "id": "64c9a...",
    "name": "Engineering",
    "status": "ACTIVE"
  },
  "message": "Department Engineering created successfully."
}
```

**Action:** Parse the `data` object for structured data. Use the `message` field to narrate the outcome to the user conversationally. Never expose raw JSON to the user.

### Validation Error (400)

```json
{
  "success": false,
  "code": "ERR_VALIDATION",
  "message": "Validation failed.",
  "errors": [
    { "field": "code", "message": "Code must be uppercase alphanumeric." }
  ]
}
```

**Action:** Enumerate the `errors` array and present the specific field-level failure to the user clearly. Offer to re-collect the corrected value.

### Unauthorized (401)

**Action:** The access token has expired or is invalid. Use `POST /api/v1/auth/refresh` to obtain a new token and retry the original request once. If refresh also fails, prompt the user to log in again.

### Forbidden (403)

```json
{
  "success": false,
  "code": "ERR_FORBIDDEN",
  "message": "Access denied: Required permission [department.create] is missing."
}
```

**Action:** Inform the user they lack authorization for the requested action. Quote the specific required permission from the `message` if present. Do not retry. Do not output raw JSON.

### Conflict (409)

**Action:** The resource already exists (duplicate `code`, `email`, etc.). Inform the user of the conflict and ask them to provide a unique alternative value.

### Account Locked (423)

**Action:** The target account has been locked due to excessive login failures. Inform the user and suggest contacting an administrator.

### Delegation Policy Violation (403 with delegation context)

**Action:** The current actor lacks a `RoleDelegationPolicy` permitting them to assign the target role. Explain that their administrative authority does not extend to that role tier.

### Server Error (500)

**Action:** Present a generic "The system encountered an unexpected error" message. Log the failure for debugging. Do not expose internal stack traces.

---

## 3. Token Lifecycle

| Event | Action |
|---|---|
| Access token expires (401 on any request) | Call `POST /api/v1/auth/refresh` with stored refresh token |
| Refresh succeeds | Persist new tokens, retry original request |
| Refresh fails (401) | Clear tokens, prompt user to log in |
| Explicit logout | Call `POST /api/v1/auth/logout`, clear all stored tokens |

---

## 4. Idempotency & Retry Strategy

- **GET requests:** Safe to retry on transient failures (`5xx`, network timeout).
- **POST/PUT/PATCH requests:** Do **not** automatically retry. A second execution may create a duplicate resource. Confirm with the user before retrying a mutative operation.
- **409 Conflict on POST:** Do not retry with the same payload. Collect a corrected unique value from the user.
