# MCP RBAC Role Tool Specification (`role-tools.md`)

## 1. `mcp_roles_get_system_permissions`
- **Purpose**: Lists all available atomic permission strings in the platform registry.
- **HTTP Mapping**: `GET /api/v1/roles/system-permissions`
- **Authentication**: Bearer JWT Required
- **Permission Required**: `role.read` or `role.create` or `role.update`
- **Input JSON Schema**: `{ "type": "object", "properties": {} }`

---

## 2. `mcp_roles_list`
- **Purpose**: Retrieves all role definitions within the authenticated organization.
- **HTTP Mapping**: `GET /api/v1/roles`
- **Authentication**: Bearer JWT Required
- **Permission Required**: `role.read` or `role.assign`
- **Input JSON Schema**: `{ "type": "object", "properties": {} }`

---

## 3. `mcp_roles_create`
- **Purpose**: Creates a custom RBAC role with granular permission strings.
- **HTTP Mapping**: `POST /api/v1/roles`
- **Authentication**: Bearer JWT Required
- **Permission Required**: `role.create`
- **Input JSON Schema**:
  ```json
  {
    "type": "object",
    "properties": {
      "name": { "type": "string", "minLength": 2 },
      "description": { "type": "string" },
      "permissions": { "type": "array", "items": { "type": "string" } },
      "priority": { "type": "integer" }
    },
    "required": ["name", "permissions"]
  }
  ```
- **Audit Logs Generated**: `ROLE_CREATED`.

---

## 4. `mcp_roles_update`
- **Purpose**: Updates permissions or metadata of a custom role.
- **HTTP Mapping**: `PUT /api/v1/roles/:id`
- **Authentication**: Bearer JWT Required
- **Permission Required**: `role.update`
- **Input JSON Schema**:
  ```json
  {
    "type": "object",
    "properties": {
      "id": { "type": "string" },
      "name": { "type": "string" },
      "description": { "type": "string" },
      "permissions": { "type": "array", "items": { "type": "string" } }
    },
    "required": ["id"]
  }
  ```
- **Business Rules**: System roles cannot be renamed or deleted.
- **Side Effects**: Invalidates Upstash Redis RBAC cache (`rbac:<orgId>:*`).
- **Audit Logs Generated**: `ROLE_UPDATED`.

---

## 5. `mcp_roles_duplicate`
- **Purpose**: Clones an existing role definition with a new name.
- **HTTP Mapping**: `POST /api/v1/roles/:id/duplicate`
- **Authentication**: Bearer JWT Required
- **Permission Required**: `role.create`
- **Input JSON Schema**: `{ "type": "object", "properties": { "id": { "type": "string" }, "name": { "type": "string" } }, "required": ["id", "name"] }`
- **Audit Logs Generated**: `ROLE_CREATED`.

---

## 6. `mcp_roles_delete`
- **Purpose**: Archives/deletes a custom role definition.
- **HTTP Mapping**: `DELETE /api/v1/roles/:id`
- **Authentication**: Bearer JWT Required
- **Permission Required**: `role.delete`
- **Input JSON Schema**: `{ "type": "object", "properties": { "id": { "type": "string" } }, "required": ["id"] }`
- **Side Effects**: Removes bindings in `UserRole` and invalidates RBAC/Delegation cache.
- **Audit Logs Generated**: `ROLE_DELETED`.

---

## 7. `mcp_roles_assign`
- **Purpose**: Grants an RBAC role to a target user account.
- **HTTP Mapping**: `POST /api/v1/roles/assign`
- **Authentication**: Bearer JWT Required
- **Permission Required**: `role.assign`
- **Input JSON Schema**:
  ```json
  {
    "type": "object",
    "properties": {
      "userId": { "type": "string" },
      "roleId": { "type": "string" }
    },
    "required": ["userId", "roleId"]
  }
  ```
- **Business Rules**: Enforces Role Delegation Policy via `RoleDelegationService.canAssignRoles`. Inviter cannot grant roles outside their allowed boundary.
- **Side Effects**: Invalidates `rbac:<orgId>:<userId>`.
- **Events Emitted**: `ROLE.ASSIGNED`.
- **Audit Logs Generated**: `ROLE_ASSIGNED`.

---

## 8. `mcp_roles_remove`
- **Purpose**: Revokes an RBAC role from a target user account.
- **HTTP Mapping**: `POST /api/v1/roles/remove`
- **Authentication**: Bearer JWT Required
- **Permission Required**: `role.assign`
- **Input JSON Schema**: `{ "type": "object", "properties": { "userId": { "type": "string" }, "roleId": { "type": "string" } }, "required": ["userId", "roleId"] }`
- **Side Effects**: Invalidates `rbac:<orgId>:<userId>`.
- **Audit Logs Generated**: `ROLE_REMOVED`.
