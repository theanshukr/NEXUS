# Frontend API: Create Role (`create-role.md`)

- **HTTP Method & URL**: `POST /api/v1/roles`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Request Body**: `{ "name": "Custom Admin", "description": "Custom role", "permissions": ["user.read", "role.read"] }`
- **Response (`201 Created`)**: Returns created role definition.
