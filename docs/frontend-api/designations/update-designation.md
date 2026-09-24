# Frontend API: Update Designation (`update-designation.md`)

- **HTTP Method & URL**: `PATCH /api/v1/designations/:id`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Permission**: `designation.update`
- **Request Body**: `{ "name": "Staff Software Engineer" }`
- **Response (`200 OK`)**: Returns updated designation.
