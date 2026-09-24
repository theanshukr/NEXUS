# Frontend API: Revoke Invitation (`revoke-invite.md`)

- **HTTP Method & URL**: `DELETE /api/v1/invites/:id`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Permission**: `invite.delete` or `invite.create`
- **Response (`200 OK`)**: `{ "status": "success", "message": "Invitation revoked successfully" }`
