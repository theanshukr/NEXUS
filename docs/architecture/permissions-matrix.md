> **Architecture Reference** | Version: 2.0 | Synchronized with M-01 + M-02 + M-03 + M-04 implementation

# RBAC Permission & Authorization Matrix

This matrix maps every REST endpoint to the required permissions, enforcement rules, and expected HTTP error behavior. AI orchestrators and frontend clients should consult this matrix to anticipate authorization outcomes before executing requests.

> [!NOTE]
> **Super Admin (`*` permission) bypasses all rows.** Any actor holding the wildcard `*` permission bypasses both static RBAC checks AND dynamic `RoleDelegationPolicy` checks.

---

## Organizations

| REST Endpoint | Required Permission | Allowed Roles (Seeded) | HTTP on Deny | Notes |
|---|---|---|---|---|
| `POST /organizations` | Public | Public | `400` | Creates root tenant. Returns initial Super Admin JWT. |
| `GET /organizations/me` | Valid Session | All Users | `401` | Returns `404` if tenant is inactive/suspended. |

---

## Authentication

| REST Endpoint | Required Permission | Allowed Roles | HTTP on Deny | Notes |
|---|---|---|---|---|
| `POST /auth/login` | Public | Public | `401` / `423` | `423` on account locked (5 failed attempts). |
| `POST /auth/refresh` | Valid Refresh Token | All Users | `401` | Token must exist in Redis. |
| `POST /auth/register-invite` | Public (valid invite token) | Public | `400/403` | Requires cryptographic invite token. Wraps ACID transaction. |
| `POST /auth/logout` | Valid Session | All Users | `401` | Purges Redis session and refresh token. |
| `GET /auth/me` | Valid Session | All Users | `401` | Returns current user identity and roles. |

---

## Departments

| REST Endpoint | Required Permission | Allowed Roles (Seeded) | HTTP on Deny | Notes |
|---|---|---|---|---|
| `POST /departments` | `department.create` | Super Admin, Admin, HR | `403` | Code must be unique per org. Parent must be active. |
| `GET /departments` | `department.read` | All Users | `403` | Returns flat paginated list. |
| `GET /departments/tree` | `department.read` | All Users | `403` | Returns nested graph. Highly cached. |
| `GET /departments/select-options` | `department.read` | All Users | `403` | Lightweight select list for forms. |
| `GET /departments/options` | `department.read` | All Users | `403` | Alias of select-options. |
| `GET /departments/:id` | `department.read` | All Users | `403` | Returns single department. |
| `PUT /departments/:id` | `department.update` | Super Admin, Admin, HR, Manager | `403` | Cannot mutate immutable `code`. |
| `POST /departments/:id/move` | `department.manage_hierarchy` | Super Admin, Admin, HR | `403` | Blocks circular dependencies (parent cannot be descendant). |
| `DELETE /departments/:id` | `department.delete` | Super Admin, Admin | `403` | Blocked if active children exist. |

---

## Roles & RBAC

| REST Endpoint | Required Permission | Allowed Roles (Seeded) | HTTP on Deny | Notes |
|---|---|---|---|---|
| `GET /roles` | `role.read` | All Users | `403` | Returns all org roles including system templates. |
| `GET /roles/system-permissions` | `role.read` | All Users | `403` | Lists all capability strings in the permission registry. |
| `POST /roles` | `role.create` | Super Admin, Admin | `403` | Cannot assign `*` unless actor holds `*`. |
| `PUT /roles/:id` | `role.update` | Super Admin, Admin | `403` | Cannot edit `isSystem=true` templates. |
| `POST /roles/:id/duplicate` | `role.create` | Super Admin, Admin | `403` | Clones permissions identically. |
| `DELETE /roles/:id` | `role.delete` | Super Admin | `403` | Cannot delete system roles or roles currently assigned to users. |
| `POST /roles/assign` | `role.assign` | Super Admin, Admin, HR | `403` | Blocked by `RoleDelegationPolicy` if actor lacks target delegation rights. |
| `POST /roles/remove` | `role.assign` | Super Admin, Admin, HR | `403` | Cannot remove the last role from an Owner. |

---

## Role Delegation

