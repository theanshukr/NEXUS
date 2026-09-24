# Database Architecture & Repository Layer

## Purpose

This document describes the MongoDB data architecture, how the `BaseRepository` pattern enforces consistent, safe, and tenant-isolated database access, and how ACID transactions are managed.

## Architectural Overview

NexusOps uses **MongoDB Atlas** as its primary database with **Mongoose** as the ODM layer. All database access is mediated through domain repositories that extend `BaseRepository`. Services never import Mongoose models directly. Transactions are managed via a `runInTransaction()` utility that wraps operations in a MongoDB ClientSession and defers domain events until after a successful commit.

## Collection Landscape

```mermaid
graph TB
    subgraph "Identity & Access"
        USR["users"]
        ORG["organizations"]
        OS["organizationsettings"]
        ROL["roles"]
        UR["userroles"]
        RDP["roledelegationpolicies"]
        RT["refreshtokens"]
        INV["invitations"]
        AUD["auditlogs"]
    end

    subgraph "Workforce"
        EMP["employees"]
        DEP["departments"]
        DES["designations"]
        LOC["locations"]
        SHF["shifts"]
        HOL["holidaycalendars"]
    end

    subgraph "Operational"
        ATT["attendancerecords"]
        LVR["leaverequests"]
        LVB["leavebalances"]
        LVL["leavebalanceledgers"]
        LVP["leavepolicies"]
        LVS["leavebalancesnapshots"]
    end

    subgraph "Recruitment"
        JRQ["jobrequisitions"]
        JPS["jobpostings"]
        JPA["jobapplications"]
        INT["interviews"]
        OFR["offers"]
        CND["candidates"]
    end

    subgraph "Payroll"
        PCY["payrollcycles"]
        PRN["payrollruns"]
        PSL["payslips"]
        SST["salarystructures"]
        SRV["salaryrevisions"]
        STR["statutoryrules"]
        PAJ["payrolladjustments"]
        PFM["payrollformulas"]
    end

    subgraph "Platform"
        DOC["documents"]
        DAC["documentaccesses"]
    end
```

## BaseRepository Pattern

`BaseRepository` is the single point of control for all MongoDB queries. Domain repositories extend it and gain automatic tenant isolation, pagination, and transaction support.

```mermaid
classDiagram
    class BaseRepository {
        +model: MongooseModel
        +_validateTenantScope(orgId) void
        +_scopeFilter(filter, orgId) Object
        +findByIdAndTenant(id, orgId, opts) Promise
        +findOne(filter, orgId, opts) Promise
        +find(filter, orgId, opts) Promise
        +findPaginated(params, orgId, opts) Promise
        +countDocuments(filter, orgId, opts) Promise
        +createScoped(data, orgId, opts) Promise
        +createManyScoped(dataArr, orgId, opts) Promise
        +updateByIdAndTenant(id, update, orgId, opts) Promise
        +deleteByIdAndTenant(id, orgId, opts) Promise
    }

    class EmployeeRepository {
        +findByUserId(userId, orgId) Promise
        +findWithDepartment(filter, orgId) Promise
        +findActiveByDepartment(deptId, orgId) Promise
    }

    class PayrollRunRepository {
        +findActiveRun(cycleId, orgId) Promise
    }

    class SalaryStructureRepository {
        +findActiveByEmployee(empId, orgId) Promise
        +findActiveByDesignation(desigId, orgId) Promise
        +findActiveByDepartment(deptId, orgId) Promise
        +findActiveDefault(orgId) Promise
    }

    BaseRepository <|-- EmployeeRepository
    BaseRepository <|-- PayrollRunRepository
    BaseRepository <|-- SalaryStructureRepository
```

*Specialized repositories add domain-specific query methods on top of the inherited CRUD. They never bypass `_scopeFilter()`.*

## Query Lifecycle

