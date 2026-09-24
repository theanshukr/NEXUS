# Payroll Engine (M-07)

## Purpose

This document describes the Payroll module architecture: how payroll cycles work, how salary structures are versioned and hierarchically resolved, how a payroll run executes batch payslip generation, how the state machine enforces lifecycle transitions, and how concurrency protection prevents duplicate runs.

## Architectural Overview

The Payroll module (M-07) is the most complex domain in the system. It coordinates data from five other modules (Attendance, Leave, Employees, Organization Settings, and Statutory Rules) to produce finalized, immutable payslips. The architecture separates **data orchestration** (PayrollRunService) from **pure mathematical computation** (PayrollCalculationEngine and StatutoryDeductionEngine) to enable deterministic, testable salary calculations.

## Core Components

```mermaid
graph TB
    subgraph "HTTP Layer"
        CR["PayrollCycleRoutes"]
        RR["PayrollRunRoutes"]
        PR["PayslipRoutes"]
        SR["SalaryStructureRoutes"]
    end

    subgraph "Service Layer"
        CYC["PayrollCycleService\nCycle open/close/lock"]
        RUN["PayrollRunService\nBatch orchestration"]
        SAL["SalaryStructureService\nHierarchical resolver"]
        FSM["PayrollStateMachineService\nTransition validator"]
        ENG["PayrollCalculationEngine\nPure math — zero DB"]
        SDE["StatutoryDeductionEngine\nTax/PF/ESI computation"]
        FOR["PayrollFormulaService\nFormula lookup"]
    end

    subgraph "Repository Layer"
        CYCRP["PayrollCycleRepository"]
        RUNRP["PayrollRunRepository"]
        SLRP["SalaryStructureRepository"]
        PSRP["PayslipRepository"]
        STRP["StatutoryRuleRepository"]
    end

    CR --> CYC
    CR --> RUN
    CR --> SAL
    RR --> CYC
    RR --> RUN
    RR --> SAL
    PR --> CYC
    PR --> RUN
    PR --> SAL
    SR --> CYC
    SR --> RUN
    SR --> SAL
    RUN --> FSM
    RUN --> ENG
    RUN --> SDE
    RUN --> FOR
    RUN --> SAL
    CYC --> CYCRP
    CYC --> RUNRP
    CYC --> SLRP
    CYC --> PSRP
    CYC --> STRP
    RUN --> CYCRP
    RUN --> RUNRP
    RUN --> SLRP
    RUN --> PSRP
    RUN --> STRP
    SAL --> SLRP
```

## Salary Structure: Hierarchical Resolution

Salary structures are resolved in a **waterfall pattern** — the most specific level wins:

```mermaid
flowchart LR
    EMP_OVR["Employee Override\n(highest priority)"]
    DESIG["Designation\n(role-level structure)"]
    DEPT["Department\n(team-level structure)"]
    ORG_DEF["Organization Default\n(fallback)"]
    NULL["Error: No structure found"]

    EMP_OVR -->|"not found"| DESIG
    DESIG -->|"not found"| DEPT
    DEPT -->|"not found"| ORG_DEF
    ORG_DEF -->|"not found"| NULL
```

## Salary Structure: Point-in-Time Versioning

Salary structures are **immutable and versioned**. When a salary change is required, a new `SalaryStructure` document is created with a new `effectiveFrom` date, and the previous version's `effectiveTo` is updated.

The resolution query for a payroll cycle uses `cycle.cycleEnd` as the cut-off point: the structure where `effectiveFrom <= cycleEnd` is selected. This means:

- A salary effective **January 1** is used for a cycle covering January 1–31.
- A salary effective **July 15** is NOT used for a cycle covering July 1–14; the previous version is used instead.
- The rule is **whole-month, version-as-of-cycle-end**: whichever salary version was in effect on the last day of the cycle is used for the entire cycle.

This is deterministic — re-running payroll for any past cycle always resolves the same salary version.

**Cycle End Date Rule:** `effectiveFrom <= cycleEnd` — the structure effective on the last day of the cycle applies to the whole cycle.

## Payroll Run: Batch Execution Pipeline

```mermaid
flowchart TD
    START["PayrollRunService.createRun(cycleId, actorId, orgId)"]

    subgraph "Pre-flight Checks"
        C1["Fetch PayrollCycle\nassert status = OPEN or PROCESSING"]
        C2["Check active run for cycle\nConflictError if exists"]
        C3["AttendanceReconciliationService\n.assertAllRecordsFinalized()"]
    end

    subgraph "Context Loading"
        L1["Load active PayrollFormula"]
        L2["Load statutory rules"]
        L3["Load OrgSettings (currency, etc.)"]
        L4["Fetch attendance feed\n.getPayrollFeed()"]
        L5["Create PayrollInputSnapshot\nformula version, statutory rule versions"]
    end

    subgraph "ACID Transaction"
        T1["Create PayrollRun record\nstatus: PROCESSING"]
        T2["Update PayrollCycle\nstatus: PROCESSING"]
        T3["Emit PAYROLL_RUN_STARTED"]
    end

    subgraph "Batch Loop: Per Employee"
        E1["Fetch ACTIVE employees"]
        E2["SalaryStructureService\n.resolveForEmployee(emp, orgId, cycleEnd)"]
        E3["LeaveSnapshotService\n.getOrCreateSnapshot()"]
        E4["PayrollCalculationEngine\n.calculate(salarySnap, attendanceSnap, leaveSnap)"]
        E5["Create Payslip record (DRAFT)"]
    end

    COMPLETE["Update PayrollRun to COMPLETED\nUpdate PayrollCycle to COMPLETED"]
    EVENT["EventBus.emit(PAYROLL_RUN_COMPLETED)"]

    START --> C1 --> C2 --> C3
    C3 --> L1
    C3 --> L2
    C3 --> L3
    C3 --> L4
    L1 --> L5
    L2 --> L5
    L3 --> L5
    L4 --> L5
    L5 --> T1
    L5 --> T2
    L5 --> T3
    T3 --> E1 --> E2 --> E3 --> E4 --> E5
    E5 -->|"next employee"| E2
    E5 -->|"all done"| COMPLETE --> EVENT
```

