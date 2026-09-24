# Frontend API: Get Attendance Dashboard (`get-dashboard.md`)

- **HTTP Method & URL**: `GET /api/v1/attendance/dashboard`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Permission**: `attendance.read`
- **Query Parameters**: `dateFrom`, `dateTo`, `departmentId`, `locationId`
- **Response (`200 OK`)**: Returns composed executive dashboard widgets (`overview`, `today`, `lateArrivals`, `topOvertime`).
