# Enterprise Immutable Audit Compliance Ledger

*Synchronized with Backend Architecture (M-01 + M-02 + M-03 + M-04)*

## 1. Compliance Architecture & Immutability Rules
The platform maintains a tamper-evident compliance ledger using the `AuditLog` model (`src/modules/audit/models/AuditLog.js`). Every administrative action, security event, tenant mutation, and workforce lifecycle change generates a permanent audit record.

### Immutability Guarantees:
1. **Zero Mutation Policy**: Mongoose pre-update (`pre('updateOne')`, `pre('findOneAndUpdate')`) and pre-delete (`pre('deleteOne')`, `pre('deleteMany')`) hooks intercept any attempted modification or removal of audit records and throw a fatal exception (`preventMutation`).
2. **ACID Transaction Execution**: Audit logs generated during multi-document operations (e.g., organization onboarding, invitation registration, employee creation) are written within the same Mongoose ClientSession transaction as the underlying domain mutation.
3. **Tenant Scope**: Every audit record is strictly indexed by `organizationId`, preventing cross-tenant ledger leakage.

---

## 2. Audit Action String & Metadata Schema Registry

| Module | Action Constant | Action String | Triggered By | Entity Type | Metadata Schema / Captured Context |
|---|---|---|---|---|---|
| **Organization**| `AUDIT_ACTIONS.TENANT_PROVISIONED` | `TENANT_PROVISIONED` | `OrganizationService.createOrganization` | `Organization` | `{ adminUserId, adminEmail, domain, code }` |
| **Auth** | `AUDIT_ACTIONS.USER_REGISTERED` | `USER_REGISTERED` | `AuthService.registerWithInvite` | `User` | `{ inviteId, email, assignedRoleIds }` |
| **Auth** | `AUDIT_ACTIONS.LOGIN_SUCCESS` | `LOGIN_SUCCESS` | `AuthService.login` | `User` | `{ ipAddress, userAgent, sessionId }` |
| **Auth** | `AUDIT_ACTIONS.LOGIN_FAILED` | `LOGIN_FAILED` | `AuthService.login` | `User` / `System` | `{ email, ipAddress, attemptCount, failureReason }` |
| **Auth** | `AUDIT_ACTIONS.ACCOUNT_LOCKED` | `ACCOUNT_LOCKED` | `AuthService.login` (5th failure) | `User` | `{ email, ipAddress, lockDuration }` |
| **Roles** | `AUDIT_ACTIONS.ROLE_CREATED` | `ROLE_CREATED` | `RoleService.createRole` / `duplicateRole` | `Role` | `{ name, priority, permissionsCount }` |
| **Roles** | `AUDIT_ACTIONS.ROLE_UPDATED` | `ROLE_UPDATED` | `RoleService.updateRole` | `Role` | `{ addedPermissions, removedPermissions }` |
| **Roles** | `AUDIT_ACTIONS.ROLE_DELETED` | `ROLE_DELETED` | `RoleService.deleteRole` | `Role` | `{ name, priority }` |
| **Roles** | `AUDIT_ACTIONS.ROLE_ASSIGNED` | `ROLE_ASSIGNED` | `RoleService.assignRole` | `UserRole` | `{ targetUserId, roleId, roleName }` |
| **Roles** | `AUDIT_ACTIONS.ROLE_REMOVED` | `ROLE_REMOVED` | `RoleService.removeRole` | `UserRole` | `{ targetUserId, roleId, roleName }` |
| **Delegation** | `AUDIT_ACTIONS.POLICY_CREATED` | `POLICY_CREATED` | `RoleDelegationService.createPolicy` | `RoleDelegationPolicy` | `{ sourceRoleId, targetRoleId }` |
| **Delegation** | `AUDIT_ACTIONS.POLICY_DELETED` | `POLICY_DELETED` | `RoleDelegationService.deletePolicy` | `RoleDelegationPolicy` | `{ sourceRoleId, targetRoleId }` |
| **Invites** | `AUDIT_ACTIONS.INVITATION_CREATED` | `INVITATION_CREATED` | `InviteService.createInvite` | `Invitation` | `{ inviteeEmail, defaultRoleIds, expiresAt }` |
| **Invites** | `AUDIT_ACTIONS.INVITATION_REVOKED` | `INVITATION_REVOKED` | `InviteService.revokeInvite` | `Invitation` | `{ inviteeEmail, reason }` |
| **Departments** | `AUDIT_ACTIONS.DEPARTMENT_CREATED` | `DEPARTMENT_CREATED` | `DepartmentService.createDepartment` | `Department` | `{ name, code, parentCode }` |
| **Departments** | `AUDIT_ACTIONS.DEPARTMENT_UPDATED` | `DEPARTMENT_UPDATED` | `DepartmentService.updateDepartment` | `Department` | `{ updatedFields }` |
| **Departments** | `AUDIT_ACTIONS.DEPARTMENT_MOVED` | `DEPARTMENT_MOVED` | `DepartmentService.moveDepartment` | `Department` | `{ oldParentCode, newParentCode }` |
| **Departments** | `AUDIT_ACTIONS.DEPARTMENT_ARCHIVED`| `DEPARTMENT_ARCHIVED` | `DepartmentService.archiveDepartment`| `Department` | `{ code, name }` |
| **Designations**| `AUDIT_ACTIONS.DESIGNATION_CREATED`| `DESIGNATION_CREATED`| `DesignationService.createDesignation`| `Designation` | `{ name, code }` |
| **Designations**| `AUDIT_ACTIONS.DESIGNATION_UPDATED`| `DESIGNATION_UPDATED`| `DesignationService.updateDesignation`| `Designation` | `{ updatedFields }` |
| **Designations**| `AUDIT_ACTIONS.DESIGNATION_ARCHIVED`| `DESIGNATION_ARCHIVED`| `DesignationService.archiveDesignation`| `Designation` | `{ code, name }` |
2. **ACID Transaction Execution**: Audit logs generated during multi-document operations (e.g., organization onboarding, invitation registration, employee creation) are written within the same Mongoose ClientSession transaction as the underlying domain mutation.
3. **Tenant Scope**: Every audit record is strictly indexed by `organizationId`, preventing cross-tenant ledger leakage.

