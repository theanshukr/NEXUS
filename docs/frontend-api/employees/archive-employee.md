# Frontend API: Archive Employee (`archive-employee.md`)

- **HTTP Method & URL**: `POST /api/v1/employees/:id/archive`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Permission**: `user.delete` or `employee.delete`
- **Request Body**: `{ "reason": "No longer with company" }`
- **Response (`200 OK`)**: Sets `archivedAt`, `archivedBy`, `archiveReason` and revokes active sessions.
