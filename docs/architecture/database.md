# Database Architecture & Multi-Tenancy Design

*Synchronized with Backend Architecture (M-01 + M-02 + M-03 + M-04)*
## Overview

NexusOps implements a **Shared Database, Shared Schema** multi-tenant model built on MongoDB Atlas. Data isolation is structurally enforced at the repository and middleware layers, preventing cross-tenant data leakage.

## 1. Multi-Tenant Data Boundary (`organizationId`)

1. Every MongoDB schema (except the global `Organization` master table) includes an indexed `organizationId` field.
2. The `tenant.js` middleware extracts `req.user.organizationId` and binds it to `req.tenantContext`.
3. The abstract `BaseRepository` automatically injects `{ organizationId: req.tenantContext.organizationId }` into all database queries.

## 2. Collection Schemas & Indexing

Key schema fields and indexing strategies are strictly maintained. Do NOT create MongoDB collections manually. Use Mongoose schemas to manage collection lifecycles and `migrate-mongo` for transformations.

### Organization (`organizations`)
- **Purpose**: Master tenant profile and configurations.
- **Fields**: `name`, `code`, `domain`, `status`.
- **Indexes**: `code` (unique), `domain` (index).
- **Relationships**: None (root entity).
- **Ownership**: Global.
- **Tenant Isolation**: N/A (this is the tenant entity).
- **Lifecycle**: Created during onboarding, marked inactive on churn.
- **Audit**: `TENANT_PROVISIONED`, `TENANT_UPDATED`.
- **Transactions**: Created inside atomic onboarding transactions.
- **Cache**: Settings cached in Redis.

### User (`users`)
- **Purpose**: Authentication credentials and RBAC profile.
- **Fields**: `organizationId`, `email`, `passwordHash`, `status`, `failedLoginAttempts`, `lockoutUntil`.
- **Indexes**: `{ organizationId: 1, email: 1 }` (unique).
- **Relationships**: `organizationId` &rarr; Organization.
- **Ownership**: Tenant.
- **Tenant Isolation**: `organizationId` enforced.
- **Lifecycle**: Created during invitation redemption.
- **Audit**: `USER_CREATED`, `USER_LOCKED`, `USER_SUSPENDED`.
- **Transactions**: Linked to `UserRole` creation.
- **Cache**: Session data cached in Upstash Redis.

### Role (`roles`)
- **Purpose**: Dynamic RBAC roles.
- **Fields**: `organizationId`, `name`, `permissions`, `isSystem`, `description`.
- **Indexes**: `{ organizationId: 1, name: 1 }` (unique).
- **Relationships**: `organizationId` &rarr; Organization.
- **Ownership**: Tenant.
- **Tenant Isolation**: `organizationId` enforced.
- **Lifecycle**: Seeded during bootstrap; custom roles added by admins.
- **Audit**: `ROLE_CREATED`, `ROLE_UPDATED`, `ROLE_DELETED`.
- **Transactions**: Standard repository execution.
- **Cache**: `rbac:<orgId>:<userId>` invalidation on update.

### Permission (Constants)
- **Purpose**: System-defined capabilities (`namespace.action`).
- **Fields**: Not a MongoDB collection. Defined in `src/core/constants/permissions/`.
- **Relationships**: Assigned to Roles.
- **Lifecycle**: Hardcoded in source, frozen on deployment.

### UserRole (`user_roles`)
- **Purpose**: Many-to-many binding of Users to Roles.
- **Fields**: `organizationId`, `userId`, `roleId`.
- **Indexes**: `{ organizationId: 1, userId: 1, roleId: 1 }` (unique).
- **Relationships**: `userId` &rarr; User, `roleId` &rarr; Role.
- **Ownership**: Tenant.
- **Tenant Isolation**: `organizationId` enforced.
- **Audit**: `ROLE_ASSIGNED`, `ROLE_REVOKED`.
- **Transactions**: Created atomically with User during registration.
- **Cache**: Invalidation of RBAC cache on change.

