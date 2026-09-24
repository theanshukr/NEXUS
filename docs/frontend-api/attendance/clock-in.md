# Frontend API: Clock In (`clock-in.md`)

- **HTTP Method & URL**: `POST /api/v1/attendance/clock-in`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Permission**: `attendance.mark`
- **Request Body**: `{ "gpsData": { "latitude": 28.6139, "longitude": 77.2090, "accuracy": 15 }, "deviceData": { "userAgent": "Mozilla/5.0..." } }`
- **Response (`201 Created`)**: Returns recorded attendance clock-in timestamp and geofence verification status.
