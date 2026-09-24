# Frontend API: Update Role (`update-role.md`)

- **HTTP Method & URL**: `PUT /api/v1/roles/:id`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Request Body**: `{ "name": "Updated Role", "permissions": ["user.read"] }`
- **Response (`200 OK`)**: Returns updated role definition.
