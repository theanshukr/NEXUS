# Frontend API: Update Shift (`update-shift.md`)

- **HTTP Method & URL**: `PATCH /api/v1/shifts/:id`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Permission**: `shift.update`
- **Request Body**: `{ "name": "Morning Shift Updated", "endTime": "16:30" }`
- **Response (`200 OK`)**: Returns updated shift.