### Invite (`invitations`)
- **Purpose**: Cryptographic invitation workflow.
- **Fields**: `organizationId`, `email`, `tokenHash`, `targetRoles`, `expiresAt`, `status`, `invitedBy`.
- **Indexes**: `tokenHash` (unique), `expiresAt` (TTL index).
- **Relationships**: `invitedBy` &rarr; User.
- **Ownership**: Tenant.
- **Tenant Isolation**: `organizationId` enforced.
- **Lifecycle**: Created by admin, transitions to `ACCEPTED` or `REVOKED`.
- **Audit**: `INVITATION_CREATED`, `INVITATION_ACCEPTED`.
- **Transactions**: Atomic transition upon user registration.
- **Cache**: None.

### Department (`departments`)
- **Purpose**: Structural hierarchy and cost centers.
- **Fields**: `organizationId`, `name`, `code`, `parentCode`, `path`, `managerId`, `isActive`.
- **Indexes**: `{ organizationId: 1, code: 1 }` (unique).
- **Relationships**: `parentCode` &rarr; Department, `managerId` &rarr; User.
- **Ownership**: Tenant.
- **Tenant Isolation**: `organizationId` enforced.
- **Lifecycle**: Hierarchy materialized path updated on move.
- **Audit**: `DEPARTMENT_CREATED`, `DEPARTMENT_MOVED`.
- **Transactions**: Path rebuilds use transactions.
- **Cache**: `departmentTree:<orgId>` invalidation on change.

### RefreshToken (`refreshtokens`)
- **Purpose**: JWT rotation and session persistence.
- **Fields**: `organizationId`, `userId`, `token`, `expiresAt`, `deviceInfo`, `isRevoked`.
- **Indexes**: `token` (unique), `expiresAt` (TTL index).
- **Relationships**: `userId` &rarr; User.
- **Ownership**: Tenant.
- **Tenant Isolation**: `organizationId` enforced.
- **Lifecycle**: Created on login, deleted on logout or rotation.
- **Audit**: `SESSION_REVOKED`.
- **Transactions**: None.
- **Cache**: Synced with Upstash Redis sessions.

### AuditLog (`audit_logs`)
- **Purpose**: Immutable compliance ledger.
- **Fields**: `organizationId`, `actorId`, `action`, `entityType`, `entityId`, `payload`, `timestamp`.
- **Indexes**: `{ organizationId: 1, entityType: 1 }`, `timestamp`.
- **Relationships**: `actorId` &rarr; User.
- **Ownership**: Tenant.
- **Tenant Isolation**: `organizationId` enforced.
- **Lifecycle**: **Append-only.** Pre-save hooks prevent mutation or deletion.
- **Audit**: N/A (this is the audit log).
- **Transactions**: Part of every major state-change transaction.
- **Cache**: None.

## 3. Transaction Safety

Multi-document operations (e.g., organization onboarding, invitation redemption) MUST be executed inside Mongoose ClientSession transactions using the `runInTransaction(async (session) => { ... })` wrapper provided by `BaseRepository`.

## 4. M-03: Employee Management Collections

### Employee (`employees`)
- **Purpose**: Authoritative 360-degree workforce personnel record.
- **Fields**: `organizationId`, `userId`, `employeeCode`, `firstName`, `lastName`, `workEmail`, `joiningDate`, `status`, `departmentId`, `designationId`, `managerId`.
- **Indexes**: `{ organizationId: 1, employeeCode: 1 }` (unique), `{ organizationId: 1, workEmail: 1 }` (unique).
- **Relationships**: `organizationId` &rarr; Organization, `userId` &rarr; User, `departmentId` &rarr; Department, `managerId` &rarr; Employee.
- **Ownership**: Tenant.
- **Tenant Isolation**: `organizationId` enforced.
- **Lifecycle**: Seeded during onboarding, linked on user registration.
- **Audit**: `EMPLOYEE_CREATED`, `EMPLOYEE_UPDATED`, `EMPLOYEE_STATUS_CHANGED`.
- **Transactions**: Atomic linking during `INVITATION_ACCEPTED`.
- **State Machine**:
  - `ONBOARDING` &rarr; `INVITED` &rarr; `ACTIVE`
  - `ACTIVE` &rarr; `SUSPENDED` | `TERMINATED` | `RESIGNED`
  - *Rollback:* Cannot revert from `TERMINATED` to `ACTIVE` without a formal Re-hire transaction.

