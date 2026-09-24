# Enterprise Core Event Bus & Domain Event Registry

*Synchronized with Backend Architecture (M-01 + M-02 + M-03 + M-04)*

## 1. Architectural Overview
The Enterprise Workforce Management Platform utilizes an in-memory Event Bus (`src/core/events/EventBus.js`) built on native Node.js EventEmitters. Domain services emit structured asynchronous domain events to decouple cross-module side effects and trigger transactional tenant seeding.

### Rules for Event Handlers:
1. **Async-Safe Execution**: All event listeners must wrap execution in `try/catch` blocks so background asynchronous failures never crash the main Node.js thread or cause unhandled rejections.
2. **Centralized Registry**: All event string names MUST be imported from `src/core/constants/events/index.js`. Hardcoding event strings in application logic is strictly prohibited.
3. **Sequential Onboarding**: When `EVENTS.TENANT.PROVISIONED` (`TENANT.PROVISIONED`) is emitted, the `OrganizationBootstrapRegistry` executes registered seeding handlers sequentially inside ACID transactions.

---

## 2. Event Catalog & Payload Registry

| Namespace | Event Constant | Event String | Emitted By | Payload Structure | Subscribed Listeners |
|---|---|---|---|---|---|
| **Tenant** | `EVENTS.TENANT.PROVISIONED` | `TENANT.PROVISIONED` | `OrganizationService.createOrganization` | `{ organizationId, adminUserId }` | `OrganizationBootstrapRegistry` (`DepartmentBootstrapService`, etc.) |
| **User** | `EVENTS.USER.REGISTERED` | `USER.REGISTERED` | `AuthService.registerWithInvite` | `{ userId, organizationId, email }` | Audit logger, future Welcome Email handler |
| **User** | `EVENTS.USER.STATUS_CHANGED` | `USER.STATUS_CHANGED` | `AuthService.changeStatus` | `{ userId, organizationId, status }` | Audit logger, session revocation |
| **Role** | `EVENTS.ROLE.ASSIGNED` | `ROLE.ASSIGNED` | `RoleService.assignRole` | `{ userId, roleId, organizationId, assignedBy }` | `RbacService` user cache invalidation |
| **Permission**| `EVENTS.PERMISSION.UPDATED` | `PERMISSION.UPDATED` | `RoleService.updateRole` | `{ roleId, organizationId, permissions }` | `RbacService` cache invalidation |
| **Department** | `EVENTS.DEPARTMENT.CREATED` | `DEPARTMENT.CREATED` | `DepartmentService.createDepartment` | `{ departmentId, organizationId, name, code, parentCode }` | Audit logger |
| **Department** | `EVENTS.DEPARTMENT.UPDATED` | `DEPARTMENT.UPDATED` | `DepartmentService.updateDepartment` | `{ departmentId, organizationId, changes }` | Audit logger |
| **Department** | `EVENTS.DEPARTMENT.ARCHIVED` | `DEPARTMENT.ARCHIVED` | `DepartmentService.archiveDepartment` | `{ departmentId, organizationId }` | Audit logger |
| **Designation** | `EVENTS.DESIGNATION.CREATED` | `DESIGNATION.CREATED` | `DesignationService.createDesignation` | `{ designationId, organizationId, name, code }` | Audit logger |
| **Designation** | `EVENTS.DESIGNATION.UPDATED` | `DESIGNATION.UPDATED` | `DesignationService.updateDesignation` | `{ designationId, organizationId, changes }` | Audit logger |
| **Designation** | `EVENTS.DESIGNATION.ARCHIVED` | `DESIGNATION.ARCHIVED` | `DesignationService.archiveDesignation` | `{ designationId, organizationId }` | Audit logger |
| **Location** | `EVENTS.LOCATION.CREATED` | `LOCATION.CREATED` | `LocationService.createLocation` | `{ locationId, organizationId, name, code, timezone }` | Audit logger |
| **Location** | `EVENTS.LOCATION.UPDATED` | `LOCATION.UPDATED` | `LocationService.updateLocation` | `{ locationId, organizationId, changes }` | Audit logger |
| **Location** | `EVENTS.LOCATION.ARCHIVED` | `LOCATION.ARCHIVED` | `LocationService.archiveLocation` | `{ locationId, organizationId }` | Audit logger |
| **Shift** | `EVENTS.SHIFT.CREATED` | `SHIFT.CREATED` | `ShiftService.createShift` | `{ shiftId, organizationId, name, code, startTime, endTime }` | Audit logger |
| **Shift** | `EVENTS.SHIFT.UPDATED` | `SHIFT.UPDATED` | `ShiftService.updateShift` | `{ shiftId, organizationId, changes }` | Audit logger |
| **Shift** | `EVENTS.SHIFT.ARCHIVED` | `SHIFT.ARCHIVED` | `ShiftService.archiveShift` | `{ shiftId, organizationId }` | Audit logger |
| **Holiday** | `EVENTS.HOLIDAY.CREATED` | `HOLIDAY_CALENDAR.CREATED` | `HolidayService.setHolidayCalendar` | `{ locationId, organizationId, year }` | Audit logger |
| **Holiday** | `EVENTS.HOLIDAY.UPDATED` | `HOLIDAY_CALENDAR.UPDATED` | `HolidayService.setHolidayCalendar` | `{ locationId, organizationId, year, holidaysCount }` | Audit logger |
| **Employee** | `EVENTS.EMPLOYEE.CREATED` | `EMPLOYEE.CREATED` | `EmployeeService.createEmployee` | `{ employeeId, organizationId, employeeCode, workEmail }` | Audit logger |
| **Employee** | `EVENTS.EMPLOYEE.UPDATED` | `EMPLOYEE.UPDATED` | `EmployeeService.updateProfile` | `{ employeeId, organizationId, changes }` | Audit logger |
| **Employee** | `EVENTS.EMPLOYEE.STATUS_CHANGED` | `EMPLOYEE.STATUS_CHANGED` | `EmployeeService.changeStatus` | `{ employeeId, organizationId, oldStatus, newStatus, reason }` | Audit logger, session suspension check |
| **Employee** | `EVENTS.EMPLOYEE.MANAGER_CHANGED` | `EMPLOYEE.MANAGER_CHANGED` | `EmployeeService.changeManager` | `{ employeeId, organizationId, oldManagerId, newManagerId }` | Audit logger |
| **Employee** | `EVENTS.EMPLOYEE.INVITED` | `EMPLOYEE.INVITED` | `EmployeeService.inviteEmployee` | `{ employeeId, organizationId, invitationId, workEmail }` | Notification service / Email sender |
| **Employee** | `EVENTS.EMPLOYEE.ARCHIVED` | `EMPLOYEE.ARCHIVED` | `EmployeeService.archiveEmployee` | `{ employeeId, organizationId, archiveReason }` | Audit logger |
| **Employee** | `EVENTS.EMPLOYEE.RESTORED` | `EMPLOYEE.RESTORED` | `EmployeeService.restoreEmployee` | `{ employeeId, organizationId }` | Audit logger |
| **Employee** | `EVENTS.EMPLOYEE.USER_LINKED` | `EMPLOYEE.USER_LINKED` | `AuthService.registerWithInvite` | `{ employeeId, userId, organizationId }` | Audit logger |
| **Attendance** | `EVENTS.ATTENDANCE.CLOCKED_IN` | `ATTENDANCE.CLOCKED_IN` | `AttendanceClockService.clockIn` | `{ recordId, employeeId, organizationId, timestamp, eventId }` | Audit logger |
| **Attendance** | `EVENTS.ATTENDANCE.CLOCKED_OUT` | `ATTENDANCE.CLOCKED_OUT` | `AttendanceClockService.clockOut` | `{ recordId, employeeId, organizationId, timestamp, eventId }` | Audit logger |
| **Attendance** | `EVENTS.ATTENDANCE.STATUS_CHANGED` | `ATTENDANCE.STATUS_CHANGED` | `AttendanceService.updateStatus` | `{ recordId, employeeId, organizationId, oldStatus, newStatus }` | Audit logger |
| **Attendance** | `EVENTS.ATTENDANCE.REGULARIZATION_REQUESTED` | `ATTENDANCE.REGULARIZATION_REQUESTED` | `AttendanceRegularizationService.requestRegularization` | `{ regularizationId, recordId, employeeId, organizationId }` | Audit logger |
| **Attendance** | `EVENTS.ATTENDANCE.REGULARIZATION_APPROVED` | `ATTENDANCE.REGULARIZATION_APPROVED` | `AttendanceRegularizationService.approveRegularization` | `{ regularizationId, recordId, employeeId, organizationId, timestamp }` | Audit logger |
| **Attendance** | `EVENTS.ATTENDANCE.REGULARIZATION_REJECTED` | `ATTENDANCE.REGULARIZATION_REJECTED` | `AttendanceRegularizationService.rejectRegularization` | `{ regularizationId, recordId, employeeId, organizationId, timestamp }` | Audit logger |
| **Attendance** | `EVENTS.ATTENDANCE.FINALIZED` | `ATTENDANCE.FINALIZED` | `AttendanceService.finalizeDailyAttendance` | `{ date, organizationId, totalRecords }` | Payroll integration |
| **Attendance** | `EVENTS.ATTENDANCE.LOCKED` | `ATTENDANCE.LOCKED` | `AttendanceService.lockAttendancePeriod` | `{ periodStart, periodEnd, organizationId }` | Audit logger |
| **Attendance** | `EVENTS.ATTENDANCE.PAY_PERIOD_FINALIZED` | `ATTENDANCE.PAY_PERIOD_FINALIZED` | `AttendanceReconciliationService.finalizePayPeriod` | `{ startDate, endDate, organizationId, count }` | Payroll integration / Audit logger |
| **Attendance** | `EVENTS.ATTENDANCE.RECONCILIATION_COMPLETED` | `ATTENDANCE.RECONCILIATION_COMPLETED` | `AttendanceReconciliationService.reconcileStaleSessions` | `{ date, organizationId, reconciledCount }` | Audit logger |
| **Attendance** | `EVENTS.ATTENDANCE.RECORD_RECONCILED` | `ATTENDANCE.RECORD_RECONCILED` | `AttendanceReconciliationService.reconcileStaleSessions` | `{ recordId, employeeId, organizationId }` | Audit logger |
| **Attendance** | `EVENTS.ATTENDANCE.PAYROLL_PROCESSING_STARTED` | `ATTENDANCE.PAYROLL_PROCESSING_STARTED` | `AttendanceReconciliationService.markPayrollProcessing` | `{ startDate, endDate, organizationId }` | Audit logger |
| **Attendance** | `EVENTS.ATTENDANCE.PAYROLL_PROCESSED` | `ATTENDANCE.PAYROLL_PROCESSED` | `AttendanceReconciliationService.markPayrollProcessed` | `{ startDate, endDate, organizationId }` | Audit logger |
| **Attendance** | `EVENTS.ATTENDANCE.PAYROLL_LOCKED` | `ATTENDANCE.PAYROLL_LOCKED` | `AttendanceReconciliationService.lockPayPeriod` | `{ startDate, endDate, organizationId }` | Audit logger |
| **Attendance** | `EVENTS.ATTENDANCE.PAYROLL_STATE_VALIDATION_FAILED` | `ATTENDANCE.PAYROLL_STATE_VALIDATION_FAILED` | `AttendanceReconciliationService.assertPayrollTransition` | `{ currentStatus, nextStatus, organizationId }` | Audit logger / Alerting |
| **Recruitment** | `EVENTS.REQUISITION.CREATED` | `REQUISITION.CREATED` | *Planned* | `{ requisitionId, organizationId }` | Audit logger |
| **Recruitment** | `EVENTS.REQUISITION.APPROVED` | `REQUISITION.APPROVED` | *Planned* | `{ requisitionId, organizationId }` | Audit logger |
| **Recruitment** | `EVENTS.JOB.PUBLISHED` | `JOB.PUBLISHED` | *Planned* | `{ postingId, organizationId }` | External Job Board integrations |
| **Recruitment** | `EVENTS.APPLICATION.SUBMITTED` | `APPLICATION.SUBMITTED` | *Planned* | `{ applicationId, organizationId, candidateId }` | Audit logger |
| **Recruitment** | `EVENTS.APPLICATION.STAGE_CHANGED`| `APPLICATION.STAGE_CHANGED` | *Planned* | `{ applicationId, organizationId, newStage }` | Audit logger |
| **Recruitment** | `EVENTS.APPLICATION.REJECTED` | `APPLICATION.REJECTED` | *Planned* | `{ applicationId, organizationId }` | Audit logger |
| **Recruitment** | `EVENTS.OFFER.CREATED` | `OFFER.CREATED` | *Planned* | `{ offerId, organizationId }` | Audit logger |
| **Recruitment** | `EVENTS.OFFER.ACCEPTED` | `OFFER.ACCEPTED` | *Planned* | `{ offerId, organizationId }` | Audit logger |
| **Recruitment** | `EVENTS.CANDIDATE.HIRED` | `CANDIDATE.HIRED` | *Planned* | `{ candidateId, applicationId, organizationId }` | `EmployeeService` (Employee Profile creation) |
| **Leave** | `EVENTS.LEAVE.REQUESTED` | `LEAVE.REQUESTED` | `LeaveRequestService.submitRequest` | `{ requestId, employeeId, organizationId, leaveCode, startDate, endDate, totalDays }` | Audit logger |
| **Leave** | `EVENTS.LEAVE.APPROVED` | `LEAVE.APPROVED` | `LeaveRequestService.approveRequest` | `{ requestId, employeeId, organizationId, leaveCode, startDate, endDate, totalDays }` | Audit logger, `LeaveSyncService` (Attendance update) |
| **Leave** | `EVENTS.LEAVE.REJECTED` | `LEAVE.REJECTED` | `LeaveRequestService.rejectRequest` | `{ requestId, employeeId, organizationId }` | Audit logger |
| **Leave** | `EVENTS.LEAVE.CANCELLED` | `LEAVE.CANCELLED` | `LeaveRequestService.cancelRequest` | `{ requestId, employeeId, organizationId }` | Audit logger, `LeaveSyncService` (Attendance update) |
| **Leave** | `EVENTS.LEAVE.CANCELLED_BY_CONFLICT` | `LEAVE.CANCELLED_BY_CONFLICT` | `AttendanceConflictService.resolveConflict` | `{ requestId, employeeId, organizationId, resolutionType }` | `LeaveSyncService` (Ledger reversal) |
| **Leave** | `EVENTS.LEAVE.SPLIT_BY_CONFLICT` | `LEAVE.SPLIT_BY_CONFLICT` | `AttendanceConflictService.resolveConflict` | `{ requestId, employeeId, organizationId, remainingDays }` | `LeaveSyncService` (Ledger partial reversal) |
| **Leave** | `EVENTS.LEAVE.SNAPSHOT_CREATED` | `LEAVE.SNAPSHOT_CREATED` | `LeaveSnapshotService.createSnapshot` | `{ cycleIdentifier, snapshotDate, organizationId }` | Audit logger |
| **Attendance** | `EVENTS.ATTENDANCE.CONFLICT_RESOLVED` | `ATTENDANCE.CONFLICT_RESOLVED` | `AttendanceConflictService.resolveConflict` | `{ conflictId, recordId, organizationId, resolutionType }` | `LeaveEventListener` (Triggers Leave Sync mutations) |
| **Payroll** | `EVENTS.PAYROLL.CYCLE_CREATED` | `PAYROLL.CYCLE_CREATED` | `PayrollCycleService.createCycle` | `{ cycleId, cycleIdentifier, organizationId }` | Audit logger |
| **Payroll** | `EVENTS.PAYROLL.CYCLE_STATUS_CHANGED` | `PAYROLL.CYCLE_STATUS_CHANGED` | `PayrollCycleService.updateStatus` | `{ cycleId, oldStatus, newStatus, organizationId }` | Audit logger |
| **Payroll** | `EVENTS.PAYROLL.STRUCTURE_CREATED` | `PAYROLL.STRUCTURE_CREATED` | `SalaryStructureService.createStructure` | `{ structureId, employeeId, designationId, departmentId, organizationId }` | Audit logger |
| **Payroll** | `EVENTS.PAYROLL.REVISION_CREATED` | `PAYROLL.REVISION_CREATED` | `SalaryStructureService.createStructure` | `{ structureId, revisionId, organizationId }` | Audit logger |
| **Payroll** | `EVENTS.PAYROLL.RUN_STARTED` | `PAYROLL.RUN_STARTED` | `PayrollRunService.createRun` | `{ runId, payrollCycleId, organizationId }` | Audit logger |
| **Payroll** | `EVENTS.PAYROLL.RUN_COMPLETED` | `PAYROLL.RUN_COMPLETED` | `PayrollRunService.createRun` | `{ runId, payrollCycleId, totalGross, totalNet, payslipsCount, organizationId }` | Audit logger |
| **Payroll** | `EVENTS.PAYROLL.RUN_FAILED` | `PAYROLL.RUN_FAILED` | `PayrollRunService.createRun` | `{ runId, payrollCycleId, error, organizationId }` | Audit logger / Alerting |
| **Payroll** | `EVENTS.PAYROLL.RUN_LOCKED` | `PAYROLL.RUN_LOCKED` | `PayrollRunService.lockRun` | `{ runId, payrollCycleId, organizationId }` | Audit logger, LeaveSnapshotService |
| **Payroll** | `EVENTS.PAYROLL.PAYSLIPS_GENERATED` | `PAYROLL.PAYSLIPS_GENERATED` | `PayrollRunService.createRun` | `{ runId, count, organizationId }` | Audit logger |
| **Payroll** | `EVENTS.PAYROLL.PAYSLIP_FINALIZED` | `PAYROLL.PAYSLIP_FINALIZED` | `PayrollRunService.finalizePayslip` | `{ payslipId, employeeId, runId, organizationId }` | Audit logger |

---

## 3. Event Delivery Guarantees & Patterns

- **Retry Strategy**: Since `EventBus.js` is an in-memory Node.js `EventEmitter`, failed asynchronous listeners currently log the error via Pino and do not automatically retry. Future phases may introduce Redis Streams or RabbitMQ for persistent retries.
- **Idempotency**: All event listeners MUST be designed idempotently. For example, the `EmployeeService` handling `CANDIDATE.HIRED` must gracefully ignore duplicate triggers if an `Employee` with the same candidate identifier already exists.
- **Ordering**: Events are strictly ordered only within the synchronous thread of emission. Cross-tenant asynchronous handlers are processed concurrently without strict chronological ordering guarantees.
- **Dead-Letter Behavior**: Failed handler exceptions are captured, wrapped with a `DeadLetterContext`, and recorded into the `AuditLog` collection with a severity level of `ERROR`, alerting administrators of the broken workflow state.