| REST Endpoint | Required Permission | Allowed Roles (Seeded) | HTTP on Deny | Notes |
|---|---|---|---|---|
| `GET /role-delegation-policies` | `role.read` or `role.assign` | Super Admin, Admin | `403` | Lists delegation policies scoped to the tenant. |
| `POST /role-delegation-policies` | `role.assign` or `role.create` | Super Admin, Admin | `403` | Prevents duplicate exact mapping. |
| `DELETE /role-delegation-policies/:id` | `role.assign` or `role.delete` | Super Admin, Admin | `403` | Reverts authorization boundary instantly. |

---

## Invitations

| REST Endpoint | Required Permission | Allowed Roles (Seeded) | HTTP on Deny | Notes |
|---|---|---|---|---|
| `GET /invites/validate/:token` | Public | Public | `403` | Fails if EXPIRED, REVOKED, or EXHAUSTED. |
| `POST /invites` | `invite.create` | Super Admin, Admin, HR | `403` | Blocked by `RoleDelegationPolicy` if target roles are out of bounds. |
| `GET /invites` | `invite.read` / `invite.create` | Super Admin, Admin, HR | `403` | Returns pending invitations for the tenant. |
| `DELETE /invites/:id` | `invite.revoke` | Super Admin, Admin, HR | `403` | Sets status to `REVOKED`. |

---

## Designations

| REST Endpoint | Required Permission | Allowed Roles (Seeded) | HTTP on Deny | Notes |
|---|---|---|---|---|
| `GET /designations` | `designation.read` | All Users | `403` | Paginated list. |
| `POST /designations` | `designation.create` | Super Admin, Admin, HR | `403` | Title must be unique per org. |
| `GET /designations/:id` | `designation.read` | All Users | `403` | — |
| `PATCH /designations/:id` | `designation.update` | Super Admin, Admin, HR | `403` | — |
| `POST /designations/:id/archive` | `designation.archive` | Super Admin, Admin | `403` | Soft-archive; blocks reassignment. |

---

## Locations

| REST Endpoint | Required Permission | Allowed Roles (Seeded) | HTTP on Deny | Notes |
|---|---|---|---|---|
| `GET /locations` | `location.read` | All Users | `403` | Paginated list. |
| `POST /locations` | `location.create` | Super Admin, Admin | `403` | — |
| `GET /locations/:id` | `location.read` | All Users | `403` | — |
| `PATCH /locations/:id` | `location.update` | Super Admin, Admin | `403` | — |
| `POST /locations/:id/archive` | `location.archive` | Super Admin, Admin | `403` | — |

---

## Shifts

| REST Endpoint | Required Permission | Allowed Roles (Seeded) | HTTP on Deny | Notes |
|---|---|---|---|---|
| `GET /shifts` | `shift.read` | All Users | `403` | Paginated list. |
| `POST /shifts` | `shift.create` | Super Admin, Admin | `403` | — |
| `GET /shifts/:id` | `shift.read` | All Users | `403` | — |
| `PATCH /shifts/:id` | `shift.update` | Super Admin, Admin | `403` | — |
| `POST /shifts/:id/archive` | `shift.archive` | Super Admin, Admin | `403` | — |

---

## Holiday Calendars

| REST Endpoint | Required Permission | Allowed Roles (Seeded) | HTTP on Deny | Notes |
|---|---|---|---|---|
| `GET /locations/:locationId/holidays/:year` | `holiday.read` | All Users | `403` | Returns holiday calendar for given location and year. |
| `PUT /locations/:locationId/holidays/:year` | `holiday.update` | Super Admin, Admin | `403` | Full calendar replacement for the given year. |

---

## Employees (M-03)

| REST Endpoint | Required Permission | Allowed Roles (Seeded) | HTTP on Deny | Notes |
> **Architecture Reference** | Version: 2.0 | Synchronized with M-01 + M-02 + M-03 + M-04 implementation

# RBAC Permission & Authorization Matrix

This matrix maps every REST endpoint to the required permissions, enforcement rules, and expected HTTP error behavior. AI orchestrators and frontend clients should consult this matrix to anticipate authorization outcomes before executing requests.

> [!NOTE]
> **Super Admin (`*` permission) bypasses all rows.** Any actor holding the wildcard `*` permission bypasses both static RBAC checks AND dynamic `RoleDelegationPolicy` checks.

---

## Organizations

| REST Endpoint | Required Permission | Allowed Roles (Seeded) | HTTP on Deny | Notes |
|---|---|---|---|---|
| `POST /organizations` | Public | Public | `400` | Creates root tenant. Returns initial Super Admin JWT. |
| `GET /organizations/me` | Valid Session | All Users | `401` | Returns `404` if tenant is inactive/suspended. |

