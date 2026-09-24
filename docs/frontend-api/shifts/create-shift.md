# Frontend API: Create Shift (`create-shift.md`)

- **HTTP Method & URL**: `POST /api/v1/shifts`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Permission**: `shift.create`
- **Request Body**: `{ "name": "Morning Shift", "code": "MORN-01", "startTime": "08:00", "endTime": "17:00" }`
- **Response (`201 Created`)**: Returns created shift.
