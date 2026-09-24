# MCP Authentication Tool Specification (`auth-tools.md`)

## 1. `mcp_auth_login`
- **Purpose**: Authenticates a user with email and password, establishing an active session.
- **HTTP Mapping**: `POST /api/v1/auth/login`
- **Authentication**: Public (Unauthenticated)
- **Input JSON Schema**:
  ```json
  {
    "type": "object",
    "properties": {
      "email": { "type": "string", "format": "email" },
      "password": { "type": "string" }
    },
    "required": ["email", "password"]
  }
  ```
- **Response JSON Schema**:
  ```json
  {
    "type": "object",
    "properties": {
      "accessToken": { "type": "string" },
      "refreshToken": { "type": "string" },
      "user": { "type": "object" }
    }
  }
  ```
- **Business & Validation Rules**: Enforces 5 failed login attempt lockout (`ACCOUNT_LOCKED`). Checks account suspension status (`ERR_FORBIDDEN`).
- **Side Effects**: Stores active session in Upstash Redis (`session:<userId>`) and records `refreshtokens` document in MongoDB.
- **Events Emitted**: None.
- **Audit Logs Generated**: `LOGIN_SUCCESS`, `LOGIN_FAILED`, or `ACCOUNT_LOCKED`.

---

## 2. `mcp_auth_refresh`
- **Purpose**: Rotates short-lived JWT access tokens and refresh tokens.
- **HTTP Mapping**: `POST /api/v1/auth/refresh`
- **Authentication**: Public (requires valid refresh token in body or cookies)
- **Input JSON Schema**:
  ```json
  {
    "type": "object",
    "properties": {
      "refreshToken": { "type": "string" }
    },
    "required": ["refreshToken"]
  }
  ```
- **Side Effects**: Deletes old token from Upstash Redis and MongoDB, issues and caches a replacement token pair.
- **Audit Logs Generated**: None.

---

## 3. `mcp_auth_register_via_invite`
- **Purpose**: Completes onboarding registration using a validated invitation token.
- **HTTP Mapping**: `POST /api/v1/auth/register-invite`
- **Authentication**: Public (requires valid invitation token)
- **Input JSON Schema**:
  ```json
  {
    "type": "object",
    "properties": {
      "token": { "type": "string" },
      "firstName": { "type": "string", "minLength": 2 },
      "lastName": { "type": "string", "minLength": 2 },
      "password": { "type": "string", "minLength": 8 }
    },
    "required": ["token", "firstName", "lastName", "password"]
  }
  ```
- **Transaction Behavior**: Multi-document Mongoose ClientSession ACID transaction. Creates `User`, binds target roles in `UserRole`, transitions invitation to `ACCEPTED`, and links `Employee` profile if present.
- **Events Emitted**: `USER.REGISTERED`, `EMPLOYEE.USER_LINKED`.
- **Audit Logs Generated**: `USER_REGISTERED`.

---

## 4. `mcp_auth_logout`
- **Purpose**: Terminates user session and revokes refresh tokens.
- **HTTP Mapping**: `POST /api/v1/auth/logout`
- **Authentication**: Bearer JWT Required
- **Input JSON Schema**: `{ "type": "object", "properties": {} }`
- **Side Effects**: Deletes Redis session `session:<userId>` and removes refresh token documents.
- **Audit Logs Generated**: None.

---

## 5. `mcp_auth_get_me`
- **Purpose**: Retrieves current user identity, organization context, and computed RBAC permissions.
- **HTTP Mapping**: `GET /api/v1/auth/me`
- **Authentication**: Bearer JWT Required
- **Input JSON Schema**: `{ "type": "object", "properties": {} }`
- **Side Effects**: Queries Upstash Redis RBAC permission cache (`rbac:<orgId>:<userId>`).
