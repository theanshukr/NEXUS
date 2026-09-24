# Frontend API: Duplicate Role (`duplicate-role.md`)

- **HTTP Method & URL**: `POST /api/v1/roles/:id/duplicate`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Request Body**: `{ "name": "Cloned Role" }`
- **Response (`201 Created`)**: Returns newly cloned role definition.
