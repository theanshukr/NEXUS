# Enterprise Frontend REST API Directory

*Version 1.0 | Synchronized with Backend Architecture (M-01 + M-02 + M-03)*

This directory provides complete REST API documentation for frontend and client developers integrating with the Enterprise Workforce Management Platform.

---

## 📂 API Endpoint Directory by Module

### 1. Authentication (`/api/v1/auth`)
- [`POST /login`](file:///d:/Programming/Intern/Xebia/MainProject/docs/frontend-api/auth/login.md) - Authenticate user session
- [`POST /refresh`](file:///d:/Programming/Intern/Xebia/MainProject/docs/frontend-api/auth/refresh.md) - Rotate access and refresh tokens
- [`POST /register-invite`](file:///d:/Programming/Intern/Xebia/MainProject/docs/frontend-api/auth/register-invite.md) - Register account via invitation token
- [`POST /logout`](file:///d:/Programming/Intern/Xebia/MainProject/docs/frontend-api/auth/logout.md) - Terminate session and revoke tokens
- [`GET /me`](file:///d:/Programming/Intern/Xebia/MainProject/docs/frontend-api/auth/me.md) - Get current user profile and RBAC permissions

### 2. Organizations (`/api/v1/organizations`)
- [`POST /`](file:///d:/Programming/Intern/Xebia/MainProject/docs/frontend-api/organizations/create-organization.md) - Provision new organization tenant
- [`GET /me`](file:///d:/Programming/Intern/Xebia/MainProject/docs/frontend-api/organizations/get-my-organization.md) - Get tenant details and configuration

### 3. Roles & RBAC (`/api/v1/roles`)
- [`GET /system-permissions`](file:///d:/Programming/Intern/Xebia/MainProject/docs/frontend-api/roles/get-system-permissions.md) - List all atomic permission strings
- [`GET /`](file:///d:/Programming/Intern/Xebia/MainProject/docs/frontend-api/roles/get-roles.md) - List role definitions
- [`POST /`](file:///d:/Programming/Intern/Xebia/MainProject/docs/frontend-api/roles/create-role.md) - Create custom RBAC role
- [`PUT /:id`](file:///d:/Programming/Intern/Xebia/MainProject/docs/frontend-api/roles/update-role.md) - Update custom role permissions/metadata
- [`POST /:id/duplicate`](file:///d:/Programming/Intern/Xebia/MainProject/docs/frontend-api/roles/duplicate-role.md) - Duplicate existing role
- [`DELETE /:id`](file:///d:/Programming/Intern/Xebia/MainProject/docs/frontend-api/roles/delete-role.md) - Delete custom role
- [`POST /assign`](file:///d:/Programming/Intern/Xebia/MainProject/docs/frontend-api/roles/assign-role.md) - Assign role to user
- [`POST /remove`](file:///d:/Programming/Intern/Xebia/MainProject/docs/frontend-api/roles/remove-role.md) - Remove role from user

### 4. Role Delegation (`/api/v1/role-delegation-policies`)
- [`GET /`](file:///d:/Programming/Intern/Xebia/MainProject/docs/frontend-api/role-delegation/get-policies.md) - List delegation rules
- [`POST /`](file:///d:/Programming/Intern/Xebia/MainProject/docs/frontend-api/role-delegation/create-policy.md) - Create delegation rule
- [`DELETE /:id`](file:///d:/Programming/Intern/Xebia/MainProject/docs/frontend-api/role-delegation/delete-policy.md) - Delete delegation rule

### 5. Invitations (`/api/v1/invites`)
- [`GET /validate/:token`](file:///d:/Programming/Intern/Xebia/MainProject/docs/frontend-api/invitations/validate-token.md) - Validate onboarding token
- [`POST /`](file:///d:/Programming/Intern/Xebia/MainProject/docs/frontend-api/invitations/create-invite.md) - Create and send invitation
- [`GET /`](file:///d:/Programming/Intern/Xebia/MainProject/docs/frontend-api/invitations/get-invites.md) - List organization invitations
- [`DELETE /:id`](file:///d:/Programming/Intern/Xebia/MainProject/docs/frontend-api/invitations/revoke-invite.md) - Revoke invitation

### 6. Departments (`/api/v1/departments`)
- [`GET /`](file:///d:/Programming/Intern/Xebia/MainProject/docs/frontend-api/departments/get-departments.md) - List departments
- [`GET /tree`](file:///d:/Programming/Intern/Xebia/MainProject/docs/frontend-api/departments/get-department-tree.md) - Get hierarchical tree
- [`GET /select-options`](file:///d:/Programming/Intern/Xebia/MainProject/docs/frontend-api/departments/get-select-options.md) - Get UI selector options
- [`GET /:id`](file:///d:/Programming/Intern/Xebia/MainProject/docs/frontend-api/departments/get-department-by-id.md) - Get department details
- [`POST /`](file:///d:/Programming/Intern/Xebia/MainProject/docs/frontend-api/departments/create-department.md) - Create department
- [`PUT /:id`](file:///d:/Programming/Intern/Xebia/MainProject/docs/frontend-api/departments/update-department.md) - Update department
- [`POST /:id/move`](file:///d:/Programming/Intern/Xebia/MainProject/docs/frontend-api/departments/move-department.md) - Reorganize parent-child hierarchy
- [`DELETE /:id`](file:///d:/Programming/Intern/Xebia/MainProject/docs/frontend-api/departments/archive-department.md) - Soft-delete department

### 7. Designations (`/api/v1/designations`)
- [`POST /`](file:///d:/Programming/Intern/Xebia/MainProject/docs/frontend-api/designations/create-designation.md) - Create designation
- [`GET /`](file:///d:/Programming/Intern/Xebia/MainProject/docs/frontend-api/designations/get-designations.md) - List designations
- [`GET /:id`](file:///d:/Programming/Intern/Xebia/MainProject/docs/frontend-api/designations/get-designation-by-id.md) - Get designation details
- [`PATCH /:id`](file:///d:/Programming/Intern/Xebia/MainProject/docs/frontend-api/designations/update-designation.md) - Update designation
- [`POST /:id/archive`](file:///d:/Programming/Intern/Xebia/MainProject/docs/frontend-api/designations/archive-designation.md) - Soft-delete designation

### 8. Locations (`/api/v1/locations`)
- [`POST /`](file:///d:/Programming/Intern/Xebia/MainProject/docs/frontend-api/locations/create-location.md) - Create office location
- [`GET /`](file:///d:/Programming/Intern/Xebia/MainProject/docs/frontend-api/locations/get-locations.md) - List locations
- [`GET /:id`](file:///d:/Programming/Intern/Xebia/MainProject/docs/frontend-api/locations/get-location-by-id.md) - Get location details
- [`PATCH /:id`](file:///d:/Programming/Intern/Xebia/MainProject/docs/frontend-api/locations/update-location.md) - Update location
- [`POST /:id/archive`](file:///d:/Programming/Intern/Xebia/MainProject/docs/frontend-api/locations/archive-location.md) - Soft-delete location

### 9. Shifts (`/api/v1/shifts`)
- [`POST /`](file:///d:/Programming/Intern/Xebia/MainProject/docs/frontend-api/shifts/create-shift.md) - Create work shift
- [`GET /`](file:///d:/Programming/Intern/Xebia/MainProject/docs/frontend-api/shifts/get-shifts.md) - List shifts
- [`GET /:id`](file:///d:/Programming/Intern/Xebia/MainProject/docs/frontend-api/shifts/get-shift-by-id.md) - Get shift details
- [`PATCH /:id`](file:///d:/Programming/Intern/Xebia/MainProject/docs/frontend-api/shifts/update-shift.md) - Update shift schedule
- [`POST /:id/archive`](file:///d:/Programming/Intern/Xebia/MainProject/docs/frontend-api/shifts/archive-shift.md) - Soft-delete shift

### 10. Holidays (`/api/v1/locations/:locationId/holidays`)
- [`GET /:year`](file:///d:/Programming/Intern/Xebia/MainProject/docs/frontend-api/holidays/get-holiday-calendar.md) - Get holiday calendar for year
- [`PUT /:year`](file:///d:/Programming/Intern/Xebia/MainProject/docs/frontend-api/holidays/create-or-update-holiday-calendar.md) - Create/update holiday calendar

### 11. Employees (`/api/v1/employees`)
- [`GET /`](file:///d:/Programming/Intern/Xebia/MainProject/docs/frontend-api/employees/get-employees.md) - List workforce directory
- [`GET /org-chart`](file:///d:/Programming/Intern/Xebia/MainProject/docs/frontend-api/employees/get-org-chart.md) - Get reporting hierarchy tree
- [`GET /:id`](file:///d:/Programming/Intern/Xebia/MainProject/docs/frontend-api/employees/get-employee-by-id.md) - Get employee profile & history
- [`POST /`](file:///d:/Programming/Intern/Xebia/MainProject/docs/frontend-api/employees/create-employee.md) - Provision new employee
- [`PATCH /:id/profile`](file:///d:/Programming/Intern/Xebia/MainProject/docs/frontend-api/employees/update-profile.md) - Modify biographical/department info
- [`PUT /:id/status`](file:///d:/Programming/Intern/Xebia/MainProject/docs/frontend-api/employees/change-status.md) - Change business status
- [`PUT /:id/manager`](file:///d:/Programming/Intern/Xebia/MainProject/docs/frontend-api/employees/change-manager.md) - Reassign reporting manager
- [`POST /:id/invite`](file:///d:/Programming/Intern/Xebia/MainProject/docs/frontend-api/employees/invite-employee.md) - Issue onboarding invitation
- [`POST /:id/archive`](file:///d:/Programming/Intern/Xebia/MainProject/docs/frontend-api/employees/archive-employee.md) - Soft-delete employee
- [`POST /:id/restore`](file:///d:/Programming/Intern/Xebia/MainProject/docs/frontend-api/employees/restore-employee.md) - Restore archived employee

### 12. Attendance Management (`/api/v1/attendance`)
- [`POST /clock-in`](file:///d:/Programming/Intern/Xebia/MainProject/docs/frontend-api/attendance/clock-in.md) - Record GPS clock-in
- [`POST /clock-out`](file:///d:/Programming/Intern/Xebia/MainProject/docs/frontend-api/attendance/clock-out.md) - Record GPS clock-out
- [`GET /today`](file:///d:/Programming/Intern/Xebia/MainProject/docs/frontend-api/attendance/get-today.md) - Get today's clock status
- [`GET /me`](file:///d:/Programming/Intern/Xebia/MainProject/docs/frontend-api/attendance/get-me.md) - Get employee attendance history
- [`GET /reports`](file:///d:/Programming/Intern/Xebia/MainProject/docs/frontend-api/attendance/get-reports.md) - Universal reporting & leaderboards
- [`GET /dashboard`](file:///d:/Programming/Intern/Xebia/MainProject/docs/frontend-api/attendance/get-dashboard.md) - Executive dashboard widgets
- [`GET /export`](file:///d:/Programming/Intern/Xebia/MainProject/docs/frontend-api/attendance/export.md) - Stream CSV / Excel export
- [`POST /regularizations`](file:///d:/Programming/Intern/Xebia/MainProject/docs/frontend-api/attendance/regularizations.md) - Request timeline regularization
- [`POST /regularizations/:id/approve`](file:///d:/Programming/Intern/Xebia/MainProject/docs/frontend-api/attendance/regularizations.md) - Approve regularization request
- [`POST /regularizations/:id/reject`](file:///d:/Programming/Intern/Xebia/MainProject/docs/frontend-api/attendance/regularizations.md) - Reject regularization request