```mermaid
sequenceDiagram
    participant SVC as Service
    participant REPO as Repository
    participant BASE as BaseRepository
    participant ALS as TenantContext (ALS)
    participant DB as MongoDB

    SVC->>REPO: findByIdAndTenant(id, organizationId)
    REPO->>BASE: this._scopeFilter({ _id: id }, organizationId)
    BASE->>ALS: TenantContext.getOrganizationId()
    ALS-->>BASE: contextOrgId (or null)
    BASE->>BASE: Assert explicit == context (if context exists)
    BASE-->>REPO: { _id: id, organizationId: "..." }
    REPO->>DB: model.findOne({ _id: id, organizationId: "..." })
    DB-->>REPO: Document
    REPO-->>SVC: Document
```

## ACID Transactions

Multi-document operations use the `runInTransaction()` helper which wraps a MongoDB ClientSession and correctly integrates with the domain event system.

```mermaid
sequenceDiagram
    participant SVC as Service
    participant TX as runInTransaction()
    participant TC as TransactionContext (ALS)
    participant SESSION as MongoDB Session
    participant BUS as EventBus

    SVC->>TX: runInTransaction(async (session) => callback)
    TX->>SESSION: mongoose.startSession()
    TX->>TC: TransactionContext.run({ session, queuedEvents: [] }, ...)
    Note over TC: ALS store active for all\nasync ops in callback
    TX->>SESSION: session.withTransaction(...)

    loop Business operations
        SVC->>DB: Repo calls with { session }
        Note over DB: All writes are part of\nthe same MongoDB transaction
    end

    SVC->>BUS: EventBus.emit(EVENT_NAME, payload)
    BUS->>TC: Check TransactionContext.getStore()
    TC-->>BUS: { queuedEvents: [...] }
    BUS->>BUS: Push to queuedEvents (deferred!)

    SESSION-->>TX: Transaction committed

    TX->>BUS: Flush queuedEvents
    Note over BUS: Events emitted AFTER\nsuccessful commit only
    TX-->>SVC: return result
```

**The critical guarantee:** Domain events are only emitted after a successful transaction commit. If the transaction rolls back (e.g., a duplicate key error on step 3 of 5), no events are emitted and no downstream side effects occur.

## Pagination Standard

All list endpoints use `BaseRepository.findPaginated()` which returns a standardized response:

```json
{
  "data": [...],
  "pagination": {
    "total": 150,
    "page": 2,
    "limit": 20,
    "totalPages": 8
  }
}
```

Limits are capped at 100 records per page. Default sort is `{ createdAt: -1 }`.

## Key Indexes

Critical indexes enforced across collections:

| Collection | Index | Purpose |
|---|---|---|
| `users` | `{ email: 1, organizationId: 1 }` unique | Login uniqueness per tenant |
| `userroles` | `{ userId: 1, organizationId: 1 }` | Fast permission lookups |
| `payrollruns` | `{ payrollCycleId: 1, organizationId: 1 }` partial unique (active status) | Concurrency guard — one active run per cycle |
| `attendancerecords` | `{ employeeId: 1, workDate: 1, organizationId: 1 }` | Daily attendance lookup |
| `auditlogs` | `{ organizationId: 1, createdAt: -1 }` | Tenant audit trail queries |
| `salarystructures` | `{ targetType, targetId, organizationId, status }` | Hierarchical salary resolution |

## Key Takeaways

- **Services never touch Mongoose models directly.** Any code that imports a model and calls `.find()` on it directly is a violation. All DB interaction goes through repositories.
- **`{ returnDocument: 'after' }` is the standard** for all mutation queries that return the updated document. The deprecated `{ new: true }` option is not used.
- **Every document carries `organizationId` as a required indexed field.** Collections without `organizationId` are system-level (e.g., `organizations` itself).
- **Transactions fall back gracefully.** On standalone MongoDB (non-replica-set local dev), `runInTransaction()` catches the "replica set required" error and executes the callback sequentially without a session.
