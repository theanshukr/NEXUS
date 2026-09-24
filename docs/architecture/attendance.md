# Attendance Module Architecture (M-05)

**Status:** COMPLETE & FROZEN  
**Milestones:** Milestone 2.5 (Core Transactions & Regularizations), Milestone 3 (Reporting & Analytics), & Milestone 3.5 (Reconciliation & Payroll Feed)

This document provides definitive architectural documentation for the Attendance tracking, Regularization, and Reconciliation workflow domain. It serves as the foundational data layer for downstream Leave Management (M-06) and Payroll (M-07) modules.

---

## 🏛️ Layered Architecture & Separation of Concerns

The attendance module strictly follows the NexusOps modular monolith layered architecture pattern:
$$\text{Routes} \longrightarrow \text{Controllers} \longrightarrow \text{Services} \longrightarrow \text{Repositories} \longrightarrow \text{Mongoose Models}$$

### 1. Route Layer (`src/modules/attendance/routes/`)
Provides a unified boundary mounted globally at `/api/v1/attendance` and `/api/v1/attendance-policies` by composing specific sub-routers:
- **`attendanceOperationalRoutes.js`**: Core operational actions (`POST /clock-in`, `POST /clock-out`, `GET /today`, `GET /me`).
- **`attendanceReportRoutes.js`**: Universal reporting, exporting, and analytics endpoints (`GET /reports`, `GET /dashboard`, `GET /export`).
- **`regularizationRoutes.js`**: Workflow transitions and approvals (`POST /regularizations`, `GET /regularizations`, `POST /regularizations/:id/approve`, `POST /regularizations/:id/reject`).
- **`attendancePolicyRoutes.js`**: Global attendance policy configuration endpoints.

### 2. Controller Layer (`src/modules/attendance/controllers/`)
Enforces strict Single Responsibility Principle (SRP) for HTTP transport:
- **`AttendanceController`**: Only handles immediate employee operational actions (`clockIn`, `clockOut`, `getToday`, `getMyAttendance`).
- **`AttendanceReportController`**: Handles all analytical aggregations and dashboard widgets. Automatically down-scopes query filters to `employeeId = req.user.userId` if the requester lacks global `ATTENDANCE.READ` permissions.
- **`RegularizationController`**: Manages regularization requests and manager review workflows.
- **`AttendancePolicyController`**: Manages tenant-level global policy administration.

### 3. Service Layer (`src/modules/attendance/services/`)
Encapsulates all domain logic, workflow state machines, and cross-module transactions:
- **`AttendanceClockService`**: Validates geofencing boundaries against location metadata, logs IP addresses, and enforces strict clock-in/out state transitions.
- **`AttendanceReportService`**: Orchestrates paginated aggregation pipelines and high-performance direct-to-buffer binary streaming for CSV and Excel exports.
- **`AttendanceRegularizationService`**: Controls workflow state machine transitions (`PENDING` $\rightarrow$ `APPROVED`/`REJECTED`) inside ACID transactions.
- **`AttendanceCalculationService`**: Core domain logic for calculating working hours, overtime hours, and late/early departure intervals.
- **`AttendanceDashboardService`**: Composes analytics widgets internally reused across the executive dashboard.
- **`AttendancePolicyService`**: Manages policy caching and rule evaluation.

### 4. Repository Layer (`src/modules/attendance/repositories/`)
Data access logic is strictly divided between write (CRUD) and read (Aggregation) paradigms:
- **`AttendanceRecordRepository`**: Handles CRUD mutations and basic lookups. Inherits from `BaseRepository` for automatic multi-tenant isolation (`organizationId`).
- **`AttendanceReportRepository`**: Native MongoDB aggregation pipelines. Enforces `{ organizationId: ObjectId, date: ... }` as the initial `$match` stage to maximize compound index performance.
- **`AttendanceRegularizationRepository`**: Handles regularization document persistence and status transitions.
- **`AttendancePolicyRepository`**: Handles policy data access.

---

## ⚡ Index & Performance Optimization

All attendance queries are backed by compound indexes defined in `AttendanceRecord`:
1. `{ organizationId: 1, employeeId: 1, date: 1 }` (Unique constraint enforcing one attendance record per employee per working day).
2. `{ organizationId: 1, date: 1 }` (Optimizes date-range report scans and exports).
3. `{ organizationId: 1, employeeId: 1, attendanceStatus: 1 }` (Optimizes manager team views and attendance history queries).
4. `{ organizationId: 1, attendanceStatus: 1 }` (Optimizes org-wide analytics and leaderboards).
5. `{ organizationId: 1, workflowStatus: 1 }` (Optimizes pending regularization workflows).

---

## ✉️ Domain Events & Event Sourcing

The attendance engine communicates with downstream modules asynchronously via `EventBus`:
- **`ATTENDANCE.RECORD_CREATED`**: Emitted when an employee clocks in for the first time on a working day.
- **`ATTENDANCE.CLOCKED_IN`**: Emitted upon subsequent clock-in events.
- **`ATTENDANCE.CLOCKED_OUT`**: Emitted upon clock-out, triggering recalculation of daily working and overtime hours.
- **`ATTENDANCE.REGULARIZATION_REQUESTED`**: Emitted when a regularization is submitted for review.
- **`ATTENDANCE.REGULARIZATION_APPROVED`**: Emitted when a manager approves a regularization request.
- **`ATTENDANCE.REGULARIZATION_REJECTED`**: Emitted when a regularization request is rejected.
- **`ATTENDANCE.RECORD_UPDATED`**: Emitted when a regularization recalculation modifies an existing attendance record. **Critical dependency for Payroll (M-07).**
- **`ATTENDANCE.PAY_PERIOD_FINALIZED`**: Emitted when a pay period is finalized.
- **`ATTENDANCE.PAYROLL_PROCESSING_STARTED` / `PROCESSED` / `LOCKED`**: Lifecycle events emitted during M-07 Payroll execution.

---

## 🔒 Extension Points & Stable API Contract

Because M-05 is frozen and relied upon by downstream systems:
1. **No Breaking Schema Changes**: Any future modifications to `AttendanceRecord` or `AttendanceRegularization` schemas must include schema migration strategies and full regression test coverage.
2. **Report Integrity**: All AI tools, executive dashboards, and frontend data tables consume reports through the unified `AttendanceReportQuery` DTO via `GET /api/v1/attendance/reports`. Never duplicate aggregation queries directly in controllers or downstream services.
