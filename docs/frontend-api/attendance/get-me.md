# Frontend API: Get My Attendance (`get-me.md`)

- **HTTP Method & URL**: `GET /api/v1/attendance/me`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Permission**: Valid authenticated session + tenant context
- **Query Parameters**: `startDate`, `endDate`
- **Response (`200 OK`)**: Returns list of attendance records for the authenticated employee within the specified date range.
