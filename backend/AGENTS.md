# 🤖 AI Development Guide & Backend Architecture Conventions (AGENTS.md)

This document serves as the **primary context document and strict architectural reference** for all AI assistants, automated tools, and developers contributing to the **Enterprise Workforce Management Platform** backend.

---

## 🏛️ 1. Project Overview

*   **Platform Name**: NexusOps – Enterprise Workforce Management Platform
*   **Architecture**: **Modular Monolith** designed for high-scale, multi-tenant B2B SaaS deployments.
*   **Backend Tech Stack**: Node.js (ES Modules), Express v5, MongoDB Atlas (Mongoose ODM with ACID Transactions), Upstash Redis (REST-based serverless caching), Pino structured logging, Zod validation, Vitest.
*   **Frontend Compatibility**: Built with agnostic JSON REST API v1 endpoints supporting Next.js, React, Android/iOS mobile apps, and enterprise integrations.
*   **AI-Ready Architecture**: Structured cleanly into feature-based domain modules with robust audit trails, schema validation, and stateless authorization, preparing the platform for upcoming AI MCP tools and automated workflows.

---

## 📂 2. Project Structure & Layered Architecture

### Directory Structure
```text
src/
├── api/          # HTTP API layer: versioned routers (v1) and global error handlers
├── modules/      # Domain business modules (auth, roles, invitations, organization, audit, users)
├── core/         # Shared enterprise primitives (BaseRepository, middleware, errors, utils)
├── platform/     # Infrastructure drivers (database connection, Redis cache client, Pino logger)
└── config/       # Validated startup configuration (envalid environment setup)
```

### Strict Layered Separation of Concerns
Follow the unidirectional dependency flow without exception:
$$\text{Routes} \longrightarrow \text{Controllers} \longrightarrow \text{Services} \longrightarrow \text{Repositories} \longrightarrow \text{Mongoose Models}$$

*   **Routes**: Strictly bind HTTP methods, URL paths, and middleware (`authenticate`, `requireTenant`, `hasPermission`, `validate`). Zero business logic.
*   **Controllers**: Thin HTTP orchestrators. Extract body/params/query, invoke domain services, format JSON HTTP responses, and catch errors.
*   **Services**: Encapsulate all application domain logic, workflows, calculations, transactional orchestration, and cache invalidation.
*   **Repositories**: Exclusively handle data access. Must extend `BaseRepository` to enforce tenant isolation and wrap Mongoose ODM queries. Services call repositories, **never** raw Mongoose models directly.

---

## 🔐 3. Authentication Foundation

*   **JWT & Access Tokens**: Short-lived stateless JSON Web Tokens signed with high-entropy secrets, carrying user identity, tenant scoping, and session IDs.
*   **Refresh Tokens**: Stored in MongoDB (`refreshtokens` collection) and cached in Upstash Redis (`refreshToken:<id>`). Used for automatic token rotation and session persistence.
*   **Session Caching**: Active sessions are indexed in Upstash Redis (`session:<userId>`). Logout deletes the Redis session key and revokes refresh tokens instantly.
*   **Brute-Force & Lockout Protection**: `UserRepository` tracks failed login attempts. Upon 5 consecutive failures, accounts transition to `LOCKED` status (`423 ERR_ACCOUNT_LOCKED`) with automatic cooldown timers or administrative unlock requirements.
*   **Suspension Enforcement**: Suspended accounts (`403 ERR_FORBIDDEN`) are blocked at both login and active session verification.

---

## 🏢 4. Multi-Tenancy & Zero-Trust Isolation

*   **`organizationId` Scoping**: Every tenant-scoped document MUST contain an indexed `organizationId` ObjectId reference.
*   **Context Propagation**: The JWT access token carries the active tenant context (`organizationId`), auto-injected into `req.user` and `req.tenantId` by security middleware.
*   **Automatic Query Scoping**: `BaseRepository` automatically intercepts database reads and writes, appending `{ organizationId }` to every query filter. Attempting to query a tenant-scoped model without an explicit `organizationId` throws a **Fatal Security Violation**.
*   **Zero URL Leaking**: Tenant IDs are never passed via public URL paths (e.g., avoid `/api/v1/:orgId/users`). The tenant context is strictly resolved from authentication headers or subdomain bindings.

---

## 🛡️ 5. Dynamic RBAC Engine