---

## Authentication

| REST Endpoint | Required Permission | Allowed Roles | HTTP on Deny | Notes |
|---|---|---|---|---|
| `POST /auth/login` | Public | Public | `401` / `423` | `423` on account locked (5 failed attempts). |
| `POST /auth/refresh` | Valid Refresh Token | All Users | `401` | Token must exist in Redis. |
| `POST /auth/register-invite` | Public (valid invite token) | Public | `400/403` | Requires cryptographic invite token. Wraps ACID transaction. |
| `POST /auth/logout` | Valid Session | All Users | `401` | Purges Redis session and refresh token. |
| `GET /auth/me` | Valid Session | All Users | `401` | Returns current user identity and roles. |

---

## Departments

| REST Endpoint | Required Permission | Allowed Roles (Seeded) | HTTP on Deny | Notes |
|---|---|---|---|---|
| `POST /departments` | `department.create` | Super Admin, Admin, HR | `403` | Code must be unique per org. Parent must be active. |
| `GET /departments` | `department.read` | All Users | `403` | Returns flat paginated list. |
| `GET /departments/tree` | `department.read` | All Users | `403` | Returns nested graph. Highly cached. |
| `GET /departments/select-options` | `department.read` | All Users | `403` | Lightweight select list for forms. |
| `GET /departments/options` | `department.read` | All Users | `403` | Alias of select-options. |
| `GET /departments/:id` | `department.read` | All Users | `403` | Returns single department. |
| `PUT /departments/:id` | `department.update` | Super Admin, Admin, HR, Manager | `403` | Cannot mutate immutable `code`. |
| `POST /departments/:id/move` | `department.manage_hierarchy` | Super Admin, Admin, HR | `403` | Blocks circular dependencies (parent cannot be descendant). |
| `DELETE /departments/:id` | `department.delete` | Super Admin, Admin | `403` | Blocked if active children exist. |

---

## Roles & RBAC

| REST Endpoint | Required Permission | Allowed Roles (Seeded) | HTTP on Deny | Notes |
|---|---|---|---|---|
| `GET /roles` | `role.read` | All Users | `403` | Returns all org roles including system templates. |
| `GET /roles/system-permissions` | `role.read` | All Users | `403` | Lists all capability strings in the permission registry. |
| `POST /roles` | `role.create` | Super Admin, Admin | `403` | Cannot assign `*` unless actor holds `*`. |
| `PUT /roles/:id` | `role.update` | Super Admin, Admin | `403` | Cannot edit `isSystem=true` templates. |
| `POST /roles/:id/duplicate` | `role.create` | Super Admin, Admin | `403` | Clones permissions identically. |
| `DELETE /roles/:id` | `role.delete` | Super Admin | `403` | Cannot delete system roles or roles currently assigned to users. |
| `POST /roles/assign` | `role.assign` | Super Admin, Admin, HR | `403` | Blocked by `RoleDelegationPolicy` if actor lacks target delegation rights. |
| `POST /roles/remove` | `role.assign` | Super Admin, Admin, HR | `403` | Cannot remove the last role from an Owner. |

---

## Role Delegation

| REST Endpoint | Required Permission | Allowed Roles (Seeded) | HTTP on Deny | Notes |
|---|---|---|---|---|
| `GET /role-delegation-policies` | `role.read` or `role.assign` | Super Admin, Admin | `403` | Lists delegation policies scoped to the tenant. |
| `POST /role-delegation-policies` | `role.assign` or `role.create` | Super Admin, Admin | `403` | Prevents duplicate exact mapping. |
| `DELETE /role-delegation-policies/:id` | `role.assign` or `role.delete` | Super Admin, Admin | `403` | Reverts authorization boundary instantly. |

---

## Invitations

| REST Endpoint | Required Permission | Allowed Roles (Seeded) | HTTP on Deny | Notes |
|---|---|---|---|---|
| `GET /invites/validate/:token` | Public | Public | `403` | Fails if EXPIRED, REVOKED, or EXHAUSTED. |
| `POST /invites` | `invite.create` | Super Admin, Admin, HR | `403` | Blocked by `RoleDelegationPolicy` if target roles are out of bounds. |
| `GET /invites` | `invite.read` / `invite.create` | Super Admin, Admin, HR | `403` | Returns pending invitations for the tenant. |
| `DELETE /invites/:id` | `invite.revoke` | Super Admin, Admin, HR | `403` | Sets status to `REVOKED`. |

