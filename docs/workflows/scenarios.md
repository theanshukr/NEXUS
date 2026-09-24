> **Orchestration Workflows** | Version: 2.0 | REST API is the single source of truth (M-01 to M-04)

# AI Orchestration Scenarios

This catalog documents realistic prompts that an enterprise administrator might submit to the NexusOps AI assistant, outlining the exact reasoning path and REST API call sequence the orchestrator should take.

> [!NOTE]
> All orchestration actions are executed by calling the HTTP REST API (`/api/v1/*`) directly with a valid Bearer JWT. The OpenAPI specification at `docs/openapi/openapi.yaml` is the canonical schema contract. MCP tools (`docs/mcp/`) wrap the same REST endpoints for programmatic agent consumption.

---

## Scenario 1: Provisioning a New Division

**User Prompt:** *"Create a new Engineering department under the existing Technology group. The code should be ENG."*

1. **Reasoning:** User wants to modify the organizational hierarchy.
2. **Lookup Steps:**
   - Call `GET /api/v1/departments/options` to resolve the string "Technology group" to its exact `parentCode` (e.g., `"TECH"`).
3. **Validation:**
   - Verify `code: "ENG"` doesn't already appear in the returned options list.
4. **Permission Checks:**
   - Verify active session token carries `department.create` permission.
5. **REST Call:**
   - `POST /api/v1/departments` with body `{ "name": "Engineering", "code": "ENG", "parentCode": "TECH" }`.
6. **Expected Result:**
   - Backend returns `201 Created`. AI summarizes success to the user.

---

## Scenario 2: Onboarding Automation

**User Prompt:** *"Invite sarah@company.com and give her the HR Manager role."*

1. **Reasoning:** User wants to onboard a new employee and grant them RBAC access.
2. **Lookup Steps:**
   - Call `GET /api/v1/roles` to look up the exact `_id` of the "HR Manager" role.
3. **Validation:** Ensure the email format is valid. Verify the inviting actor has `invite.create` permission.
4. **Permission Checks:**
   - Backend `RoleDelegationService` will inherently verify if the actor can assign the HR Manager role. No pre-flight delegation check is needed by the AI — trust the 403 response.
5. **REST Call:**
   - `POST /api/v1/invites` with body `{ "email": "sarah@company.com", "roleIds": ["<hr_role_id>"] }`.
6. **Expected Result:**
   - Backend returns `201 Created`. AI confirms the invitation was dispatched.

---

## Scenario 3: Policy Enforcement Prevention (Negative Flow)

**User Prompt:** *"Assign the Super Admin role to the new intern."*

1. **Reasoning:** User wants to escalate an existing user's roles.
2. **Lookup Steps:**
   - Call `GET /api/v1/employees?search=intern` to resolve the target employee's `userId`.
   - Call `GET /api/v1/roles` to resolve "Super Admin" `_id`.
3. **Validation:** IDs successfully resolved.
4. **REST Call:**
   - `POST /api/v1/roles/assign` with body `{ "userId": "<intern_user_id>", "roleId": "<super_admin_role_id>" }`.
5. **Expected Result:**
   - **Backend Enforcement:** `RoleDelegationService` intercepts the request. The current actor (e.g., HR Manager) does not hold a delegation policy permitting them to grant "Super Admin".
   - Backend returns `403 Forbidden`. The AI orchestrator catches the error response, reads the `message` field (`"Delegation policy violation"`), and respectfully informs the user they lack authorization to grant that role.

---

## Scenario 4: Employee Onboarding & Linking (M-03)

**User Prompt:** *"Onboard employee John Doe (EMP101) into the Engineering department as a Senior Software Engineer, then send him an invitation to register."*

1. **Reasoning:** Two-step operation: create an M-03 employee profile, then trigger an M-01 invitation.
2. **Lookup Steps:**
   - Call `GET /api/v1/departments` to resolve "Engineering" `_id`.
   - Call `GET /api/v1/designations` to resolve "Senior Software Engineer" `_id`.
   - Call `GET /api/v1/locations` and `GET /api/v1/shifts` to resolve mandatory assignment IDs.