*   **Dynamic Roles**: Organizations can define unlimited custom roles (`Role` model) alongside seeded system templates (`Super Admin`, `Administrator`, `HR Manager`, `Finance Executive`, `Department Manager`, `Standard Employee`, `Intern`). Zero hardcoded role names in application logic.
*   **Dynamic Permissions**: Granular permission strings (e.g., `invite.create`, `role.assign`, `payroll.run`).
*   **Centralized Permission Registry**: All permission strings MUST be referenced via constants imported from `src/core/constants/permissions/` (e.g., `PERMISSIONS.USER.READ`, `PERMISSIONS.ROLE.CREATE`). Hardcoded permission strings are strictly prohibited in application logic, routes, middleware, and tests. In accordance with enterprise workforce platform conventions, the `user.*` namespace replaces historical employee references.
*   **Multiple Roles**: Users can be assigned multiple roles simultaneously via the `UserRole` binding collection. Effective permissions represent the union of all granted permissions.
*   **Wildcard Bypass**: The `'*'` permission string (held by Super Admins and Owners) grants universal access across all domain actions and bypasses granular permission checks.
*   **Evaluation & Caching**: `RbacService.getEffectivePermissions` computes permissions and caches the resulting set in Upstash Redis (`rbac:<orgId>:<userId>`). Cache is invalidated automatically upon role modification or assignment changes.

---

## ⚖️ 6. Enterprise Role Delegation Policy

### Why Role Delegation Exists
In enterprise organizations, holding administrative permissions does not grant unrestricted authority over the role hierarchy. A Department Manager should not be able to promote an employee to HR Manager or Super Admin.

### Permission vs. Delegation
*   **Permissions (`invite.create`, `role.assign`)** answer: *"Can this user execute the action of inviting or assigning a role?"*
*   **Role Delegation (`RoleDelegationPolicy`)** answers: *"Which specific target roles is this user authorized to grant to someone else?"*

### Architecture & Rules
*   **`RoleDelegationPolicy` Model**: Maps `sourceRoleId` $\longrightarrow$ `targetRoleId` within an organization.
*   **Enforcement**: Evaluated by `RoleDelegationService.canAssignRoles` during user onboarding, invitation creation, and role assignment. If an inviter attempts to grant a target role outside their allowed delegation boundaries, a `403 Forbidden` domain exception is thrown.
*   **Wildcard Bypass**: Users holding `'*'` permission bypass delegation boundaries.
*   **Default Seeding**: Seeded atomically during organization onboarding inside Mongoose ClientSession transactions:
    *   `Super Admin` $\longrightarrow$ All Roles
    *   `Administrator` $\longrightarrow$ Manager, Employee, Intern
    *   `Department Manager` $\longrightarrow$ Employee, Intern
    *   `HR Manager` $\longrightarrow$ Employee, Intern
*   **Caching**: Delegation rules are cached in Upstash Redis (`roleDelegation:<orgId>:<roleId>`) and invalidated automatically upon policy edits or role archival.

---

## ✉️ 7. Cryptographic Invitation Workflow

1.  **Create Invitation (`POST /api/v1/invites`)**: Inviter sends email and desired target roles.
2.  **Permission Check**: Middleware verifies inviter holds `invite.create` permission.
3.  **Role Delegation Check**: `RoleDelegationService` verifies inviter is authorized to grant every requested target role.
4.  **Token Generation**: Generates a high-entropy hex token, stores its SHA-256 hash in MongoDB (`invitations` collection) with automated TTL expiration (default 7 days).
5.  **Registration & Redemption**: Invitee opens invitation link, validates token (`GET /api/v1/invites/validate/:token`), and completes registration (`POST /api/v1/auth/register`).
6.  **Atomic Role Assignment**: Inside an ACID transaction, user account is created, invitation status transitions to `ACCEPTED`, and target roles are bound in `UserRole`.

---

## 💾 8. Repository Pattern & ACID Transactions

*   **`BaseRepository`**: All domain repositories inherit from `BaseRepository`. Provides standardized CRUD methods (`create`, `findByIdAndTenant`, `findManyAndTenant`, `updateByIdAndTenant`, `deleteByIdAndTenant`, `countAndTenant`, `existsAndTenant`).
*   **Mongoose Deprecation Safety**: Always use `{ returnDocument: 'after' }` instead of deprecated `{ new: true }` in document mutation queries.
*   **ACID Transactions**: Multi-document operations (e.g., organization onboarding, invitation redemption) MUST be executed inside Mongoose ClientSession transactions using `runInTransaction(async (session) => { ... })`.
*   **No Mongoose Direct Access**: Business services must never import or call raw Mongoose models directly. All database interaction is encapsulated inside repository classes.

