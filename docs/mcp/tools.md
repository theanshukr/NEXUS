# MCP Tools Schema Specification

*Synchronized with Backend Architecture (M-01 + M-02 + M-03 + M-04)*

This specification provides the formal JSON-RPC 2.0 / Model Context Protocol tool schema definitions for the Enterprise Workforce Management Platform. Each tool definition includes description, input parameters, and validation constraints.

---

## 1. Authentication Tools (`mcp_auth_*`)

### `mcp_auth_login`
- **Description**: Authenticates user credentials and returns short-lived JWT access tokens and Upstash Redis session state.
- **Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "email": { "type": "string", "format": "email", "description": "User email address" },
    "password": { "type": "string", "description": "User account password" }
  },
  "required": ["email", "password"],
  "additionalProperties": false
}
```

### `mcp_auth_refresh`
- **Description**: Rotates an existing refresh token to issue a new short-lived access token.
- **Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "refreshToken": { "type": "string", "description": "Valid JWT refresh token" }
  },
  "required": ["refreshToken"],
  "additionalProperties": false
}
```

### `mcp_auth_register_invite`
- **Description**: Registers a new user account by redeeming a valid cryptographic invitation token.
- **Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "token": { "type": "string", "minLength": 64, "maxLength": 64, "description": "64-character hex invitation token" },
    "email": { "type": "string", "format": "email" },
    "password": { "type": "string", "minLength": 8 },
    "firstName": { "type": "string" },
    "lastName": { "type": "string" }
  },
  "required": ["token", "email", "password", "firstName", "lastName"],
  "additionalProperties": false
}
```

### `mcp_auth_logout`
- **Description**: Terminates active session and revokes refresh tokens in MongoDB and Upstash Redis.
- **Input Schema**:
```json
{
  "type": "object",
  "properties": {},
  "additionalProperties": false
}
```

### `mcp_auth_get_me`
- **Description**: Retrieves current authenticated user profile, tenant ID, and assigned RBAC roles.
- **Input Schema**:
```json
{
  "type": "object",
  "properties": {},
  "additionalProperties": false
}
```

---

## 2. Organization Tools (`mcp_org_*`)

### `mcp_org_create`
- **Description**: Provisions a new B2B SaaS tenant organization with initial root admin, settings, and seeded role templates.
- **Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "name": { "type": "string", "description": "Full legal company name" },
    "code": { "type": "string", "pattern": "^[A-Z0-9]{3,10}$", "description": "Unique uppercase tenant code" },
    "domain": { "type": "string" },
    "adminEmail": { "type": "string", "format": "email" },
    "adminPassword": { "type": "string", "minLength": 8 },
    "adminFirstName": { "type": "string" },
    "adminLastName": { "type": "string" }
  },
  "required": ["name", "code", "domain", "adminEmail", "adminPassword", "adminFirstName", "adminLastName"],
  "additionalProperties": false
}
```

### `mcp_org_get_me`
- **Description**: Retrieves active tenant organization metadata and settings.
- **Input Schema**:
```json
{
  "type": "object",
  "properties": {},
  "additionalProperties": false
}
```

---

## 3. Role & RBAC Tools (`mcp_roles_*` / `mcp_delegation_*`)

### `mcp_roles_list`
- **Description**: Lists all active dynamic roles and seeded system templates in the tenant.
- **Input Schema**:
```json
{
  "type": "object",
  "properties": {},
  "additionalProperties": false
}
```

### `mcp_roles_create`
- **Description**: Creates a custom RBAC role with specific permission strings and priority.
- **Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "name": { "type": "string" },
    "priority": { "type": "integer", "minimum": 1, "maximum": 999 },
    "permissions": { "type": "array", "items": { "type": "string" } },
    "description": { "type": "string" }
  },
  "required": ["name", "priority", "permissions"],
  "additionalProperties": false
}
```

### `mcp_roles_assign`
- **Description**: Assigns an RBAC role to a user, subject to RoleDelegationPolicy verification.
- **Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "userId": { "type": "string", "pattern": "^[0-9a-fA-F]{24}$" },
    "roleId": { "type": "string", "pattern": "^[0-9a-fA-F]{24}$" }
  },
  "required": ["userId", "roleId"],
  "additionalProperties": false
}
```

### `mcp_delegation_list`
- **Description**: Retrieves all enterprise role delegation policy boundaries for the active tenant.
- **Input Schema**:
```json
{
  "type": "object",
  "properties": {},
  "additionalProperties": false
}
```

---

## 4. Employee Management Tools (`mcp_emp_*`)

### `mcp_emp_create`
- **Description**: Provisions an employee record with status ONBOARDING inside an ACID transaction.
- **Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "firstName": { "type": "string" },
    "lastName": { "type": "string" },
    "workEmail": { "type": "string", "format": "email" },
    "departmentId": { "type": "string", "pattern": "^[0-9a-fA-F]{24}$" },
    "designationId": { "type": "string", "pattern": "^[0-9a-fA-F]{24}$" },
    "locationId": { "type": "string", "pattern": "^[0-9a-fA-F]{24}$" },
    "shiftId": { "type": "string", "pattern": "^[0-9a-fA-F]{24}$" },
    "managerId": { "type": "string", "pattern": "^[0-9a-fA-F]{24}$" },
    "joinDate": { "type": "string", "format": "date" }
  },
  "required": ["firstName", "lastName", "departmentId", "designationId", "locationId", "shiftId", "joinDate"],
  "additionalProperties": false
}
```

### `mcp_emp_list`
- **Description**: Retrieves paginated employee workforce records with filtering.
- **Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "status": { "type": "string" },
    "departmentId": { "type": "string" },
    "search": { "type": "string" },
    "page": { "type": "integer", "default": 1 },
    "limit": { "type": "integer", "default": 50 }
  },
  "additionalProperties": false
}
```

### `mcp_emp_change_status`
- **Description**: Transitions employee lifecycle status in accordance with the enterprise Status Transition Matrix.
- **Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "id": { "type": "string", "pattern": "^[0-9a-fA-F]{24}$" },
    "status": { "type": "string", "enum": ["ACTIVE", "SUSPENDED", "TERMINATED", "RESIGNED"] },
    "reason": { "type": "string" }
  },
  "required": ["id", "status"],
  "additionalProperties": false
}
```

### `mcp_emp_archive`
- **Description**: Soft-deletes an employee record, setting `isArchived: true` and preserving business status.
- **Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "id": { "type": "string", "pattern": "^[0-9a-fA-F]{24}$" },
    "archiveReason": { "type": "string" }
  },
  "required": ["id"],
  "additionalProperties": false
}
```

### `mcp_emp_restore`
- **Description**: Restores a soft-deleted employee record, clearing archival metadata.
- **Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "id": { "type": "string", "pattern": "^[0-9a-fA-F]{24}$" }
  },
  "required": ["id"],
  "additionalProperties": false
}
```
