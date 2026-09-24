# MCP Employee Tool Specification (`employee-tools.md`)

*Version 1.0 | Synchronized with Backend Architecture (M-03)*

## 1. `mcp_emp_list`
- **Purpose**: Lists employee profiles with optional filtering by status, department, or search query. Excludes archived employees by default.
- **HTTP Mapping**: `GET /api/v1/employees`
- **Authentication**: Bearer JWT Required
- **Permission Required**: `user.read` or `employee.read`
- **Input JSON Schema**: `{ "type": "object", "properties": { "status": { "type": "string" }, "departmentId": { "type": "string" }, "search": { "type": "string" }, "includeArchived": { "type": "boolean" }, "onlyArchived": { "type": "boolean" } } }`
- **Transaction Boundary**: None (Read Only).
- **Idempotency**: Safe, eventually consistent read.
- **Errors**: `403 Forbidden`.

---

## 2. `mcp_emp_get_org_chart`
- **Purpose**: Retrieves the organizational reporting hierarchy tree (who reports to whom).
- **HTTP Mapping**: `GET /api/v1/employees/org-chart`
- **Authentication**: Bearer JWT Required
- **Permission Required**: `user.read` or `employee.read`
- **Input JSON Schema**: `{ "type": "object", "properties": {} }`
- **Transaction Boundary**: None (Read Only).
- **Idempotency**: Safe.
- **Errors**: `403 Forbidden`.

---

## 3. `mcp_emp_get_by_id`
- **Purpose**: Retrieves complete profile and employment history for a specific employee.
- **HTTP Mapping**: `GET /api/v1/employees/:id`
- **Authentication**: Bearer JWT Required
- **Permission Required**: `user.read` or `employee.read`
- **Input JSON Schema**: `{ "type": "object", "properties": { "id": { "type": "string" } }, "required": ["id"] }`
- **Transaction Boundary**: None (Read Only).
- **Idempotency**: Safe.
- **Errors**: `404 Not Found`, `403 Forbidden`.

---

## 4. `mcp_emp_create`
- **Purpose**: Provisions a new employee profile with auto-generated code according to organization settings.
- **HTTP Mapping**: `POST /api/v1/employees`
- **Authentication**: Bearer JWT Required
- **Permission Required**: `user.create` or `employee.create`
- **Input JSON Schema**: `{ "type": "object", "properties": { "firstName": { "type": "string" }, "lastName": { "type": "string" }, "workEmail": { "type": "string", "format": "email" }, "departmentId": { "type": "string" }, "designationId": { "type": "string" }, "reportingManagerId": { "type": "string" }, "joinDate": { "type": "string", "format": "date" } }, "required": ["firstName", "lastName", "departmentId", "joinDate"] }`
- **Transaction Boundary**: ACID transaction with Event Driven follow-up.
- **Events Emitted**: `EMPLOYEE.CREATED`.
- **Audit Logs Generated**: `EMPLOYEE_CREATED`.
- **Idempotency**: Partial (Duplicate email triggers `409 Conflict`).
- **Errors**: `409 Conflict`, `400 Bad Request`.

---

## 5. `mcp_emp_update_profile`
- **Purpose**: Modifies biographical or organizational profile attributes and logs an immutable `EmploymentHistory` record.
- **HTTP Mapping**: `PATCH /api/v1/employees/:id/profile`
- **Authentication**: Bearer JWT Required
- **Permission Required**: `user.update` or `employee.update`
- **Input JSON Schema**: `{ "type": "object", "properties": { "id": { "type": "string" }, "firstName": { "type": "string" }, "lastName": { "type": "string" }, "departmentId": { "type": "string" }, "changeReason": { "type": "string" } }, "required": ["id"] }`
- **Transaction Boundary**: ACID transaction.
- **Events Emitted**: `EMPLOYEE.UPDATED`.
- **Audit Logs Generated**: `EMPLOYEE_UPDATED`.
- **Idempotency**: Yes.
- **Errors**: `404 Not Found`, `400 Bad Request`.

---