---

## ⚡ 9. Upstash Redis Cache Strategy

*   **Client**: Uses `@upstash/redis` REST-based client for serverless reliability and low-latency HTTP connections.
*   **Service Wrapper**: `CacheService` (`src/platform/cache/index.js`) provides standardized `get`, `set`, `delete`, and pattern invalidation.
*   **Active Namespaces & TTLs**:
    *   `session:<userId>` $\longrightarrow$ Active JWT session state (TTL: Match refresh token duration / 7d).
    *   `refreshToken:<tokenId>` $\longrightarrow$ Token rotation tracking (TTL: 7d).
    *   `rbac:<orgId>:<userId>` $\longrightarrow$ Computed permission sets (TTL: 1h, invalidated on role/user changes).
    *   `roleDelegation:<orgId>:<roleId>` $\longrightarrow$ Target delegation boundaries (TTL: 24h, invalidated on policy edits).
*   **Invalidation Rule**: Any mutation to roles, policies, users, or organization settings MUST immediately call `invalidateCache()` on the corresponding domain service.

---

## 📜 10. Immutable Audit Compliance Ledger

*   **`AuditLog` Schema**: Serves as a tamper-evident compliance ledger for administrative and security actions.
*   **Immutability Enforcement**: Mongoose pre-update and pre-delete middleware throw fatal exceptions if any code attempts to edit or remove an audit log record (`preventMutation`).
*   **Logged Events**: Every tenant provisioning (`TENANT_PROVISIONED`), invitation creation/revocation/redemption, role modification, and policy update generates an immutable audit record containing `organizationId`, `actorId`, `action`, `entityType`, `entityId`, and metadata payload.

---

## 🚀 11. Core Event Bus & Tenant Bootstrap Infrastructure (Phase A)

*   **In-Memory Event Bus (`EventBus`)**: Built on Node.js native `EventEmitter` (`src/core/events/EventBus.js`). Decouples domain modules by broadcasting asynchronous domain events.
    *   **Async-Safe Listeners**: All event listeners are wrapped in `try/catch` blocks so background asynchronous failures never crash the main thread or cause unhandled rejections.
    *   **Event Constants**: All event names MUST come from `src/core/constants/events.js` (e.g., `EVENTS.TENANT_PROVISIONED`). Hardcoding event strings is strictly prohibited.
*   **Tenant Context & ALS Safety Net (`TenantContext`)**: Uses `AsyncLocalStorage` (`src/core/context/TenantContext.js`) to store tenant context during HTTP request lifecycles (bound by `requireTenant` middleware).
    *   **Safety Net Rule**: Services and Repositories MUST still accept `organizationId` explicitly as a parameter. `BaseRepository` uses ALS strictly as a verification guard: if an explicitly passed `organizationId` mismatches the ALS context during a web request, it throws a fatal `TenantIsolationError`. In background jobs or unit tests where ALS is absent, execution proceeds safely with the explicit parameter.
*   **Decoupled Tenant Bootstrap (`OrganizationBootstrapRegistry`)**: Centralized registry (`src/core/bootstrap/OrganizationBootstrapRegistry.js`) for sequential, extensible tenant onboarding seeding.
    *   **Event Subscription**: Subscribes to `EVENTS.TENANT_PROVISIONED` emitted by `OrganizationService.createOrganization()` after successful transaction commit.
    *   **Extensibility Rule**: Future domain modules (e.g., departments, locations, shifts) MUST register their seeding logic via `OrganizationBootstrapRegistry.register('HandlerName', handlerFn, priority)` instead of modifying frozen M-01 `OrganizationService`. Each handler executes sequentially inside its own ACID transaction.

---

## 🔒 12. Current Module Status (M-01 - M-05 FROZEN)

```text
================================================================================
MODULE M-01: AUTHENTICATION & AUTHORIZATION FOUNDATION
MODULE M-02: DEPARTMENTS & ORGANIZATIONAL HIERARCHY
MODULE M-03: EMPLOYEE MANAGEMENT
MODULE M-04: RECRUITMENT MANAGEMENT
MODULE M-05: ATTENDANCE MANAGEMENT & RECONCILIATION
MODULE M-06: LEAVE MANAGEMENT
ARCHITECTURE: DOCUMENTATION SYSTEM (OpenAPI, MCP, Frontend API)
STATUS: COMPLETE & FROZEN
================================================================================
```

