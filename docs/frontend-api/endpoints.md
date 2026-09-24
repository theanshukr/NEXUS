# Frontend REST API Endpoints & TypeScript SDK Interfaces

*Synchronized with Backend Architecture (M-01 + M-02 + M-03 + M-04)*

This specification provides TypeScript interface definitions and request/response payloads for integrating frontend web and mobile applications with the backend API v1.

---

## 1. Core TypeScript SDK Interfaces

```typescript
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: Array<{ field: string; message: string }>;
  };
  meta?: {
    total: number;
    page: number;
    limit: number;
  };
}

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  organizationId: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'LOCKED';
  roles: string[];
  permissions: string[];
}

export interface EmployeeProfile {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  workEmail?: string;
  status: 'ONBOARDING' | 'INVITED' | 'ACTIVE' | 'SUSPENDED' | 'TERMINATED' | 'RESIGNED';
  isArchived: boolean;
  departmentId: string;
  designationId: string;
  locationId: string;
  shiftId: string;
  managerId?: string;
  userId?: string;
  joinDate: string;
  employmentHistory: Array<{
    field: string;
    previousValue: any;
    newValue: any;
    changedBy: string;
    changeReason?: string;
    createdAt: string;
  }>;
}
```

---

## 2. Authentication Module (`/api/v1/auth`)

### `POST /api/v1/auth/login`
- **Auth Required**: No (Public)
- **Request Body**: `{ email: string; password: string }`
- **Response**: `ApiResponse<{ user: UserProfile; accessToken: string; refreshToken: string; expiresIn: number }>`

### `POST /api/v1/auth/refresh`
- **Auth Required**: No (Refresh Token in body)
- **Request Body**: `{ refreshToken: string }`
- **Response**: `ApiResponse<{ accessToken: string; refreshToken: string; expiresIn: number }>`

### `POST /api/v1/auth/register-invite`
- **Auth Required**: No (Public)
- **Request Body**: `{ token: string; email: string; password: string; firstName: string; lastName: string }`
- **Response**: `ApiResponse<{ user: UserProfile; accessToken: string; refreshToken: string }>`

### `POST /api/v1/auth/logout`
- **Auth Required**: Yes (Bearer Token)
- **Request Body**: `{}`
- **Response**: `ApiResponse<null>`

### `GET /api/v1/auth/me`
- **Auth Required**: Yes (Bearer Token)
- **Response**: `ApiResponse<UserProfile>`

---

## 3. Organization Module (`/api/v1/organizations`)

### `POST /api/v1/organizations`
- **Auth Required**: No (Public onboarding)
- **Request Body**: `{ name: string; code: string; domain?: string; adminEmail: string; adminPassword: string; adminFirstName: string; adminLastName: string }`
- **Response**: `ApiResponse<{ organization: any; adminUser: any; settings: any }>`

### `GET /api/v1/organizations/me`
- **Auth Required**: Yes (Bearer Token)
- **Response**: `ApiResponse<{ id: string; name: string; code: string; domain: string; status: string; createdAt: string }>`

---

## 4. Roles & Delegation Module (`/api/v1/roles` / `/api/v1/role-delegation-policies`)

### `GET /api/v1/roles`
- **Auth Required**: Yes (`role.read`)
- **Response**: `ApiResponse<Array<{ id: string; name: string; priority: number; permissions: string[]; isSystemTemplate: boolean }>>`

### `GET /api/v1/roles/system-permissions`
- **Auth Required**: Yes (`role.read`)
- **Response**: `ApiResponse<string[]>`

### `POST /api/v1/roles`
- **Auth Required**: Yes (`role.create`)
- **Request Body**: `{ name: string; priority: number; permissions: string[]; description?: string }`
- **Response**: `ApiResponse<{ id: string; name: string; priority: number; permissions: string[]; isSystemTemplate: boolean }>`

### `POST /api/v1/roles/assign`
- **Auth Required**: Yes (`role.assign` + Delegation check)
- **Request Body**: `{ userId: string; roleId: string }`
- **Response**: `ApiResponse<{ id: string; userId: string; roleId: string; organizationId: string }>`

