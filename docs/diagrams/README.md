# NexusOps Backend — Architecture Diagrams

This directory contains the official architecture documentation for the **NexusOps Enterprise Workforce Management Platform** backend. Each document focuses on one architectural concern and uses Mermaid diagrams to explain the design visually before the source code explains the implementation in detail.

## Document Index

| # | Document | Covers |
|---|---|---|
| 00 | [System Overview](./00-system-overview.md) | Platform structure, module landscape, layered architecture |
| 01 | [Request Lifecycle](./01-request-lifecycle.md) | Middleware pipeline, error handling, bootstrap sequence |
| 02 | [Authentication](./02-authentication.md) | JWT, sessions, refresh tokens, brute-force protection |
| 03 | [Multi-Tenancy](./03-multi-tenancy.md) | Data isolation, BaseRepository, ALS safety net |
| 04 | [RBAC & Permissions](./04-rbac-permissions.md) | Role engine, permission evaluation, delegation policy |
| 05 | [Database & Repositories](./05-database-repository.md) | Collections, BaseRepository pattern, ACID transactions |
| 06 | [Event-Driven Architecture](./06-event-driven-architecture.md) | EventBus, deferred events, bootstrap registry |
| 07 | [Caching Strategy](./07-caching-strategy.md) | Redis namespaces, TTLs, invalidation, session liveness |
| 08 | [Attendance Module (M-05)](./08-attendance-module.md) | Clock-in/out, policies, reconciliation, payroll feed |
| 09 | [Leave Module (M-06)](./09-leave-module.md) | Balances, request lifecycle, approval tiers, payroll snapshot |
| 10 | [Payroll Engine (M-07)](./10-payroll-engine.md) | Cycles, runs, calculation engine, state machine, concurrency |
| 11 | [Recruitment & ATS (M-04)](./11-recruitment-module.md) | Requisitions, pipeline stages, candidate API, offer handoff |
| 12 | [Storage & Documents](./12-storage-documents.md) | File upload, provider abstraction, ACL access control |
| 13 | [Audit Logging](./13-audit-logging.md) | Immutable ledger, Mongoose guards, compliance events |
| 14 | [Module Interactions](./14-module-interactions.md) | Cross-module dependency map, stability contracts |

## Reading Order for New Engineers

If you are new to this codebase, read the documents in this order:

1. **[00 — System Overview](./00-system-overview.md)** — Understand the architecture at a glance
2. **[01 — Request Lifecycle](./01-request-lifecycle.md)** — Understand how any API request works
3. **[03 — Multi-Tenancy](./03-multi-tenancy.md)** — Understand the isolation model before touching any query
4. **[04 — RBAC & Permissions](./04-rbac-permissions.md)** — Understand how authorization works
5. **[05 — Database & Repositories](./05-database-repository.md)** — Understand how to write database queries correctly
6. **[06 — Event-Driven Architecture](./06-event-driven-architecture.md)** — Understand how modules communicate
7. **Domain modules** (08–12) — Read whichever module you are working on
8. **[14 — Module Interactions](./14-module-interactions.md)** — Understand cross-module dependencies

## Architecture Principles Summary

| Principle | Enforcement |
|---|---|
| Tenant isolation | `BaseRepository._scopeFilter()` + AsyncLocalStorage mismatch check |
| No raw Mongoose in services | Code review + architectural contract |
| No business logic in routes/controllers | Code review + single responsibility design |
| Immutable audit logs | Mongoose pre-hook guards on AuditLog model |
| ACID transactions for multi-doc writes | `runInTransaction()` wrapper in `platform/database/db.js` |
| Events emitted after commit only | `TransactionContext` + deferred emit queue |
| Permission strings, not role names | `PERMISSIONS` constants from `src/core/constants/permissions/` |
| Event names from constants, not strings | `EVENTS` constants from `src/core/constants/events/` |
