# Frontend API: Assign Role (`assign-role.md`)

- **HTTP Method & URL**: `POST /api/v1/roles/assign`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Request Body**: `{ "userId": "6a4760...", "roleId": "6a4761..." }`
- **Response (`200 OK`)**: `{ "status": "success", "message": "Role assigned successfully" }`
