# Frontend API: Get Attendance Reports (`get-reports.md`)

- **HTTP Method & URL**: `GET /api/v1/attendance/reports`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Permission**: `attendance.read` (Note: Non-HR employees are automatically down-scoped to their own records).
- **Query Parameters**: `type` (`summary` | `overtime` | `late` | `department` | `employee` | `daily` | `analytics`), `dateFrom`, `dateTo`, `status`, `departmentId`, `employeeId`, `managerId`, `page`, `limit`, `sort`, `search`
- **Response (`200 OK`)**: Returns paginated attendance reports, analytical leaderboards, or organizational aggregations.
