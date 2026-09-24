# Frontend API: Archive Location (`archive-location.md`)

- **HTTP Method & URL**: `POST /api/v1/locations/:id/archive`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Permission**: `location.delete`
- **Response (`200 OK`)**: `{ "status": "success", "message": "Location archived successfully" }`
