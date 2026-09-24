# Frontend API: Remove Role (`remove-role.md`)

- **HTTP Method & URL**: `POST /api/v1/roles/remove`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Request Body**: `{ "userId": "6a4760...", "roleId": "6a4761..." }`
- **Response (`200 OK`)**: `{ "status": "success", "message": "Role removed successfully" }`
