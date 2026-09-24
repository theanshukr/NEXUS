# Frontend API: Export Attendance Report (`export.md`)

- **HTTP Method & URL**: `GET /api/v1/attendance/export`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Permission**: `attendance.read`
- **Query Parameters**: `format` (`csv` | `xlsx`, required), `type`, `dateFrom`, `dateTo`, `status`, `departmentId`, `employeeId`, `sort`, `search`
- **Response (`200 OK`)**: Direct binary stream (`text/csv` or `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`) with automatic `Content-Disposition` attachment filename.