## PayrollCalculationEngine: Pure Math

The `PayrollCalculationEngine` is a **stateless, pure function** — it takes JSON input snapshots and returns a deterministic `PayrollResult`. It makes **zero database calls**.

```mermaid
graph LR
    subgraph "Inputs (Snapshots)"
        SS["SalarySnapshot\nbaseSalary, components"]
        AS["AttendanceSnapshot\npresentDays, overtimeHours, lopDays"]
        LS["LeaveSnapshot\nleaveBalances"]
        SR["StatutoryRules\nPF, ESI, TDS config"]
        FO["Formula\ntotalWorkingDays, roundingRule"]
        AJ["Adjustments\nbonuses, deductions"]
    end

    ENG["PayrollCalculationEngine\n.calculate()"]

    subgraph "Outputs"
        GP["grossPay"]
        NP["netPay"]
        BD["breakdown\nearnings, deductions, statutory"]
    end

    SS --> ENG
    AS --> ENG
    LS --> ENG
    SR --> ENG
    FO --> ENG
    AJ --> ENG
    ENG --> GP
    ENG --> NP
    ENG --> BD
```

Computation steps:
1. Calculate Loss of Pay (LOP) deduction: `(baseSalary / totalWorkingDays) × lopDays`
2. Calculate overtime: `(baseSalary / totalWorkingDays / 8) × 1.5 × overtimeHours`
3. Evaluate component earnings (FIXED + PERCENTAGE_OF_BASE with cap limits)
4. Compute gross pay
5. Apply statutory deductions (PF, ESI, TDS) via `StatutoryDeductionEngine`
6. Apply manual adjustments (bonuses, one-time deductions)
7. Compute net pay; apply rounding rule

## State Machine Transitions

```mermaid
stateDiagram-v2
    [*] --> CycleOPEN: createCycle()
    CycleOPEN --> CyclePROCESSING: createRun()
    CyclePROCESSING --> CycleCOMPLETED: run finishes
    CycleCOMPLETED --> CycleLOCKED: lockCycle()
    CycleLOCKED --> [*]: immutable
```

```mermaid
stateDiagram-v2
    [*] --> RunPROCESSING: createRun()
    RunPROCESSING --> RunCOMPLETED: all payslips generated
    RunCOMPLETED --> RunLOCKED: lockRun()
    RunLOCKED --> [*]: immutable
```

```mermaid
stateDiagram-v2
    [*] --> DRAFT: generated in run
    DRAFT --> FINALIZED: finalizePayslip()
    FINALIZED --> [*]: immutable
```

`PayrollStateMachineService.validateTransition()` is called before every status update. An illegal transition (e.g., `LOCKED → PROCESSING`) throws a `400 AppError` immediately.

## Concurrency Guard

MongoDB enforces **exactly one active payroll run per cycle** via a partial unique index:

```javascript
// PayrollRun model index
{ organizationId: 1, payrollCycleId: 1 },
{ unique: true, partialFilterExpression: {
    status: { $in: ['DRAFT', 'PROCESSING', 'COMPLETED', 'LOCKED'] }
}}
```

If Manager A and Manager B simultaneously click "Run Payroll" for the same cycle:
- Manager A's request creates the run record (succeeds)
- Manager B's request hits the unique index violation (MongoDB E11000 → `409 ConflictError`)

The service-level check (`findOne` for active runs) provides an early-exit before the DB insert, but the index is the hard enforcement layer.

## Key Takeaways

- **Computation is separated from orchestration.** `PayrollCalculationEngine` can be unit-tested with plain JSON without any database or mock setup.
- **Payslips are generated from snapshots, not live data.** Salary structures, attendance, and leave balances are all snapshotted at run time, making payslips fully reproducible.
- **The Cycle End Date Rule is deterministic.** Salary structure resolution for any past cycle will always return the same structure version, regardless of when the query runs.
- **Concurrency is enforced at the database layer.** The partial unique index on `PayrollRun` is a hard guarantee — no application-level locking scheme can be bypassed.
- **Finalized payslips are immutable.** Once a payslip transitions to `FINALIZED`, it cannot be modified. Corrections require creating a new payroll run.
