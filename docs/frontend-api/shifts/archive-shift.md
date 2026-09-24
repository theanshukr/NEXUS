# Frontend API: Archive Shift (`archive-shift.md`)

- **HTTP Method & URL**: `POST /api/v1/shifts/:id/archive`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Permission**: `shift.delete`
- **Response (`200 OK`)**: `{ "status": "success", "message": "Shift archived successfully" }`
