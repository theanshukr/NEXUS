# Frontend API: Create Invitation (`create-invite.md`)

- **HTTP Method & URL**: `POST /api/v1/invites`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Permission**: `invite.create`
- **Request Body**: `{ "email": "new.employee@acme.com", "roleIds": ["role-id-1"] }`
- **Response (`201 Created`)**: Returns created invitation object.
