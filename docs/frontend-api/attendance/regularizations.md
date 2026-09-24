# Frontend API: Regularization Workflows (`regularizations.md`)

## 1. Submit Regularization Request
- **HTTP Method & URL**: `POST /api/v1/attendance/regularizations`
- **Permission**: `attendance.regularization.request`
- **Request Body**: `{ "attendanceRecordId": "<id>", "reason": "Forgot to clock out due to client meeting", "regularizedCheckOut": "2026-07-04T17:30:00Z" }`
- **Response (`201 Created`)**: Returns pending regularization request.

## 2. List Regularization Requests
- **HTTP Method & URL**: `GET /api/v1/attendance/regularizations`
- **Permission**: `attendance.read`
- **Response (`200 OK`)**: Returns list of regularization requests filtered by tenant/role.

## 3. Approve Regularization Request
- **HTTP Method & URL**: `POST /api/v1/attendance/regularizations/:id/approve`
- **Permission**: `attendance.regularization.approve`
- **Request Body**: `{ "comment": "Verified with client." }`
- **Response (`200 OK`)**: Approves request, recalculates attendance record, and emits `ATTENDANCE.RECORD_UPDATED`.

## 4. Reject Regularization Request
- **HTTP Method & URL**: `POST /api/v1/attendance/regularizations/:id/reject`
- **Permission**: `attendance.regularization.approve`
- **Request Body**: `{ "comment": "No proof of late meeting." }`
- **Response (`200 OK`)**: Rejects request.