---

## Designations

| REST Endpoint | Required Permission | Allowed Roles (Seeded) | HTTP on Deny | Notes |
|---|---|---|---|---|
| `GET /designations` | `designation.read` | All Users | `403` | Paginated list. |
| `POST /designations` | `designation.create` | Super Admin, Admin, HR | `403` | Title must be unique per org. |
| `GET /designations/:id` | `designation.read` | All Users | `403` | — |
| `PATCH /designations/:id` | `designation.update` | Super Admin, Admin, HR | `403` | — |
| `POST /designations/:id/archive` | `designation.archive` | Super Admin, Admin | `403` | Soft-archive; blocks reassignment. |

---

## Locations

| REST Endpoint | Required Permission | Allowed Roles (Seeded) | HTTP on Deny | Notes |
|---|---|---|---|---|
| `GET /locations` | `location.read` | All Users | `403` | Paginated list. |
| `POST /locations` | `location.create` | Super Admin, Admin | `403` | — |
| `GET /locations/:id` | `location.read` | All Users | `403` | — |
| `PATCH /locations/:id` | `location.update` | Super Admin, Admin | `403` | — |
| `POST /locations/:id/archive` | `location.archive` | Super Admin, Admin | `403` | — |

---

## Shifts

| REST Endpoint | Required Permission | Allowed Roles (Seeded) | HTTP on Deny | Notes |
|---|---|---|---|---|
| `GET /shifts` | `shift.read` | All Users | `403` | Paginated list. |
| `POST /shifts` | `shift.create` | Super Admin, Admin | `403` | — |
| `GET /shifts/:id` | `shift.read` | All Users | `403` | — |
| `PATCH /shifts/:id` | `shift.update` | Super Admin, Admin | `403` | — |
| `POST /shifts/:id/archive` | `shift.archive` | Super Admin, Admin | `403` | — |

---

## Holiday Calendars

| REST Endpoint | Required Permission | Allowed Roles (Seeded) | HTTP on Deny | Notes |
|---|---|---|---|---|
| `GET /locations/:locationId/holidays/:year` | `holiday.read` | All Users | `403` | Returns holiday calendar for given location and year. |
| `PUT /locations/:locationId/holidays/:year` | `holiday.update` | Super Admin, Admin | `403` | Full calendar replacement for the given year. |

---

## Employees (M-03)

| REST Endpoint | Required Permission | Allowed Roles (Seeded) | HTTP on Deny | Notes |
|---|---|---|---|---|
| `POST /employees` | `user.create` | Super Admin, Admin, HR | `403` | Code unique per org. Initial status `ONBOARDING`. |
| `GET /employees` | `user.read` | All Users | `403` | Supports paginated keyword search. Excludes archived by default. |
| `GET /employees/org-chart` | `user.read` | All Users | `403` | Returns hierarchical reporting structure tree. |
| `GET /employees/:id` | `user.read` | All Users | `403` | Returns detailed employee profile with employment history. |
| `PATCH /employees/:id/profile` | `user.update` | Super Admin, Admin, HR, Manager | `403` | Strictly limited to editable profile metadata. No structural fields. |
| `PUT /employees/:id/status` | `user.change_status` | Super Admin, Admin, HR | `403` | Strictly enforced against legal status transition matrix. |
| `PUT /employees/:id/manager` | `user.change_manager` | Super Admin, Admin, HR | `403` | Blocks self-reporting and circular reporting chains. |
| `POST /employees/:id/invite` | `user.invite` | Super Admin, Admin, HR | `403` | Issues M-01 invitation and transitions status to `INVITED`. |
| `POST /employees/:id/archive` | `user.archive` | Super Admin, Admin | `403` | Soft-delete. Sets archival metadata. |
| `POST /employees/:id/restore` | `user.restore` | Super Admin, Admin | `403` | Clears archival metadata without altering underlying business status. |

---

## Attendance & Time Tracking (M-04 & M-05)

