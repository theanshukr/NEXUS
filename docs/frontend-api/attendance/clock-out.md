# Frontend API: Clock Out (`clock-out.md`)

- **HTTP Method & URL**: `POST /api/v1/attendance/clock-out`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Permission**: `attendance.mark`
- **Request Body**: `{ "gpsData": { "latitude": 28.6139, "longitude": 77.2090, "accuracy": 15 }, "deviceData": { "userAgent": "Mozilla/5.0..." } }`
- **Response (`200 OK`)**: Returns completed daily attendance record with calculated `workingHours` and `overtimeHours`.
