# MCP Invitation Tool Specification (`invitation-tools.md`)

## 1. `mcp_invites_validate`
- **Purpose**: Verifies an onboarding invitation token and returns associated metadata (email, organization, target role IDs).
- **HTTP Mapping**: `GET /api/v1/invites/validate/:token`
- **Authentication**: Public
- **Input JSON Schema**: `{ "type": "object", "properties": { "token": { "type": "string" } }, "required": ["token"] }`
- **Business Rules**: Checks SHA-256 hash against `invitations` collection. Validates TTL expiration (default 7d) and checks that status is `PENDING`.

---

## 2. `mcp_invites_create`
- **Purpose**: Issues a cryptographic onboarding invitation to a new team member with pre-assigned target roles.
- **HTTP Mapping**: `POST /api/v1/invites`
- **Authentication**: Bearer JWT Required
- **Permission Required**: `invite.create`
- **Input JSON Schema**:
  ```json
  {
    "type": "object",
    "properties": {
      "email": { "type": "string", "format": "email" },
      "roleIds": { "type": "array", "items": { "type": "string" } },
      "employeeId": { "type": "string" }
    },
    "required": ["email", "roleIds"]
  }
  ```
- **Business Rules**: Enforces Role Delegation boundaries via `RoleDelegationService.canAssignRoles`. Inviter must be authorized to grant every requested roleId.
- **Events Emitted**: `USER.INVITED`, `EMPLOYEE.INVITED`.
- **Audit Logs Generated**: `INVITATION_CREATED`, `EMPLOYEE_INVITED`.

---

## 3. `mcp_invites_list`
- **Purpose**: Lists all pending, accepted, and revoked invitations in the organization.
- **HTTP Mapping**: `GET /api/v1/invites`
- **Authentication**: Bearer JWT Required
- **Permission Required**: `invite.read` or `invite.create`
- **Input JSON Schema**: `{ "type": "object", "properties": {} }`

---

## 4. `mcp_invites_revoke`
- **Purpose**: Cancels a pending invitation, preventing token redemption.
- **HTTP Mapping**: `DELETE /api/v1/invites/:id`
- **Authentication**: Bearer JWT Required
- **Permission Required**: `invite.delete` or `invite.create`
- **Input JSON Schema**: `{ "type": "object", "properties": { "id": { "type": "string" }, "reason": { "type": "string" } }, "required": ["id"] }`
- **Side Effects**: Sets status to `REVOKED`.
- **Events Emitted**: `USER.REVOKED`.
- **Audit Logs Generated**: `INVITATION_REVOKED`.
