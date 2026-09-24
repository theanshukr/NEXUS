# Attendance Management Module (M-05)

## Purpose

This document describes the Attendance module architecture: how clock-in/out operations work, how attendance policies are enforced, how geofencing is validated, how stale sessions are reconciled, and how the module feeds finalized data to Payroll.

## Architectural Overview

The Attendance module (M-05) owns the employee clock-in/out lifecycle from raw timestamps to payroll-ready finalized records. It is composed of six focused services:

| Service | Responsibility |
|---|---|
| `AttendanceClockService` | Clock-in/out pipeline, geofence, shift validation |
| `AttendancePolicyService` | Policy definition and lookup per employee |
| `AttendanceCalculationService` | Pure math: working hours, overtime, LOP calculation |
| `AttendanceReconciliationService` | Stale session cleanup, period finalization, payroll feed |
| `AttendanceRegularizationService` | Employee-submitted correction requests and approvals |
| `AttendanceDashboardService` | Read-model aggregations for dashboards |

## Clock-In Pipeline

```mermaid
flowchart TD
    REQ["POST /attendance/clock-in\n{ gpsData, deviceData }"]

    subgraph "Validation Pipeline"
        E1["Resolve Employee\nfindByUserId()"]
        E2["Check status = ACTIVE"]
        E3["Assert shiftId & locationId assigned"]
        E4["Load Holiday Calendar\nIs today a holiday?"]
        E5["Load Shift definition\nstart/end times, timezone"]
        E6["Load Location\ngeofence center + radius"]
        E7["Validate Geofence\nGeoFenceCalculator.validate()"]
        E8["Load Attendance Policy\nallowRemote? earlyClockIn?"]
        E9["Check no open record exists\nConflictError if duplicate"]
    end

    subgraph "Record Creation"
        SNAP["Snapshot reference data\nat moment of clock-in\n(shift, location, policy)"]
        CREATE["AttendanceRecordRepository.createScoped()"]
        EVENT["EventBus.emit(ATTENDANCE.CLOCKED_IN)"]
        AUDIT["AuditService.logAction()"]
    end

    REQ --> E1 --> E2 --> E3 --> E4 --> E5 --> E6 --> E7 --> E8 --> E9
    E9 --> SNAP --> CREATE --> EVENT
    CREATE --> AUDIT
```

*Snapshot principle: all reference data (shift times, location, policy) is embedded in the `AttendanceRecord.policySnapshot` and `shiftSnapshot` at the time of clock-in. Future changes to the shift or policy do not retroactively affect existing records.*

## Clock-Out Pipeline

```mermaid
flowchart LR
    REQ["POST /attendance/clock-out\n{ gpsData, deviceData }"]
    FIND["findOpenRecord(employeeId, orgId)\nLooks for CLOCK_IN with no CLOCK_OUT"]
    CALC["AttendanceCalculationService\n.calculateSession(record, clockOutTime)"]
    OT["Compute overtime hours\nbeyond shift end"]
    LOP["Compute early leave / LOP hours"]
    UPDATE["AttendanceRecord.push(CLOCK_OUT event)\nUpdate workingHours, overtime, status"]
    EVENT["EventBus.emit(ATTENDANCE.CLOCKED_OUT)"]

    REQ --> FIND --> CALC
    CALC --> OT & LOP --> UPDATE --> EVENT
```

*Night shift support: clock-out uses `findOpenRecord()` (looks for any open record) rather than a date-based query. This correctly handles records that span midnight.*

## Attendance Record State Machine

```mermaid
stateDiagram-v2
    [*] --> PRESENT: Successful clock-in + clock-out
    [*] --> ABSENT: No clock-in on working day
    [*] --> HALF_DAY: Half-day attendance
    PRESENT --> MISSING_CLOCK_OUT: Stale session reconciliation
    MISSING_CLOCK_OUT --> RECONCILIATION_REQUIRED: Flagged for manager review

    state "Workflow Status" as WF
    WF: PENDING → REGULARIZATION_REQUESTED → APPROVED / REJECTED
```

## Reconciliation: Stale Session Cleanup

```mermaid
flowchart LR
    TRIGGER["Scheduled or\nManual Trigger"]
    FIND["findAllOpenRecords(orgId)\nRecords with CLOCK_IN, no CLOCK_OUT"]
    THRESHOLD["policySnapshot.maximumOpenAttendanceHours\n(default: 16h)"]
    CHECK{{"elapsed > threshold?"}}
    MARK["Update status: MISSING_CLOCK_OUT\nworkflowStatus: RECONCILIATION_REQUIRED"]
    AUDIT["AuditService.logAction(RECONCILE_STALE)"]
    SKIP["Skip — still within threshold"]

    TRIGGER --> FIND --> CHECK
    CHECK -->|"yes"| MARK --> AUDIT
    CHECK -->|"no"| SKIP
```

## Payroll Feed Contract

The Attendance module exposes a **stable payroll feed contract** to the Payroll module. This is the data boundary between M-05 and M-07.

```mermaid
flowchart LR
    subgraph "Payroll Module (M-07)"
        PRS["PayrollRunService.createRun()"]
    end

    subgraph "Attendance Module (M-05)"
        ASSERT["AttendanceReconciliationService\n.assertAllRecordsFinalized(orgId, start, end)"]
        FEED["AttendanceReconciliationService\n.getPayrollFeed(orgId, start, end)"]
    end

    PRS -->|"Step 1: assert finalized"| ASSERT
    ASSERT -->|"ConflictError if unfinalized records"| PRS
    PRS -->|"Step 2: fetch data"| FEED
    FEED -->|"AttendanceFeedItem[]\n{ employeeId, presentDays, overtimeHours, lopDays }"| PRS
```

Payroll cannot execute if any attendance record in the cycle period is not in `FINALIZED` status. The Attendance module owns the finalization state; the Payroll module is a consumer, not a mutator.

## Regularization Workflow

```mermaid
sequenceDiagram
    actor Emp as Employee
    actor Mgr as Manager
    participant RS as RegularizationService
    participant DB as MongoDB

    Emp->>RS: POST /attendance/regularize { date, correction, reason }
    RS->>DB: Create regularization request (PENDING)
    RS-->>Emp: Request ID

    Mgr->>RS: PUT /attendance/regularize/:id/approve
    RS->>DB: runInTransaction():
    Note over DB: Update regularization to APPROVED\nApply correction to AttendanceRecord\n(only if not finalized)
    RS-->>Mgr: Updated record
```

## Key Takeaways

- **Data snapshots at clock-in.** Shift, location, and policy data is frozen into the record at creation time. This makes each record self-contained and audit-proof.
- **Night shifts work correctly.** Clock-out finds the open record by status, not by date — preventing "wrong day" lookup failures.
- **Payroll is blocked by unfinalized attendance.** `assertAllRecordsFinalized()` is a hard gate that payroll cannot bypass. This prevents payroll runs on incomplete attendance data.
- **Stale session reconciliation is a safety mechanism.** It flags forgotten clock-outs without deleting data, enabling managers to correct records via regularization.
- **Regularization is transactional.** The approval and record update happen atomically in a single MongoDB session.
