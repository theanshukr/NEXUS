# Frontend API: Attendance Reconciliation & Payroll Feed (`reconciliation.md`)

## 1. Run EOD Stale Session Reconciliation
- **HTTP Method & URL**: `POST /api/v1/attendance/reconciliation`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Permission**: `attendance.reconcile`
- **Request Body**: None (optional query parameters: `date`, `employeeId`, `locationId`, `departmentId`, `shiftId`)
- **Response (`200 OK`)**: Returns summary of reconciled open sessions.

## 2. Alias for EOD Stale Session Reconciliation
- **HTTP Method & URL**: `POST /api/v1/attendance/reconciliation/stale`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Permission**: `attendance.reconcile`
- **Request Body**: None
- **Response (`200 OK`)**: Returns summary of reconciled open sessions.

## 3. Atomically Finalize Pay Period
- **HTTP Method & URL**: `POST /api/v1/attendance/finalize`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Permission**: `attendance.finalize`
- **Request Body**: `{ "startDate": "2026-07-01", "endDate": "2026-07-31" }`
- **Response (`200 OK`)**: Returns idempotency verification and number of finalized records.

## 4. Administrative Payroll Feed
- **HTTP Method & URL**: `GET /api/v1/attendance/reconciliation/payroll-feed`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Permission**: `attendance.payroll_feed`
- **Response (`200 OK`)**: Returns read-only feed of finalized attendance records for payroll processing.
