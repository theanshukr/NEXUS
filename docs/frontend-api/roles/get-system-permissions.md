# Frontend API: Get System Permissions (`get-system-permissions.md`)

- **HTTP Method & URL**: `GET /api/v1/roles/system-permissions`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Response (`200 OK`)**: Returns array of atomic permission strings (e.g. `["user.create", "role.assign"]`).