## 6. `mcp_emp_change_status`
- **Purpose**: Transitions employee business status (`ONBOARDING`, `ACTIVE`, `SUSPENDED`, `TERMINATED`, `RESIGNED`).
- **HTTP Mapping**: `PUT /api/v1/employees/:id/status`
- **Authentication**: Bearer JWT Required
- **Permission Required**: `user.change_status`
- **Input JSON Schema**: `{ "type": "object", "properties": { "id": { "type": "string" }, "status": { "type": "string", "enum": ["ONBOARDING", "ACTIVE", "SUSPENDED", "TERMINATED", "RESIGNED"] }, "reason": { "type": "string" } }, "required": ["id", "status"] }`
- **Transaction Boundary**: ACID transaction.
- **Events Emitted**: `EMPLOYEE.STATUS_CHANGED` (Revokes session if suspended).
- **Audit Logs Generated**: `EMPLOYEE_STATUS_CHANGED`.
- **Idempotency**: Yes.
- **Errors**: `403 Forbidden`, `400 Bad Request`.

---

## 7. `mcp_emp_change_manager`
- **Purpose**: Reassigns an employee's reporting manager and checks for reporting loops.
- **HTTP Mapping**: `PUT /api/v1/employees/:id/manager`
- **Authentication**: Bearer JWT Required
- **Permission Required**: `user.change_manager`
- **Input JSON Schema**: `{ "type": "object", "properties": { "id": { "type": "string" }, "newManagerId": { "type": "string" }, "reason": { "type": "string" } }, "required": ["id", "newManagerId"] }`
- **Transaction Boundary**: ACID transaction.
- **Events Emitted**: `EMPLOYEE.MANAGER_CHANGED`.
- **Audit Logs Generated**: `EMPLOYEE_MANAGER_CHANGED`.
- **Idempotency**: Yes.
- **Errors**: `400 Bad Request` (Circular loop detected).

---

## 8. `mcp_emp_invite`
- **Purpose**: Triggers onboarding invitation email for an employee profile.
- **HTTP Mapping**: `POST /api/v1/employees/:id/invite`
- **Authentication**: Bearer JWT Required
- **Permission Required**: `user.invite`
- **Input JSON Schema**: `{ "type": "object", "properties": { "id": { "type": "string" }, "roleIds": { "type": "array", "items": { "type": "string" } } }, "required": ["id", "roleIds"] }`
- **Transaction Boundary**: ACID transaction.
- **Events Emitted**: `EMPLOYEE.INVITED`.
- **Audit Logs Generated**: `EMPLOYEE_INVITED`.
- **Idempotency**: Partial (Refreshing existing token vs generating new).
- **Errors**: `400 Bad Request`.

---

## 9. `mcp_emp_archive`
- **Purpose**: Soft-deletes an employee profile without altering their business status.
- **HTTP Mapping**: `POST /api/v1/employees/:id/archive`
- **Authentication**: Bearer JWT Required
- **Permission Required**: `user.archive`
- **Input JSON Schema**: `{ "type": "object", "properties": { "id": { "type": "string" }, "reason": { "type": "string" } }, "required": ["id"] }`
- **Transaction Boundary**: ACID soft delete.
- **Events Emitted**: `EMPLOYEE.ARCHIVED`.
- **Audit Logs Generated**: `EMPLOYEE_ARCHIVED`.
- **Idempotency**: Yes.
- **Errors**: `404 Not Found`.

---

## 10. `mcp_emp_restore`
- **Purpose**: Restores a previously archived employee profile.
- **HTTP Mapping**: `POST /api/v1/employees/:id/restore`
- **Authentication**: Bearer JWT Required
- **Permission Required**: `user.restore`
- **Input JSON Schema**: `{ "type": "object", "properties": { "id": { "type": "string" } }, "required": ["id"] }`
- **Transaction Boundary**: ACID restore.
- **Events Emitted**: `EMPLOYEE.RESTORED`.
- **Audit Logs Generated**: `EMPLOYEE_RESTORED`.
- **Idempotency**: Yes.
- **Errors**: `404 Not Found`.