---

## 2. Audit Action String & Metadata Schema Registry

| Module | Action Constant | Action String | Triggered By | Entity Type | Metadata Schema / Captured Context |
|---|---|---|---|---|---|
| **Organization**| `AUDIT_ACTIONS.TENANT_PROVISIONED` | `TENANT_PROVISIONED` | `OrganizationService.createOrganization` | `Organization` | `{ adminUserId, adminEmail, domain, code }` |
| **Auth** | `AUDIT_ACTIONS.USER_REGISTERED` | `USER_REGISTERED` | `AuthService.registerWithInvite` | `User` | `{ inviteId, email, assignedRoleIds }` |
| **Auth** | `AUDIT_ACTIONS.LOGIN_SUCCESS` | `LOGIN_SUCCESS` | `AuthService.login` | `User` | `{ ipAddress, userAgent, sessionId }` |
| **Auth** | `AUDIT_ACTIONS.LOGIN_FAILED` | `LOGIN_FAILED` | `AuthService.login` | `User` / `System` | `{ email, ipAddress, attemptCount, failureReason }` |
| **Auth** | `AUDIT_ACTIONS.ACCOUNT_LOCKED` | `ACCOUNT_LOCKED` | `AuthService.login` (5th failure) | `User` | `{ email, ipAddress, lockDuration }` |
| **Roles** | `AUDIT_ACTIONS.ROLE_CREATED` | `ROLE_CREATED` | `RoleService.createRole` / `duplicateRole` | `Role` | `{ name, priority, permissionsCount }` |
| **Roles** | `AUDIT_ACTIONS.ROLE_UPDATED` | `ROLE_UPDATED` | `RoleService.updateRole` | `Role` | `{ addedPermissions, removedPermissions }` |
| **Roles** | `AUDIT_ACTIONS.ROLE_DELETED` | `ROLE_DELETED` | `RoleService.deleteRole` | `Role` | `{ name, priority }` |
| **Roles** | `AUDIT_ACTIONS.ROLE_ASSIGNED` | `ROLE_ASSIGNED` | `RoleService.assignRole` | `UserRole` | `{ targetUserId, roleId, roleName }` |
| **Roles** | `AUDIT_ACTIONS.ROLE_REMOVED` | `ROLE_REMOVED` | `RoleService.removeRole` | `UserRole` | `{ targetUserId, roleId, roleName }` |
| **Delegation** | `AUDIT_ACTIONS.POLICY_CREATED` | `POLICY_CREATED` | `RoleDelegationService.createPolicy` | `RoleDelegationPolicy` | `{ sourceRoleId, targetRoleId }` |
| **Delegation** | `AUDIT_ACTIONS.POLICY_DELETED` | `POLICY_DELETED` | `RoleDelegationService.deletePolicy` | `RoleDelegationPolicy` | `{ sourceRoleId, targetRoleId }` |
| **Invites** | `AUDIT_ACTIONS.INVITATION_CREATED` | `INVITATION_CREATED` | `InviteService.createInvite` | `Invitation` | `{ inviteeEmail, defaultRoleIds, expiresAt }` |
| **Invites** | `AUDIT_ACTIONS.INVITATION_REVOKED` | `INVITATION_REVOKED` | `InviteService.revokeInvite` | `Invitation` | `{ inviteeEmail, reason }` |
| **Departments** | `AUDIT_ACTIONS.DEPARTMENT_CREATED` | `DEPARTMENT_CREATED` | `DepartmentService.createDepartment` | `Department` | `{ name, code, parentCode }` |
| **Departments** | `AUDIT_ACTIONS.DEPARTMENT_UPDATED` | `DEPARTMENT_UPDATED` | `DepartmentService.updateDepartment` | `Department` | `{ updatedFields }` |
| **Departments** | `AUDIT_ACTIONS.DEPARTMENT_MOVED` | `DEPARTMENT_MOVED` | `DepartmentService.moveDepartment` | `Department` | `{ oldParentCode, newParentCode }` |
| **Departments** | `AUDIT_ACTIONS.DEPARTMENT_ARCHIVED`| `DEPARTMENT_ARCHIVED` | `DepartmentService.archiveDepartment`| `Department` | `{ code, name }` |
| **Designations**| `AUDIT_ACTIONS.DESIGNATION_CREATED`| `DESIGNATION_CREATED`| `DesignationService.createDesignation`| `Designation` | `{ name, code }` |
| **Designations**| `AUDIT_ACTIONS.DESIGNATION_UPDATED`| `DESIGNATION_UPDATED`| `DesignationService.updateDesignation`| `Designation` | `{ updatedFields }` |
| **Designations**| `AUDIT_ACTIONS.DESIGNATION_ARCHIVED`| `DESIGNATION_ARCHIVED`| `DesignationService.archiveDesignation`| `Designation` | `{ code, name }` |
| **Locations** | `AUDIT_ACTIONS.LOCATION_CREATED` | `LOCATION_CREATED` | `LocationService.createLocation` | `Location` | `{ name, code, timezone }` |
| **Locations** | `AUDIT_ACTIONS.LOCATION_UPDATED` | `LOCATION_UPDATED` | `LocationService.updateLocation` | `Location` | `{ updatedFields }` |
| **Locations** | `AUDIT_ACTIONS.LOCATION_ARCHIVED`| `LOCATION_ARCHIVED` | `LocationService.archiveLocation` | `Location` | `{ code, name }` |
| **Shifts** | `AUDIT_ACTIONS.SHIFT_CREATED` | `SHIFT_CREATED` | `ShiftService.createShift` | `Shift` | `{ name, code, startTime, endTime }` |
| **Shifts** | `AUDIT_ACTIONS.SHIFT_UPDATED` | `SHIFT_UPDATED` | `ShiftService.updateShift` | `Shift` | `{ updatedFields }` |
| **Shifts** | `AUDIT_ACTIONS.SHIFT_ARCHIVED` | `SHIFT_ARCHIVED` | `ShiftService.archiveShift` | `Shift` | `{ code, name }` |
| **Holidays** | `AUDIT_ACTIONS.HOLIDAY_UPDATED` | `HOLIDAY_UPDATED` | `HolidayService.setHolidayCalendar` | `HolidayCalendar` | `{ locationId, year, totalHolidays }` |
| **Employees** | `AUDIT_ACTIONS.EMPLOYEE_CREATED` | `EMPLOYEE_CREATED` | `EmployeeService.createEmployee` | `Employee` | `{ employeeCode, firstName, lastName, departmentId }` |
| **Employees** | `AUDIT_ACTIONS.EMPLOYEE_UPDATED` | `EMPLOYEE_UPDATED` | `EmployeeService.updateProfile` | `Employee` | `{ employeeCode, updatedFields, changeReason }` |
| **Employees** | `AUDIT_ACTIONS.EMPLOYEE_STATUS_CHANGED`| `EMPLOYEE_STATUS_CHANGED`| `EmployeeService.changeStatus` | `Employee` | `{ employeeCode, oldStatus, newStatus, reason }` |
| **Employees** | `AUDIT_ACTIONS.EMPLOYEE_MANAGER_CHANGED`| `EMPLOYEE_MANAGER_CHANGED`| `EmployeeService.changeManager` | `Employee` | `{ employeeCode, oldManagerId, newManagerId }` |
| **Employees** | `AUDIT_ACTIONS.EMPLOYEE_INVITED` | `EMPLOYEE_INVITED` | `EmployeeService.inviteEmployee` | `Employee` | `{ employeeCode, workEmail, invitationId }` |
| **Employees** | `AUDIT_ACTIONS.EMPLOYEE_ARCHIVED`| `EMPLOYEE_ARCHIVED` | `EmployeeService.archiveEmployee` | `Employee` | `{ employeeCode, archiveReason }` |
| **Employees** | `AUDIT_ACTIONS.EMPLOYEE_RESTORED`| `EMPLOYEE_RESTORED` | `EmployeeService.restoreEmployee` | `Employee` | `{ employeeCode }` |
| **Attendance** | `AUDIT_ACTIONS.ATTENDANCE_CLOCKED_IN` | `ATTENDANCE_CLOCKED_IN` | `AttendanceClockService.clockIn` | `AttendanceRecord` | `{ date, shiftId, geofenceValid }` |
| **Attendance** | `AUDIT_ACTIONS.ATTENDANCE_CLOCKED_OUT` | `ATTENDANCE_CLOCKED_OUT` | `AttendanceClockService.clockOut` | `AttendanceRecord` | `{ date, calculatedHours }` |
| **Attendance** | `AUDIT_ACTIONS.REGULARIZATION_REQUESTED` | `REGULARIZATION_REQUESTED` | `AttendanceRegularizationService.requestRegularization` | `AttendanceRegularization` | `{ date, type, reason }` |
| **Attendance** | `AUDIT_ACTIONS.REGULARIZATION_APPROVED` | `REGULARIZATION_APPROVED` | `AttendanceRegularizationService.approve` | `AttendanceRegularization` | `{ date, managerId, newCalculatedHours }` |
| **Attendance** | `AUDIT_ACTIONS.REGULARIZATION_REJECTED` | `REGULARIZATION_REJECTED` | `AttendanceRegularizationService.reject` | `AttendanceRegularization` | `{ date, managerId }` |
| **Attendance** | `AUDIT_ACTIONS.RECONCILE_STALE_ATTENDANCE` | `RECONCILE_STALE_ATTENDANCE` | `AttendanceReconciliationService.reconcileStaleSessions` | `AttendanceRecord` | `{ date, reconciledCount }` |
| **Attendance** | `AUDIT_ACTIONS.FINALIZE_PAY_PERIOD` | `FINALIZE_PAY_PERIOD` | `AttendanceReconciliationService.finalizePayPeriod` | `AttendanceRecord` | `{ startDate, endDate, count }` |
| **Attendance** | `AUDIT_ACTIONS.PAYROLL_PROCESSING_STARTED` | `PAYROLL_PROCESSING_STARTED` | `AttendanceReconciliationService.markPayrollProcessing` | `AttendanceRecord` | `{ startDate, endDate }` |
| **Attendance** | `AUDIT_ACTIONS.PAYROLL_PROCESSED` | `PAYROLL_PROCESSED` | `AttendanceReconciliationService.markPayrollProcessed` | `AttendanceRecord` | `{ startDate, endDate }` |
| **Attendance** | `AUDIT_ACTIONS.PAYROLL_LOCKED` | `PAYROLL_LOCKED` | `AttendanceReconciliationService.lockPayPeriod` | `AttendanceRecord` | `{ startDate, endDate }` |
| **Recruitment** | `AUDIT_ACTIONS.REQUISITION_CREATED` | `REQUISITION_CREATED` | `JobRequisitionService.createRequisition` | `JobRequisition` | `{ title, departmentId, headcount }` |
| **Recruitment** | `AUDIT_ACTIONS.REQUISITION_APPROVED` | `REQUISITION_APPROVED` | `JobRequisitionService.approveRequisition` | `JobRequisition` | `{ title, currentTier, status }` |
| **Recruitment** | `AUDIT_ACTIONS.JOB_PUBLISHED` | `JOB_PUBLISHED` | `JobPostingService.publishJob` | `JobPosting` | `{ title, platforms }` |
| **Recruitment** | `AUDIT_ACTIONS.APPLICATION_SUBMITTED` | `APPLICATION_SUBMITTED` | `JobApplicationService.submit` | `JobApplication` | `{ candidateId, source }` |
| **Recruitment** | `AUDIT_ACTIONS.APPLICATION_STAGE_CHANGED` | `APPLICATION_STAGE_CHANGED` | `JobApplicationService.advanceStage` | `JobApplication` | `{ oldStage, newStage }` |
| **Recruitment** | `AUDIT_ACTIONS.APPLICATION_REJECTED` | `APPLICATION_REJECTED` | `JobApplicationService.reject` | `JobApplication` | `{ reason }` |
| **Recruitment** | `AUDIT_ACTIONS.OFFER_CREATED` | `OFFER_CREATED` | `OfferService.createOffer` | `Offer` | `{ applicationId, salary }` |
| **Recruitment** | `AUDIT_ACTIONS.OFFER_ACCEPTED` | `OFFER_ACCEPTED` | `OfferService.acceptOffer` | `Offer` | `{ applicationId }` |
| **Leave** | `AUDIT_ACTIONS.LEAVE_REQUESTED` | `LEAVE_REQUESTED` | `LeaveRequestService.submitRequest` | `LeaveRequest` | `{ leaveCode, totalDays }` |
| **Leave** | `AUDIT_ACTIONS.LEAVE_APPROVED` | `LEAVE_APPROVED` | `LeaveRequestService.approveRequest` | `LeaveRequest` | `{ leaveCode, totalDays }` |
| **Leave** | `AUDIT_ACTIONS.LEAVE_REJECTED` | `LEAVE_REJECTED` | `LeaveRequestService.rejectRequest` | `LeaveRequest` | `{ leaveCode, totalDays }` |
| **Leave** | `AUDIT_ACTIONS.LEAVE_CANCELLED` | `LEAVE_CANCELLED` | `LeaveRequestService.cancelRequest` | `LeaveRequest` | `{ leaveCode, totalDays }` |
| **Leave** | `AUDIT_ACTIONS.LEAVE_SNAPSHOT_CREATED` | `LEAVE_SNAPSHOT_CREATED` | `LeaveSnapshotService.createSnapshot` | `LeaveSnapshot` | `{ cycleIdentifier }` |
| **Leave** | `AUDIT_ACTIONS.LEAVE_LEDGER_MUTATED` | `LEAVE_LEDGER_MUTATED` | `LeaveBalanceService` | `LeaveBalance` | `{ leaveCode, daysDelta }` |