### EmploymentHistory (`employment_history`)
- **Purpose**: Immutable ledger of all role, salary, and title changes.
- **Fields**: `organizationId`, `employeeId`, `effectiveDate`, `type`, `previousValue`, `newValue`.
- **Indexes**: `{ organizationId: 1, employeeId: 1, effectiveDate: -1 }`.
- **Relationships**: `employeeId` &rarr; Employee.
- **Ownership**: Tenant.
- **Tenant Isolation**: `organizationId` enforced.

## 5. M-04: Recruitment Management Collections

### Candidate & CandidateProfile (`candidates`, `candidate_profiles`)
- **Purpose**: Applicant pool tracking and detailed profiles.
- **Fields**: `organizationId`, `email`, `passwordHash`, `status`, `firstName`, `lastName`, `phone`, `skills`, `experience`.
- **Indexes**: `{ organizationId: 1, email: 1 }` (unique).
- **Relationships**: None directly, linked to by JobApplications.
- **Ownership**: Tenant.
- **Tenant Isolation**: `organizationId` enforced.
- **State Machine**: `ACTIVE` &harr; `LOCKED`.

### JobRequisition (`job_requisitions`)
- **Purpose**: Internal headcount approval workflow.
- **Fields**: `organizationId`, `title`, `departmentId`, `hiringManagerId`, `headcount`, `status`, `approvalStatus`.
- **Indexes**: `{ organizationId: 1, title: 1 }`.
- **Relationships**: `departmentId` &rarr; Department, `hiringManagerId` &rarr; Employee.
- **State Machine (status)**: `DRAFT` &rarr; `ACTIVE` &rarr; `ON_HOLD` | `CLOSED` | `ARCHIVED`
- **State Machine (approvalStatus)**: `DRAFT` &rarr; `PENDING_APPROVAL` &rarr; `APPROVED` | `REJECTED`

### JobPosting (`job_postings`)
- **Purpose**: Public-facing job advertisement.
- **Fields**: `organizationId`, `requisitionId`, `title`, `description`, `status`.
- **Relationships**: `requisitionId` &rarr; JobRequisition.
- **State Machine**: `UNPUBLISHED` &rarr; `PUBLISHED` &rarr; `EXPIRED` | `CLOSED`

### JobApplication (`job_applications`)
- **Purpose**: Ties a Candidate to a specific JobRequisition.
- **Fields**: `organizationId`, `candidateId`, `requisitionId`, `status`, `currentStageId`.
- **Relationships**: `candidateId` &rarr; Candidate, `requisitionId` &rarr; JobRequisition.
- **State Machine**: 
  - `APPLIED` &rarr; `SCREENING` &rarr; `INTERVIEW` &rarr; `OFFER` &rarr; `HIRED`
  - *Terminal States:* `REJECTED`, `WITHDRAWN`.

### Interview (`interviews`)
- **Purpose**: Scheduling and feedback for candidates.
- **Fields**: `organizationId`, `applicationId`, `interviewers`, `scheduledAt`, `status`, `verdict`.
- **Relationships**: `applicationId` &rarr; JobApplication, `interviewers` &rarr; Employee.
- **State Machine**: `SCHEDULED` &rarr; `COMPLETED` | `CANCELLED` | `NO_SHOW`

### Offer (`offers`)
- **Purpose**: Formal employment proposals.
- **Fields**: `organizationId`, `applicationId`, `salary`, `status`, `expiresAt`.
- **Relationships**: `applicationId` &rarr; JobApplication.
- **State Machine**: `DRAFT` &rarr; `SENT` &rarr; `PENDING_RESPONSE` &rarr; `ACCEPTED` | `DECLINED` | `WITHDRAWN` | `EXPIRED`

### Supporting Recruitment Collections
- **RequisitionHistory, ApplicationHistory**: Audit ledgers for stage transitions.
- **ApprovalInstance, ApprovalWorkflowTemplate**: Multi-tier approval routing.
- **ApplicationStageInstance, ApplicationWorkflowInstance**: ATS pipeline templates.
- **CandidateDocument**: Resumes and portfolios.

## 6. Attendance & Time Tracking (M-04 & M-05)

