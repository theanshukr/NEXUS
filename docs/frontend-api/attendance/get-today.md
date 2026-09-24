# Frontend API: Get Today's Attendance (`get-today.md`)

- **HTTP Method & URL**: `GET /api/v1/attendance/today`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Permission**: Valid authenticated session + tenant context
- **Response (`200 OK`)**: Returns current user's attendance record for the current working day (or `null` if not clocked in).
