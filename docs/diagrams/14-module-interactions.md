# Module Interaction Map

## Purpose

This document shows how the domain modules interact with each other — which modules call which, in which direction, and for what purpose. It helps engineers understand the cross-module data dependencies before modifying any module.

## Module Dependency Graph

```mermaid
graph TB
    subgraph "Foundation"
        M01["M-01\nAuth and Authorization\nroles, users, invitations"]
    end

    subgraph "Organization Layer"
        M02["M-02\nDepartments and Org Hierarchy\ndepts, designations, locations, shifts"]
    end

    subgraph "Workforce Layer"
        M03["M-03\nEmployee Management"]
        M04["M-04\nRecruitment and ATS"]
    end

    subgraph "Operational Layer"
        M05["M-05\nAttendance"]
        M06["M-06\nLeave"]
        CAL["Calendar Module"]
    end

    subgraph "Financial Layer"
        M07["M-07\nPayroll"]
    end

    subgraph "Platform"
        DOC["Documents"]
        AUD["Audit Ledger"]
    end

    M02 --> M01
    M03 --> M01
    M03 --> M02
    M04 --> M01
    M04 --> M03
    M05 --> M03
    M05 --> M02
    M05 --> AUD
    M06 --> M03
    M06 --> CAL
    M06 --> AUD
    M07 --> M05
    M07 --> M06
    M07 --> M03
    M07 --> M02
    M07 --> AUD
    M04 --> DOC
    M03 --> AUD
    M01 --> AUD
```

## Cross-Module Call Matrix

This matrix documents every cross-module service call (direct imports), separated from event-based decoupling.

| Consumer | Dependency | Reason |
|---|---|---|
| M-03 Employee | M-01 UserRepository | Create user account on employee onboarding |
| M-03 Employee | M-02 DepartmentRepository | Validate department assignment |
| M-04 Recruitment | M-03 EmployeeService | Create employee on offer acceptance |
| M-05 Attendance | M-03 EmployeeRepository | Resolve employee from userId on clock-in |
| M-05 Attendance | M-02 ShiftRepository | Load shift definition for clock-in validation |
| M-05 Attendance | M-02 LocationRepository | Load geofence for clock-in validation |
| M-05 Attendance | M-02 HolidayCalendarRepository | Check if clock-in date is a public holiday |
| M-06 Leave | M-05 *(none direct)* | Decoupled via CalendarService |
| M-06 Leave | CalendarService | Calculate net working days |
| M-07 Payroll | M-05 AttendanceReconciliationService | Assert finalized records + fetch payroll feed |
| M-07 Payroll | M-06 LeaveSnapshotService | Fetch point-in-time leave balance snapshot |
| M-07 Payroll | M-03 EmployeeRepository | Fetch active employees for batch run |
| M-07 Payroll | M-02 OrganizationSettingsRepository | Fetch currency and org-level defaults |
| All modules | AuditService | Write immutable audit log entries |

## Event-Based (Decoupled) Interactions

These interactions cross module boundaries without direct imports — through the EventBus:

```mermaid
sequenceDiagram
    participant ORG as OrganizationService
    participant BUS as EventBus
    participant REG as BootstrapRegistry
    participant LEAVE as LeaveBootstrapHandler
    participant DEPT as DepartmentBootstrapService

    ORG->>BUS: emit(TENANT_PROVISIONED)
    BUS->>REG: executeAll(payload)
    REG->>LEAVE: Seed default leave policies
    REG->>DEPT: Seed default department structure
```

```mermaid
sequenceDiagram
    participant ATT as AttendanceClockService
    participant BUS as EventBus
    participant SYNC as LeaveSyncService

    ATT->>BUS: emit(ATTENDANCE.CLOCKED_IN)
    BUS->>SYNC: Sync attendance data with leave balances
```

## Payroll Data Dependency Map

Payroll (M-07) is the most data-intensive module, consuming finalized data from three upstream modules before it can execute.

```mermaid
flowchart TB
    subgraph "Upstream Providers"
        M05_DATA["M-05 Attendance\nFeed: presentDays, overtimeHours, lopDays"]
        M06_DATA["M-06 Leave\nFeed: leaveBalanceSnapshot"]
        M03_DATA["M-03 Employees\nFeed: employee list + profiles"]
        M02_DATA["M-02 Org Settings\nFeed: currency, working days"]
        SAL_DATA["Salary Structures\nFeed: baseSalary, components"]
        STAT_DATA["Statutory Rules\nFeed: PF, ESI, TDS rates"]
    end

    subgraph "Payroll Run"
        ENGINE["PayrollCalculationEngine\n.calculate(allSnapshots)"]
    end

    subgraph "Output"
        PAYSLIPS["Payslips (DRAFT)\nOne per employee"]
    end

    M05_DATA --> ENGINE
    M06_DATA --> ENGINE
    M03_DATA --> ENGINE
    M02_DATA --> ENGINE
    SAL_DATA --> ENGINE
    STAT_DATA --> ENGINE
    ENGINE --> PAYSLIPS
```

## Stability Contracts

These cross-module contracts must not be broken without a versioned migration:

| Contract | Owner | Consumer | Type |
|---|---|---|---|
| Attendance payroll feed schema | M-05 | M-07 | Data shape |
| Leave balance snapshot schema | M-06 | M-07 | Data shape |
| `EmployeeRepository.findByUserId()` | M-03 | M-05 | Method signature |
| `TENANT_PROVISIONED` event payload | M-01 | All bootstrap handlers | Event payload |
| `ATTENDANCE.CLOCKED_IN` payload | M-05 | LeaveSyncService | Event payload |

## Key Takeaways

- **The dependency hierarchy flows downward.** Higher-layer modules (Payroll, Leave) depend on lower-layer modules (Attendance, Employee) — but not vice versa. No circular dependencies exist.
- **Payroll is intentionally downstream of everything.** It reads finalized, immutable snapshots from all other modules. This is by design — payroll must be deterministic and reproducible.
- **The Audit module has no upward dependencies.** `AuditService` is consumed by all modules but depends on nothing except its own repository. It is the platform's compliance sink.
- **Event-based interactions prevent circular imports.** `OrganizationService` does not import `LeaveBootstrapHandler`. The EventBus decouples the two, allowing future handlers to be added without modifying `OrganizationService`.
- **The Calendar module is a shared utility.** It is not a "domain module" in the M-01 through M-07 sense — it is a utility layer used by Leave and potentially by Attendance for holiday calculations.
