# Enterprise MCP Server Documentation & Verification

*Version 1.0 | Synchronized with Backend Architecture (M-01 + M-02 + M-03)*

## 1. Overview
The Model Context Protocol (MCP) layer enables autonomous AI agents, automated analytics workflows, and conversational assistants to securely interact with the Enterprise Workforce Management Platform backend.

Every tool exposed by the MCP server maps directly to an underlying HTTP REST API endpoint or domain service method. The MCP server enforces strict zero-trust multi-tenancy, dynamic RBAC authorization, role delegation boundaries, and immutable audit logging.

---

## 2. Architecture & Security Guarantees

```
[ AI Agent / MCP Client ]
         │
         ▼ (JSON-RPC 2.0 / Stdio or SSE)
[ Enterprise MCP Server Gateway ]
         │
         ▼ (Bearer JWT & Tenant Context Propagation)
[ Backend HTTP REST API v1 ] ──► [ Auth & RBAC Middleware ] ──► [ Domain Services & Repositories ]
```

### Key Security Rules for MCP Tools:
1. **Stateless Authentication**: Every MCP tool execution requires an active user access token passed via authentication headers or context parameters.
2. **Zero Tenant Leaking**: The tenant context (`organizationId`) is strictly derived from the authenticated token. AI agents can never pass or override `organizationId` arbitrarily.
3. **RBAC Verification**: Tools invoke backend endpoints protected by `hasPermission` or `hasAnyPermission` middleware. If the authenticated AI actor lacks the required capability string, a `403 Forbidden` error is returned.
4. **Audit Ledger**: All state mutations triggered by MCP tools generate immutable audit logs in the database.

---

## 3. Tool Inventory & Endpoint Mapping

The table below verifies the mapping between every MCP tool and its target HTTP REST API endpoint. This table is synchronized with the implemented endpoints across M-01, M-02, and M-03 and must be updated whenever a new endpoint is added.