*   **Architectural Freeze**: The Authentication & Authorization (M-01), Departments (M-02), Employee Management (M-03), Recruitment Management (M-04), Attendance Management & Reconciliation (M-05), Leave Management (M-06) modules, and the Documentation System (OpenAPI Generator, MCP, Frontend API) are officially **COMPLETE AND FROZEN**.
*   **Attendance API Stability Contract**: Treat the Attendance domain as a stable contract rather than an internal implementation detail.
    *   No breaking changes to Attendance REST endpoints without a versioned migration.
    *   No breaking changes to Attendance events without updating all consumers.
    *   Any schema changes to `AttendanceRecord` or `AttendanceRegularization` must include:
        *   Migration strategy (if required)
        *   Documentation updates
        *   Regression tests
*   **Leave API Stability Contract**: Treat the Leave domain as a stable contract for Payroll integration.
    *   No breaking REST endpoint changes.
    *   No breaking event payload changes.
    *   No ledger schema changes.
    *   No balance snapshot schema changes.
    *   Any breaking change requires migration documentation, OpenAPI regeneration, and version bump.
*   **Rules for Future Agents**:
    *   **Do NOT redesign** the authentication, RBAC, delegation, tenant isolation, organizational hierarchy architecture, employee management, recruitment pipeline, attendance engine, leave management workflows, or the documentation generation architecture.
    *   **Do NOT refactor** working M-01, M-02, M-03, M-04, M-05, or M-06 domain services, repositories, routes, or the AST-based documentation generator unnecessarily.
    *   **Only implement bug fixes**, security updates, or critical performance optimizations in frozen code.
    *   All upcoming domain features must build **on top of** this foundational layer by importing working services (`AuthService`, `RoleService`, `RbacService`, `RoleDelegationService`, `InviteService`, `DepartmentService`, `EmployeeService`, `JobRequisitionService`, `AttendanceRegularizationService`, `AttendanceReconciliationService`).

---

## 🗺️ 13. Future Enterprise Roadmap

The platform will evolve sequentially across the following planned modules:

```text
M-01 [FROZEN]  ──> Authentication, Multi-Tenancy, RBAC & Role Delegation Foundation
M-02 [FROZEN]  ──> Departments & Organizational Hierarchy (Cost centers, reporting lines)
M-03 [FROZEN]  ──> Employee Management (Profiles, onboarding workflows, status tracking)
M-04 [FROZEN]  ──> Recruitment Management (Job requisitions, candidate funnel, ATS pipeline)
DOCS [FROZEN]  ──> Automated AST Documentation Engine (OpenAPI, MCP, Frontend API)
M-05 [FROZEN]  ──> Attendance Management & Reconciliation (Clock-in, regularization, payroll feed)
M-06 [FROZEN]  ──> Leave Management (Accruals, holiday calendars, policy enforcement, approvals)
M-07 [NEXT]    ──> Payroll Management (Automated salary calculation, statutory deductions, payslips)
M-08 [PLANNED] ──> Performance Management (SMART goals, KPI tracking, multi-source reviews)
M-09 [PLANNED] ──> Project & Task Management (Projects, Kanban boards, sprint tracking)
M-10 [PLANNED] ──> Asset Management (Hardware/software inventory, allocation tracking)
M-11 [PLANNED] ──> Help Desk (Support ticketing, automated routing, SLA enforcement)
M-12 [PLANNED] ──> Document Management (Corporate repository, semantic search, versioning)
M-13 [PLANNED] ──> Notification System (In-app alerts, transactional emails, interactive alerts)
M-14 [PLANNED] ──> Reports & Analytics (Executive dashboards, departmental insights)
M-15 [PLANNED] ──> AI Operations Assistant (Conversational Co-Pilot, tool registry execution)
```

---

## 🛠️ 14. Strict Coding Conventions & Rules

1.  **ES Modules Only**: Use `import`/`export` (`"type": "module"`). Never use CommonJS (`require`).
2.  **Subpath Imports**: Always use `#@/*` pointing to `./src/*` (e.g., `import logger from '#@/platform/logger/index.js'`). Avoid relative paths like `../../utils`.
3.  **Structured Logging**: Use `pino` structured logger. Never use raw `console.log`. Never log secrets, passwords, or tokens.
4.  **Environment Validation**: All environment config is validated at startup using `envalid` in `src/config/env.js`. Never access `process.env` directly in application files; import `env`.
5.  **No Manual Collection Creation**: Never create MongoDB collections manually. Let Mongoose schemas manage collection lifecycle. Use `migrate-mongo` exclusively for schema transformations and backfilling.
