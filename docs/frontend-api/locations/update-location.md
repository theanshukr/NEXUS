# Frontend API: Update Location (`update-location.md`)

- **HTTP Method & URL**: `PATCH /api/v1/locations/:id`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Permission**: `location.update`
- **Request Body**: `{ "name": "NYC Office Updated" }`
- **Response (`200 OK`)**: Returns updated location.
