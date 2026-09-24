> **Orchestration Workflows** | Version: 2.0 | REST API is the single source of truth

# AI Tool & Endpoint Selection Guide

This guide instructs the AI orchestrator on **which REST endpoint to call** for a specific user intent, and **why** — including what lookup data must be resolved first, what permissions are required, and which failure cases to anticipate.

> [!IMPORTANT]
> The canonical schema for every endpoint is the OpenAPI specification at `docs/openapi/openapi.yaml`. For MCP-based consumption, see `docs/mcp/`. Frontend integration documentation is in `docs/frontend-api/`.

---

## 1. Onboarding a New Employee

**Prompt Intent:** *"Invite John Doe to the company as an HR Manager."*

**Reasoning:** Two-phase workflow — invite first, employee profile is created automatically after token redemption.

**Endpoint Sequence:**
1. `GET /api/v1/roles`
   - **Why:** Resolve the exact MongoDB `_id` for the "HR Manager" role. The invitation endpoint requires `roleIds`, not string names.
2. `POST /api/v1/invites`
   - **Why:** Creates the cryptographic invitation, triggers email dispatch, and associates the target roles.
   - **Body:** `{ "email": "john@company.com", "roleIds": ["<hr_role_id>"] }`
   - **Permission:** `invite.create`
   - **Watch for:** `403` if the actor cannot delegate the HR Manager role. `409` if the email already has a pending invitation.

---

## 2. Creating an Employee Profile (M-03 Manual Onboarding)

**Prompt Intent:** *"Add John Doe (EMP101) to the Engineering department as a Senior Software Engineer."*

**Reasoning:** Creates a managed employee record without sending an invitation.

**Endpoint Sequence:**
1. `GET /api/v1/departments` — resolve "Engineering" `_id`.
2. `GET /api/v1/designations` — resolve "Senior Software Engineer" `_id`.
3. `GET /api/v1/locations` — resolve mandatory location assignment.
4. `GET /api/v1/shifts` — resolve mandatory shift assignment.
5. `POST /api/v1/employees`
   - **Permission:** `user.create`
   - **Body:** `{ "employeeCode": "EMP101", "firstName": "John", "lastName": "Doe", "departmentId": "...", "designationId": "...", ... }`
   - **Watch for:** `409` if `employeeCode` is not unique per org.

---

## 3. Managing Department Hierarchy

**Prompt Intent:** *"Create an Engineering department under the existing Technology group."*

**Endpoint Sequence:**
1. `GET /api/v1/departments/options`
   - **Why:** Resolve the string "Technology group" to its exact `parentCode` (e.g., `"TECH"`).
2. `POST /api/v1/departments`
   - **Permission:** `department.create`
   - **Body:** `{ "name": "Engineering", "code": "ENG", "parentCode": "TECH" }`
   - **Watch for:** `409` if code already exists.

**Prompt Intent:** *"Move the DevOps department under Infrastructure."*
1. `GET /api/v1/departments/options` — resolve both department codes.
2. `POST /api/v1/departments/:id/move` — execute structural move.
   - **Permission:** `department.manage_hierarchy`
   - **Watch for:** `400` if the move would create a circular dependency.

---

## 4. Promoting a User (Role Assignment)

**Prompt Intent:** *"Promote Mike to Department Manager."*

**Endpoint Sequence:**
1. `GET /api/v1/employees?search=Mike` — resolve Mike's `userId`.
2. `GET /api/v1/roles` — resolve the `_id` for "Department Manager".
3. `POST /api/v1/roles/assign`
   - **Permission:** `role.assign`
   - **Body:** `{ "userId": "<mike_user_id>", "roleId": "<dept_manager_role_id>" }`
   - **Watch for:** `403` if `RoleDelegationService` blocks the assignment.

---

## 5. Modifying Enterprise Delegation Policy

**Prompt Intent:** *"Allow HR Managers to assign the Intern role."*

**Endpoint Sequence:**
1. `GET /api/v1/roles` — resolve `_id` for source role ("HR Manager") and target role ("Intern").
2. `POST /api/v1/role-delegation-policies`
   - **Permission:** `role.assign` or `role.create`
   - **Body:** `{ "sourceRoleId": "<hr_manager_id>", "targetRoleId": "<intern_id>" }`
   - **Watch for:** `409` if the exact policy already exists.

---

## 6. Employee Lifecycle Transitions

**Status transitions follow a strict legal matrix. Always use semantic endpoints.**

| Desired Action | Correct Endpoint | Permission |
|---|---|---|
| Archive (soft-delete) | `POST /api/v1/employees/:id/archive` | `user.archive` |
| Restore archived employee | `POST /api/v1/employees/:id/restore` | `user.restore` |
| Change employment status | `PUT /api/v1/employees/:id/status` | `user.change_status` |
| Change reporting manager | `PUT /api/v1/employees/:id/manager` | `user.change_manager` |
| Send system access invite | `POST /api/v1/employees/:id/invite` | `user.invite` |

> [!WARNING]
> Never attempt to change employee status via `PATCH /api/v1/employees/:id/profile`. That endpoint is for metadata updates only. Status transitions are validated against the legal state machine server-side.

---

## 7. General Decision Rules

- **NEVER guess an ID.** Always execute a `GET` lookup to resolve string names to `_id` before any mutation.
- **Always use semantic endpoints.** E.g., use `POST /employees/:id/archive` rather than trying to PATCH `isArchived: true`.
- **Trust backend enforcement.** RBAC and delegation boundaries are enforced server-side. Handle `403` gracefully — do not attempt to pre-replicate permission logic in the orchestrator.
- **Check the OpenAPI spec for precise schema.** Field names, required fields, and validation rules for every endpoint are defined in `docs/openapi/openapi.yaml`.
