# Frontend API: Update Department (`update-department.md`)

- **HTTP Method & URL**: `PUT /api/v1/departments/:id`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Permission**: `department.update`
- **Request Body**: `{ "name": "Software Engineering", "costCenter": "CC-101" }`
- **Response (`200 OK`)**: Returns updated department.
