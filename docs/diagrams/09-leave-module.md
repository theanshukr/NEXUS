# Leave Management Module (M-06)

## Purpose

This document describes the Leave module architecture: how leave balances are initialized and tracked, how requests flow through the approval lifecycle, how the calendar module contributes to net day calculation, and how leave data integrates with payroll.

## Architectural Overview

The Leave module (M-06) manages leave accruals, balance tracking, request submission, multi-tier approval workflows, and payroll-ready snapshots. It is composed of five services:

| Service | Responsibility |
|---|---|
| `LeaveRequestService` | Submit, approve, reject, cancel requests; ledger mutations |
| `LeaveBalanceService` | Balance initialization, accrual, and lock-based mutations |
| `LeavePolicyService` | Policy definition per organization |
| `LeaveSnapshotService` | Point-in-time balance snapshots for payroll |
| `LeaveReportService` | Aggregation read models |

## Leave Data Model

```mermaid
erDiagram
    Employee ||--o{ LeaveRequest : "submits"
    Employee ||--|| LeaveBalance : "holds per year"
    LeaveBalance ||--o{ LeaveBalanceLedger : "tracked by"
    LeaveRequest ||--o{ LeaveBalanceLedger : "generates"
    LeavePolicy ||--o{ LeaveBalance : "governs"
    LeaveBalance ||--o{ LeaveBalanceSnapshot : "snapshotted for payroll"

    LeaveBalance {
        ObjectId employeeId
        number year
        BalanceEntry[] balances
        date lockedAt
    }

    BalanceEntry {
        string code
        number entitled
        number used
        number remaining
        number pending
    }
```

## Leave Request Lifecycle

```mermaid
sequenceDiagram
    actor Emp as Employee
    actor Mgr as Manager
    actor HR as HR Manager
    participant LRS as LeaveRequestService
    participant CAL as CalendarService
    participant DB as MongoDB

    Emp->>LRS: submitRequest({ leaveCode, startDate, endDate, reason })
    LRS->>LRS: Check overlap with existing active requests
    LRS->>LRS: Load active leave policy for leaveCode
    LRS->>CAL: calculateNetWorkingDays(orgId, start, end, locationId)
    Note over CAL: Excludes weekends + public holidays\nfor employee's location
    LRS->>DB: runInTransaction():
    Note over DB: Lock LeaveBalance (optimistic)\nDeduct pending days\nCreate LeaveRequest (PENDING)\nWrite LeaveBalanceLedger entry

    alt Manager approval sufficient
        Mgr->>LRS: approve(requestId)
        LRS->>DB: runInTransaction():
        Note over DB: Move days from pending → used\nUpdate request status: APPROVED\nAuditLog
    else HR escalation required
        Mgr->>LRS: approve(requestId) escalates automatically
        HR->>LRS: approve(requestId)
    end

    alt Rejection
        Mgr->>LRS: reject(requestId)
        LRS->>DB: runInTransaction():
        Note over DB: Restore pending days to remaining\nUpdate status: REJECTED
    end
```

## Leave Balance State Machine

```mermaid
stateDiagram-v2
    [*] --> INITIALIZED: getOrInitializeBalance()
    INITIALIZED --> PENDING_DEDUCTED: Request submitted
    PENDING_DEDUCTED --> USED_DEDUCTED: Request approved
    PENDING_DEDUCTED --> RESTORED: Request rejected / cancelled
    USED_DEDUCTED --> RESTORED_PARTIAL: Leave cancelled post-approval
```

## Approval Escalation Logic

The approval tier is determined at submission time based on the leave policy and total days requested:

```mermaid
flowchart LR
    SUBMIT["Leave submitted\ntotalDays calculated"]
    POLICY["LeavePolicyService\nescalationRules loaded"]
    HR_REQ{{"policy.requireHrApproval\nOR\ntotalDays > managerApprovalLimit?"}}
    MANAGER["currentApproverRole = MANAGER"]
    HR_MGR["currentApproverRole = HR_MANAGER"]
    ASSIGN["LeaveRequest.currentApproverRole set\nRequest routed accordingly"]

    SUBMIT --> POLICY --> HR_REQ
    HR_REQ -->|"no"| MANAGER --> ASSIGN
    HR_REQ -->|"yes"| HR_MGR --> ASSIGN
```

## Net Working Days Calculation

The Leave module uses `CalendarService` to calculate the actual number of working days in a leave period, excluding weekends and public holidays specific to the employee's location.

```mermaid
flowchart LR
    INPUT["startDate, endDate\nlocationId, orgId"]
    CAL["CalendarService\n.calculateNetWorkingDays()"]
    HOL["HolidayCalendarRepository\nfetch holidays for location + year"]
    SKIP["Skip Saturdays,\nSundays,\nand holidays"]
    NET["Net working days\n(can be 0.5 for half-day)"]

    INPUT --> CAL --> HOL --> SKIP --> NET
```

## Leave Balance Mutation Safety

Leave balance mutations use **optimistic locking** to prevent concurrent requests from double-spending the same leave balance. The `mutateBalanceWithLock()` method fetches the balance document inside a MongoDB session and applies changes atomically.

```mermaid
sequenceDiagram
    participant LRS as LeaveRequestService
    participant LBR as LeaveBalanceRepository
    participant DB as MongoDB Session

    LRS->>DB: runInTransaction(session)
    LRS->>LBR: mutateBalanceWithLock(orgId, empId, year, callback)
    LBR->>DB: findOneAndUpdate with session lock
    DB-->>LBR: Locked LeaveBalance document
    LBR->>LRS: callback(lockedBalance)
    LRS->>LRS: Check remaining >= requested
    LRS->>LBR: Save updated balance
    Note over LBR: All inside same session/transaction
```

## Payroll Integration: Leave Snapshots

At the time of payroll execution, the leave module provides a **point-in-time balance snapshot** for each employee to ensure the payroll calculation reflects the exact leave state at the cycle's close.

```mermaid
flowchart LR
    PAYROLL["PayrollRunService\n(M-07)"]
    SNAP["LeaveSnapshotService\n.getOrCreateSnapshot(orgId, empId, year)"]
    BALANCE["LeaveBalance\ncurrent state"]
    STORED["LeaveBalanceSnapshot\nimmutable record"]

    PAYROLL --> SNAP
    SNAP -->|"first call"| BALANCE
    BALANCE --> STORED
    SNAP -->|"subsequent calls"| STORED
    STORED --> PAYROLL
```

## Key Takeaways

- **Balance mutations are always transactional.** Submit, approve, reject, and cancel all operate inside `runInTransaction()` with a MongoDB session. There is no non-transactional path to modify a leave balance.
- **Net working days depend on the employee's location.** Two employees in different offices on the same dates may have different net days due to location-specific holidays.
- **Approval tier is determined at submission, not approval.** The `currentApproverRole` field on the request records who should next act on it, routing the approval correctly without any enum checks in middleware.
- **Leave balance snapshots are immutable once created.** Payroll receives a snapshot that cannot be changed retroactively after payroll locks.
- **Policy is looked up from the live policy record, not embedded.** This means policy changes apply to new requests immediately, but not to existing requests already in flight.