3. **Validation:** Ensure `employeeCode: "EMP101"` and work email are valid and unique.
4. **Permission Checks:**
   - Verify active session holds both `user.create` and `user.invite`.
5. **REST Call Sequence:**
   - Step 1: `POST /api/v1/employees` with `{ "employeeCode": "EMP101", "firstName": "John", "lastName": "Doe", "workEmail": "john@company.com", ... }`. Save the returned employee `id`.
   - Step 2: `POST /api/v1/employees/:id/invite` with `{ "roleIds": ["<standard_employee_role_id>"] }`.
6. **Expected Result:**
   - Step 1 creates employee in `ONBOARDING` status. Step 2 issues an M-01 invitation and transitions employee to `INVITED`. When John redeems the token via `POST /api/v1/auth/register-invite`, the backend automatically links his user account (`employee.userId = createdUser._id`), transitions him to `ACTIVE`, and emits `EVENTS.EMPLOYEE.USER_LINKED`.

---

## Scenario 5: Department Restructuring

**Orchestration sequence:**
1. `GET /api/v1/departments/options` — resolve source and target department codes.
2. `POST /api/v1/departments/:id/move` — execute the structural move.
3. `GET /api/v1/departments/tree` — confirm the new hierarchy.

---

## Scenario 6: Role Changes

**Orchestration sequence:**
1. `GET /api/v1/roles` — list available roles.
2. `POST /api/v1/roles` — create new custom role.
3. `PUT /api/v1/roles/:id` — update role permissions.
4. `POST /api/v1/roles/assign` — assign role to user.

---

## Scenario 7: Full Invitation Flow

**Orchestration sequence:**
1. `GET /api/v1/roles` — resolve target role IDs.
2. `POST /api/v1/invites` — create the invitation.
3. `GET /api/v1/invites/validate/:token` — validate token on registration form load.
4. `POST /api/v1/auth/register-invite` — complete registration.

---

## Scenario 8: Organization Setup (New Tenant)

**Orchestration sequence:**
1. `POST /api/v1/organizations` — provision tenant, receive initial Super Admin JWT.
2. `POST /api/v1/locations` — create primary office location.
3. `POST /api/v1/departments` — seed root department structure.
4. `POST /api/v1/designations` — seed job title taxonomy.
5. `POST /api/v1/shifts` — configure work schedule patterns.

---

## Scenario 9: Permission Delegation Management

**Orchestration sequence:**
1. `GET /api/v1/roles` — resolve source and target role IDs.
2. `GET /api/v1/role-delegation-policies` — review existing delegation boundaries.
3. `POST /api/v1/role-delegation-policies` — create new delegation rule.

---

## Scenario 10: Complete Recruitment Flow

**Orchestration sequence:**
1. `POST /api/v1/requisitions` — create job requisition for a specific role and department.
2. `POST /api/v1/requisitions/:id/approve` — secure necessary approvals for the requisition.
3. `POST /api/v1/requisitions/:id/publish` — publish the requisition to external boards as a Job Posting.
4. `POST /api/v1/applications` — candidate applies to the job posting.
5. `PUT /api/v1/applications/:id/stage` — advance candidate through screening and interview stages.
6. `POST /api/v1/offers` — generate formal offer upon successful interviews.
7. `POST /api/v1/candidate/offers/:id/accept` — candidate accepts offer, triggering automatic Employee profile creation (`CANDIDATE.HIRED`).

---

## General Orchestration Rules

- **Never guess an ID.** If a user provides a string name (e.g., "Engineering", "HR Manager", "Sarah"), execute a `GET` lookup first to resolve the name to its MongoDB `_id` BEFORE calling any mutative operation.
- **Trust the backend.** RBAC and delegation checks are enforced server-side. An orchestrator should always let the request proceed and handle `403 Forbidden` gracefully rather than attempting to pre-replicate all permission logic.
- **Always prefer semantic endpoints.** Use `POST /api/v1/employees/:id/archive` over trying to PATCH an employee to archived status.