| REST Endpoint | Required Permission | Allowed Roles (Seeded) | HTTP on Deny | Notes |
|---|---|---|---|---|
| `POST /attendance/clock-in` | Authenticated User | All Employees | `401/403` | Captures biometrics, geofencing, IP. |
| `POST /attendance/clock-out` | Authenticated User | All Employees | `401/403` | Finalizes session and recalculates hours. |
| `GET /attendance/records` | `attendance.read` (or Self) | Super Admin, HR, Manager | `403` | Self-access is always permitted. Managers view direct reports. |
| `POST /attendance/regularizations` | Authenticated User | All Employees | `401/403` | Request corrections for missed punches or full days. |
| `GET /attendance/regularizations` | `attendance.regularization.read` (or Self) | Super Admin, HR, Manager | `403` | View regularization requests. |
| `POST /attendance/regularizations/:id/approve` | `attendance.regularization.approve` | Super Admin, HR, Manager | `403` | Approves and atomically corrects the timeline. |
| `POST /attendance/regularizations/:id/reject` | `attendance.regularization.approve` | Super Admin, HR, Manager | `403` | Rejects the request. |
| `POST /attendance-policies` | `attendance.policy.manage` | Super Admin, HR | `403` | Creates or updates organization/location policies. |

---

## Recruitment (M-04)

| REST Endpoint | Required Permission | Allowed Roles (Seeded) | HTTP on Deny | Notes |
|---|---|---|---|---|
| `POST /requisitions` | `recruitment.job.create` | Super Admin, Admin, HR | `403` | Initiates Job Requisition workflow. |
| `POST /requisitions/:id/approve` | `recruitment.job.approve` | Super Admin, Admin, HR | `403` | Advances approval tier. |
| `POST /requisitions/:id/publish` | `recruitment.job.publish` | Super Admin, Admin, HR | `403` | Creates Job Posting. |
| `POST /applications` | `recruitment.application.create` / Public | Super Admin, HR / Candidate | `403` | Links Candidate to Job Posting. |
| `PUT /applications/:id/stage` | `recruitment.application.move-stage` | Super Admin, Admin, HR | `403` | Advances ATS pipeline stage. |
| `POST /applications/:id/reject` | `recruitment.application.review` | Super Admin, Admin, HR | `403` | Marks Application as REJECTED. |
| `POST /offers` | `recruitment.offer.create` | Super Admin, Admin, HR | `403` | Creates formal Offer. |
| `POST /candidate/offers/:id/accept` | `Candidate Auth Token` | Candidate | `401/403` | Accepts Offer and triggers Employee creation. |

---

## Leave Management (M-06)

| REST Endpoint | Required Permission | Allowed Roles (Seeded) | HTTP on Deny | Notes |
|---|---|---|---|---|
| `GET /leave-policies` | `leave.policy.read` | All Users | `403` | View organization leave rules. |
| `POST /leave-policies` | `leave.policy.manage` | Super Admin, Admin, HR | `403` | Creates a new active policy version. |
| `GET /leave-requests` | `leave.request.read` (or Self) | Super Admin, Admin, HR, Manager | `403` | Self access allowed. Managers see reports. |
| `POST /leave-requests` | Authenticated User | All Employees | `401/403` | Submit a new leave application. |
| `POST /leave-requests/:id/approve` | `leave.request.approve` | Super Admin, Admin, HR, Manager | `403` | Manager hierarchy or HR approval. |
| `POST /leave-requests/:id/reject` | `leave.request.approve` | Super Admin, Admin, HR, Manager | `403` | Rejects the request. |
| `POST /leave-requests/:id/cancel` | Authenticated User | All Employees | `401/403` | Can only cancel if in future or pending. |
| `GET /leave-balances` | `leave.balance.read` (or Self) | Super Admin, Admin, HR, Manager | `403` | Returns live calculated balances. |
| `POST /leave-snapshots` | `leave.snapshot.run` | Super Admin, Admin, HR, Finance | `403` | Triggers a payroll-cycle snapshot upsert. |
| `GET /leave-snapshots` | `leave.snapshot.read` | Super Admin, Admin, HR, Finance | `403` | Views historical snapshots. |
| `POST /attendance/conflicts/:id/resolve` | `attendance.conflict.resolve` | Super Admin, Admin, HR | `403` | Resolves attendance vs leave overlap. |
| `GET /holiday-calendars` | `calendar.read` | All Users | `403` | Global and departmental calendars. |
| `POST /holiday-calendars` | `calendar.manage` | Super Admin, Admin, HR | `403` | Manage active working days and holidays. |

