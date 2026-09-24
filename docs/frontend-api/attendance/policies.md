# Frontend API: Attendance Policies (`policies.md`)

## 1. List Attendance Policies
- **HTTP Method & URL**: `GET /api/v1/attendance-policies`
- **Permission**: `attendance.policy.manage`
- **Response (`200 OK`)**: Returns array of configured attendance policies for the organization.

## 2. Create Attendance Policy
- **HTTP Method & URL**: `POST /api/v1/attendance-policies`
- **Permission**: `attendance.policy.manage`
- **Request Body**: `{ "name": "Standard Shift Policy", "workStartTime": "09:00", "workEndTime": "18:00", "gracePeriodMinutes": 15 }`
- **Response (`201 Created`)**: Returns newly created attendance policy.

## 3. Get Attendance Policy by ID
- **HTTP Method & URL**: `GET /api/v1/attendance-policies/:id`
- **Permission**: `attendance.policy.manage`
- **Response (`200 OK`)**: Returns specific attendance policy details.

## 4. Update Attendance Policy
- **HTTP Method & URL**: `PATCH /api/v1/attendance-policies/:id`
- **Permission**: `attendance.policy.manage`
- **Request Body**: `{ "gracePeriodMinutes": 20 }`
- **Response (`200 OK`)**: Returns updated attendance policy.