### `GET /api/v1/role-delegation-policies`
- **Auth Required**: Yes (`role.read` / `role.assign`)
- **Response**: `ApiResponse<Array<{ id: string; sourceRoleId: string; targetRoleId: string; organizationId: string }>>`

---

## 5. Employee Workforce Module (`/api/v1/employees`)

### `POST /api/v1/employees`
- **Auth Required**: Yes (`user.create`)
- **Request Body**: `{ firstName: string; lastName: string; workEmail?: string; departmentId: string; designationId: string; locationId: string; shiftId: string; managerId?: string; joinDate: string }`
- **Response**: `ApiResponse<EmployeeProfile>` (201 Created)
- **Validation Schema**: Strict Zod schema validating department, designation, and valid join date.
- **Transaction Boundary**: ACID transaction with Event Driven follow-up.
- **Events Emitted**: `EMPLOYEE.CREATED`
- **Idempotency**: Partial (duplicate `workEmail` throws 409 Conflict).

### `GET /api/v1/employees`
- **Auth Required**: Yes (`user.read`)
- **Query Params**: `?status=ACTIVE&departmentId=...&search=...&page=1&limit=50&includeArchived=false`
- **Response**: `ApiResponse<EmployeeProfile[]>` (Includes `meta` pagination) (200 OK)
- **Idempotency**: Safe, purely Eventual Consistency reads.

### `GET /api/v1/employees/org-chart`
- **Auth Required**: Yes (`user.read`)
- **Response**: `ApiResponse<Array<{ id: string; employeeCode: string; name: string; designation: string; managerId: string | null; subordinatesCount: number }>>` (200 OK)

### `GET /api/v1/employees/:id`
- **Auth Required**: Yes (`user.read`)
- **Response**: `ApiResponse<EmployeeProfile>` (200 OK)

### `PATCH /api/v1/employees/:id/profile`
- **Auth Required**: Yes (`user.update`)
- **Request Body**: `{ firstName?: string; lastName?: string; workEmail?: string; departmentId?: string; designationId?: string; locationId?: string; shiftId?: string; changeReason?: string }`
- **Response**: `ApiResponse<EmployeeProfile>` (Appends to `employmentHistory`) (200 OK)
- **Transaction Boundary**: ACID transaction updating profile and history log.
- **Events Emitted**: `EMPLOYEE.UPDATED`
- **Idempotency**: Yes, repeated patches with same values yield same state.

### `PUT /api/v1/employees/:id/status`
- **Auth Required**: Yes (`user.change_status`)
- **Request Body**: `{ status: 'ACTIVE' | 'SUSPENDED' | 'TERMINATED' | 'RESIGNED'; reason?: string }`
- **Response**: `ApiResponse<EmployeeProfile>` (200 OK)
- **Transaction Boundary**: ACID transaction.
- **Events Emitted**: `EMPLOYEE.STATUS_CHANGED`
- **Idempotency**: Yes, idempotent state transition.

### `PUT /api/v1/employees/:id/manager`
- **Auth Required**: Yes (`user.change_manager`)
- **Request Body**: `{ managerId: string | null; changeReason?: string }`
- **Response**: `ApiResponse<EmployeeProfile>` (200 OK)
- **Transaction Boundary**: ACID transaction preventing cyclical loops.
- **Events Emitted**: `EMPLOYEE.MANAGER_CHANGED`
- **Idempotency**: Yes.

### `POST /api/v1/employees/:id/invite`
- **Auth Required**: Yes (`user.invite`)
- **Request Body**: `{ targetRoleIds: string[] }`
- **Response**: `ApiResponse<{ employee: EmployeeProfile; invitation: any }>` (200 OK)
- **Transaction Boundary**: ACID transaction generating invite token.
- **Events Emitted**: `EMPLOYEE.INVITED`
- **Idempotency**: Partially idempotent (refreshing invite vs generating new token).

### `POST /api/v1/employees/:id/archive`
- **Auth Required**: Yes (`user.archive`)
- **Request Body**: `{ archiveReason?: string }`
- **Response**: `ApiResponse<EmployeeProfile>` (`isArchived: true`) (200 OK)
- **Transaction Boundary**: ACID soft-delete.
- **Events Emitted**: `EMPLOYEE.ARCHIVED`
- **Idempotency**: Yes.

