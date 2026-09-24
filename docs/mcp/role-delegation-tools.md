# MCP Role Delegation Tool Specification (`role-delegation-tools.md`)

## 1. `mcp_delegation_list`
- **Purpose**: Lists all active role delegation policy rules (`sourceRoleId` $\longrightarrow$ `targetRoleId`) in the organization.
- **HTTP Mapping**: `GET /api/v1/role-delegation-policies`
- **Authentication**: Bearer JWT Required
- **Permission Required**: `role.read` or `role.assign`
- **Input JSON Schema**: `{ "type": "object", "properties": {} }`

---

## 2. `mcp_delegation_create`
- **Purpose**: Authorizes a source role to assign/grant a target role to other users.
- **HTTP Mapping**: `POST /api/v1/role-delegation-policies`
- **Authentication**: Bearer JWT Required
- **Permission Required**: `role.create` or `role.update` (or Super Admin `'*'`)
- **Input JSON Schema**:
  ```json
  {
    "type": "object",
    "properties": {
      "sourceRoleId": { "type": "string" },
      "targetRoleId": { "type": "string" }
    },
    "required": ["sourceRoleId", "targetRoleId"]
  }
  ```
- **Side Effects**: Invalidates Upstash Redis delegation cache (`roleDelegation:<orgId>:<sourceRoleId>`).
- **Audit Logs Generated**: `POLICY_CREATED`.

---

## 3. `mcp_delegation_delete`
- **Purpose**: Revokes a role delegation policy rule.
- **HTTP Mapping**: `DELETE /api/v1/role-delegation-policies/:id`
- **Authentication**: Bearer JWT Required
- **Permission Required**: `role.delete`
- **Input JSON Schema**: `{ "type": "object", "properties": { "id": { "type": "string" } }, "required": ["id"] }`
- **Side Effects**: Invalidates delegation cache.
- **Audit Logs Generated**: `POLICY_DELETED`.