### Attendance Record (`attendancerecords`)
- **Purpose**: Daily timeline and aggregated hours per employee.
- **Fields**: `organizationId`, `employeeId`, `date`, `shiftId`, `status`, `workflowStatus`, `calculatedHours`, `attendanceEvents`.
- **Dual Status**: `status` (System calculated) and `workflowStatus` (Manager approved state).
- **Embedded Documents**: `attendanceEvents` (Array of objects containing `eventId`, `eventType`, `originalTime`, `correctedTime`).

### Attendance Regularization (`attendanceregularizations`)
- **Purpose**: Employee requests to correct missed punches or partial days.
- **Fields**: `organizationId`, `employeeId`, `attendanceRecordId`, `targetEventId`, `type`, `status`, `reason`.
- **State Machine**: `PENDING` &rarr; `APPROVED` | `REJECTED` | `CANCELLED`.
- **Transaction Rule**: Approving a regularization must atomically modify the `AttendanceRecord` and emit an `EventBus` domain event.

### Attendance Policy (`attendancepolicies`)
- **Purpose**: Rules governing late thresholds, overtime, and regularization limits.
- **Fields**: `organizationId`, `locationId` (Optional override), `isDefault`, `rules`.
- **Inheritance Pattern**: Location-specific policies override Organization-default policies.

## 7. M-06: Leave Management Collections

### Leave Policy (`leavepolicies`)
- **Purpose**: Defines dynamic leave rules, accrual rates, min/max usage, and limits for an organization.
- **Fields**: `organizationId`, `name`, `code`, `type`, `annualAllowance`, `accrualFrequency`, `carryForwardRules`, `version`, `isActive`.
- **Versioning Rule**: Policies are strictly versioned. Modifications generate a new `version` (append-only) to preserve historical integrity.

### Leave Balance (`leavebalances`)
- **Purpose**: Tracks the current, real-time accrued and pending leave balances per employee.
- **Fields**: `organizationId`, `employeeId`, `year`, `balances` (array of `code`, `totalAllocated`, `accrued`, `used`, `pending`, `carryForward`).
- **Indexes**: `{ organizationId: 1, employeeId: 1, year: 1 }` (unique).
- **Concurrency Guard**: Always mutated inside transactions via `mutateBalanceWithLock` to prevent race conditions during concurrent approval.

### Leave Balance Ledger (`leavebalanceledgers`)
- **Purpose**: Immutable append-only audit trail for every single fractional balance mutation.
- **Fields**: `organizationId`, `employeeId`, `leavePolicyId`, `leavePolicyVersion`, `leaveCode`, `year`, `eventType`, `daysDelta`, `previousBalance`, `newBalance`, `referenceId`.
- **Lifecycle**: Pre-save hooks prevent mutation or deletion. Completely append-only.

### Leave Request (`leaverequests`)
- **Purpose**: Tracks employee leave applications and manager approval workflows.
- **Fields**: `organizationId`, `employeeId`, `leavePolicyId`, `leavePolicyVersion`, `leaveCode`, `startDate`, `endDate`, `totalDays`, `status`.
- **State Machine**: `PENDING` &rarr; `APPROVED` | `REJECTED` | `CANCELLED`.
- **Snapshot Integration**: Stores the exact `leavePolicyVersion` existing at the time of application.

### Leave Balance Snapshot (`leavebalancesnapshots`)
- **Purpose**: Point-in-time materialized views of employee balances aligned strictly with Payroll Cycles.
- **Fields**: `organizationId`, `employeeId`, `cycleIdentifier`, `snapshotDate`, `cycleStartDate`, `cycleEndDate`, `balances`.
- **Indexes**: `{ organizationId: 1, employeeId: 1, cycleIdentifier: 1 }` (unique).
- **Idempotency**: Handled via Upsert operations during the active payroll cycle.

### Holiday Calendar (`holidaycalendars`)
- **Purpose**: Tracks global and departmental non-working days.
- **Fields**: `organizationId`, `departmentId`, `year`, `holidays` (array), `workingWeek` (array of active days).

## 8. Future Modules (M-07+)
Future modules will introduce `Payroll` collections, all adhering to the strict `organizationId` and transaction patterns defined above.
