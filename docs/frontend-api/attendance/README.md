# Frontend API: Attendance Management (`/api/v1/attendance`)

This directory documents the frontend REST API endpoints for Time & Attendance tracking (M-04) and Regularization workflows (M-05).

## 1. Operational Endpoints (Employee Dashboard & Clocking)
- [`POST /clock-in`](file:///d:/Programming/Intern/Xebia/MainProject/docs/frontend-api/attendance/clock-in.md) - Record GPS clock-in
- [`POST /clock-out`](file:///d:/Programming/Intern/Xebia/MainProject/docs/frontend-api/attendance/clock-out.md) - Record GPS clock-out
- [`GET /today`](file:///d:/Programming/Intern/Xebia/MainProject/docs/frontend-api/attendance/get-today.md) - Get current user's today status
- [`GET /me`](file:///d:/Programming/Intern/Xebia/MainProject/docs/frontend-api/attendance/get-me.md) - Get current user's attendance history

## 2. Reporting & Analytics Endpoints
- [`GET /reports`](file:///d:/Programming/Intern/Xebia/MainProject/docs/frontend-api/attendance/get-reports.md) - Universal paginated reporting & analytics
- [`GET /dashboard`](file:///d:/Programming/Intern/Xebia/MainProject/docs/frontend-api/attendance/get-dashboard.md) - Executive dashboard composed widgets
- [`GET /export`](file:///d:/Programming/Intern/Xebia/MainProject/docs/frontend-api/attendance/export.md) - Direct binary stream CSV/Excel export

## 3. Regularization Workflows
- [`POST /regularizations`](file:///d:/Programming/Intern/Xebia/MainProject/docs/frontend-api/attendance/regularizations.md) - Submit regularization request
- [`GET /regularizations`](file:///d:/Programming/Intern/Xebia/MainProject/docs/frontend-api/attendance/regularizations.md) - List regularization requests
- [`POST /regularizations/:id/reject`](file:///d:/Programming/Intern/Xebia/MainProject/docs/frontend-api/attendance/regularizations.md) - Reject regularization request

## 4. Attendance Policies (`/api/v1/attendance-policies`)
- [`GET /api/v1/attendance-policies`](file:///d:/Programming/Intern/Xebia/MainProject/docs/frontend-api/attendance/policies.md) - List attendance policies
- [`POST /api/v1/attendance-policies`](file:///d:/Programming/Intern/Xebia/MainProject/docs/frontend-api/attendance/policies.md) - Create attendance policy
- [`GET /api/v1/attendance-policies/:id`](file:///d:/Programming/Intern/Xebia/MainProject/docs/frontend-api/attendance/policies.md) - Get attendance policy by ID
- [`PATCH /api/v1/attendance-policies/:id`](file:///d:/Programming/Intern/Xebia/MainProject/docs/frontend-api/attendance/policies.md) - Update attendance policy
