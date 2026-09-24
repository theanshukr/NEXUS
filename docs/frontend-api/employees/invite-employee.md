# Frontend API: Invite Employee (`invite-employee.md`)

- **HTTP Method & URL**: `POST /api/v1/employees/:id/invite`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Permission**: `invite.create`
- **Request Body**: `{ "roleIds": ["role-id-1"] }`
- **Response (`201 Created`)**: Returns invitation object.