### `POST /api/v1/employees/:id/restore`
- **Auth Required**: Yes (`user.restore`)
- **Request Body**: `{}`
- **Response**: `ApiResponse<EmployeeProfile>` (`isArchived: false`) (200 OK)
- **Transaction Boundary**: ACID restore.
- **Events Emitted**: `EMPLOYEE.RESTORED`
- **Idempotency**: Yes.

---

## 7. Recruitment Module (`/api/v1/recruitment`)

### `POST /api/v1/requisitions`
- **Auth Required**: Yes (`recruitment.job.create`)
- **Request Body**: `{ title, departmentId, headcount, type, location, level, salaryRange }`
- **Response**: `ApiResponse<JobRequisition>` (201 Created)
- **Transaction Boundary**: ACID transaction.
- **Events Emitted**: `REQUISITION.CREATED`
- **Idempotency**: Partial (duplicate title per department may conflict).

### `POST /api/v1/requisitions/:id/approve`
- **Auth Required**: Yes (`recruitment.job.approve`)
- **Request Body**: `{ comments?: string }`
- **Response**: `ApiResponse<JobRequisition>` (200 OK)
- **Transaction Boundary**: ACID transaction (Tier approval).
- **Events Emitted**: `REQUISITION.APPROVED`
- **Idempotency**: Yes.

### `POST /api/v1/requisitions/:id/publish`
- **Auth Required**: Yes (`recruitment.job.publish`)
- **Request Body**: `{ platforms: string[] }`
- **Response**: `ApiResponse<JobPosting>` (201 Created)
- **Transaction Boundary**: ACID transaction creating JobPosting.
- **Events Emitted**: `JOB.PUBLISHED` (Event Driven for 3rd party integration).
- **Idempotency**: Yes.

### `POST /api/v1/applications`
- **Auth Required**: No (Candidate Portal) or Yes (`recruitment.application.create`)
- **Request Body**: `{ candidateId, requisitionId, source }`
- **Response**: `ApiResponse<JobApplication>` (201 Created)
- **Transaction Boundary**: ACID transaction linking candidate to job.
- **Events Emitted**: `APPLICATION.SUBMITTED`
- **Idempotency**: Yes (Candidates cannot apply twice to the same job).

### `PUT /api/v1/applications/:id/stage`
- **Auth Required**: Yes (`recruitment.application.move-stage`)
- **Request Body**: `{ stage: 'SCREENING' | 'INTERVIEW' | 'OFFER' }`
- **Response**: `ApiResponse<JobApplication>` (200 OK)
- **Transaction Boundary**: ACID transaction writing stage and history.
- **Events Emitted**: `APPLICATION.STAGE_CHANGED`
- **Idempotency**: Yes, based on current state check.

### `POST /api/v1/applications/:id/reject`
- **Auth Required**: Yes (`recruitment.application.review`)
- **Request Body**: `{ reason: string }`
- **Response**: `ApiResponse<JobApplication>` (200 OK)
- **Transaction Boundary**: ACID transaction marking terminal state.
- **Events Emitted**: `APPLICATION.REJECTED`
- **Idempotency**: Yes.

### `POST /api/v1/offers`
- **Auth Required**: Yes (`recruitment.offer.create`)
- **Request Body**: `{ applicationId, salary, expiresAt }`
- **Response**: `ApiResponse<Offer>` (201 Created)
- **Transaction Boundary**: ACID transaction.
- **Events Emitted**: `OFFER.CREATED`
- **Idempotency**: Strict (Only one active offer per application allowed).

### `POST /api/v1/candidate/offers/:id/accept`
- **Auth Required**: Yes (Candidate Auth Token)
- **Request Body**: `{ signature: string }`
- **Response**: `ApiResponse<Offer>` (200 OK)
- **Transaction Boundary**: ACID transaction + Event Driven employee creation.
- **Events Emitted**: `OFFER.ACCEPTED`, `CANDIDATE.HIRED`
- **Idempotency**: Yes.