| Module | MCP Tool Name | Target REST Endpoint | Required Permission |
|---|---|---|---|
| **Auth** | `mcp_auth_login` | `POST /api/v1/auth/login` | Public |
| **Auth** | `mcp_auth_refresh` | `POST /api/v1/auth/refresh` | Valid Refresh Token |
| **Auth** | `mcp_auth_register_invite` | `POST /api/v1/auth/register-invite` | Public (Valid Invite Token) |
| **Auth** | `mcp_auth_logout` | `POST /api/v1/auth/logout` | Valid Session |
| **Auth** | `mcp_auth_get_me` | `GET /api/v1/auth/me` | Valid Session |
| **Roles** | `mcp_roles_list` | `GET /api/v1/roles` | `role.read` |
| **Roles** | `mcp_roles_get_permissions` | `GET /api/v1/roles/system-permissions` | `role.read` |
| **Roles** | `mcp_roles_create` | `POST /api/v1/roles` | `role.create` |
| **Roles** | `mcp_roles_update` | `PUT /api/v1/roles/:id` | `role.update` |
| **Roles** | `mcp_roles_duplicate` | `POST /api/v1/roles/:id/duplicate` | `role.create` |
| **Roles** | `mcp_roles_delete` | `DELETE /api/v1/roles/:id` | `role.delete` |
| **Roles** | `mcp_roles_assign` | `POST /api/v1/roles/assign` | `role.assign` |
| **Roles** | `mcp_roles_remove` | `POST /api/v1/roles/remove` | `role.assign` |
| **Delegation** | `mcp_delegation_list` | `GET /api/v1/role-delegation-policies` | `role.read` / `role.assign` |
| **Delegation** | `mcp_delegation_create` | `POST /api/v1/role-delegation-policies` | `role.assign` |
| **Delegation** | `mcp_delegation_delete` | `DELETE /api/v1/role-delegation-policies/:id` | `role.assign` |
| **Invites** | `mcp_invites_validate` | `GET /api/v1/invites/validate/:token` | Public |
| **Invites** | `mcp_invites_create` | `POST /api/v1/invites` | `invite.create` |
| **Invites** | `mcp_invites_list` | `GET /api/v1/invites` | `invite.read` / `invite.create` |
| **Invites** | `mcp_invites_revoke` | `DELETE /api/v1/invites/:id` | `invite.revoke` |
| **Organization**| `mcp_org_create` | `POST /api/v1/organizations` | Public / Super Admin |
| **Organization**| `mcp_org_get_me` | `GET /api/v1/organizations/me` | Valid Session |
| **Departments** | `mcp_dept_create` | `POST /api/v1/departments` | `department.create` |
| **Departments** | `mcp_dept_list` | `GET /api/v1/departments` | `department.read` |
| **Departments** | `mcp_dept_tree` | `GET /api/v1/departments/tree` | `department.read` |
| **Departments** | `mcp_dept_options` | `GET /api/v1/departments/options` | `department.read` |
| **Departments** | `mcp_dept_get_by_id` | `GET /api/v1/departments/:id` | `department.read` |
| **Departments** | `mcp_dept_update` | `PUT /api/v1/departments/:id` | `department.update` |
| **Departments** | `mcp_dept_move` | `POST /api/v1/departments/:id/move` | `department.manage_hierarchy` |
| **Departments** | `mcp_dept_archive` | `DELETE /api/v1/departments/:id` | `department.delete` |
| **Designations**| `mcp_desig_create` | `POST /api/v1/designations` | `designation.create` |
| **Designations**| `mcp_desig_list` | `GET /api/v1/designations` | `designation.read` |
| **Designations**| `mcp_desig_get_by_id` | `GET /api/v1/designations/:id` | `designation.read` |
| **Designations**| `mcp_desig_update` | `PATCH /api/v1/designations/:id` | `designation.update` |
| **Designations**| `mcp_desig_archive` | `POST /api/v1/designations/:id/archive` | `designation.archive` |
| **Locations** | `mcp_loc_create` | `POST /api/v1/locations` | `location.create` |
| **Locations** | `mcp_loc_list` | `GET /api/v1/locations` | `location.read` |
| **Locations** | `mcp_loc_get_by_id` | `GET /api/v1/locations/:id` | `location.read` |
| **Locations** | `mcp_loc_update` | `PATCH /api/v1/locations/:id` | `location.update` |
| **Locations** | `mcp_loc_archive` | `POST /api/v1/locations/:id/archive` | `location.archive` |
| **Shifts** | `mcp_shift_create` | `POST /api/v1/shifts` | `shift.create` |
| **Shifts** | `mcp_shift_list` | `GET /api/v1/shifts` | `shift.read` |
| **Shifts** | `mcp_shift_get_by_id` | `GET /api/v1/shifts/:id` | `shift.read` |
| **Shifts** | `mcp_shift_update` | `PATCH /api/v1/shifts/:id` | `shift.update` |
| **Shifts** | `mcp_shift_archive` | `POST /api/v1/shifts/:id/archive` | `shift.archive` |
| **Holidays** | `mcp_holidays_get` | `GET /api/v1/locations/:locationId/holidays/:year` | `holiday.read` |
| **Holidays** | `mcp_holidays_set` | `PUT /api/v1/locations/:locationId/holidays/:year` | `holiday.update` |
| **Employees** | `mcp_emp_create` | `POST /api/v1/employees` | `user.create` |
| **Employees** | `mcp_emp_list` | `GET /api/v1/employees` | `user.read` |
| **Employees** | `mcp_emp_org_chart` | `GET /api/v1/employees/org-chart` | `user.read` |
| **Employees** | `mcp_emp_get_by_id` | `GET /api/v1/employees/:id` | `user.read` |
| **Employees** | `mcp_emp_update_profile` | `PATCH /api/v1/employees/:id/profile` | `user.update` |
| **Employees** | `mcp_emp_change_status` | `PUT /api/v1/employees/:id/status` | `user.change_status` |
| **Employees** | `mcp_emp_change_manager` | `PUT /api/v1/employees/:id/manager` | `user.change_manager` |
| **Employees** | `mcp_emp_invite` | `POST /api/v1/employees/:id/invite` | `user.invite` |
| **Employees** | `mcp_emp_archive` | `POST /api/v1/employees/:id/archive` | `user.archive` |
| **Employees** | `mcp_emp_restore` | `POST /api/v1/employees/:id/restore` | `user.restore` |

### Excluded Endpoints (No MCP Tool)

The backend provides 58 canonical REST API endpoints, of which 50 are exposed to the AI via MCP. The remaining endpoints are intentionally excluded for the following reasons:

| Endpoint | MCP Tool | Reason |
|---|---|---|
| `GET /health` | No | Infrastructure endpoint. Not useful for AI workflows. |
| `GET /role-assignment-policies` | No | Backward-compatibility alias for `/role-delegation-policies`. |
| `POST /role-assignment-policies` | No | Backward-compatibility alias. |
| `DELETE /role-assignment-policies/{id}` | No | Backward-compatibility alias. |
| `GET /departments/select-options` | No | UI-specific endpoint returning lightweight lists. The AI uses `/departments`. |
| `GET /auth/refresh` | No | Token rotation is handled by the frontend client/auth layer, not AI. |
| `POST /auth/logout` | No | Session management is handled by the client application. |
| `GET /auth/me` | No | Context injected automatically; AI does not need to query its own token state. |

---

## 4. MCP Schema Specifications
For detailed JSON schema definitions of input parameters and return types for each tool, see [tools.md](file:///d:/Programming/Intern/Xebia/MainProject/docs/mcp/tools.md).
