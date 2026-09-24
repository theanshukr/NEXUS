# Frontend API: Archive Designation (`archive-designation.md`)

- **HTTP Method & URL**: `POST /api/v1/designations/:id/archive`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Permission**: `designation.delete`
- **Response (`200 OK`)**: `{ "status": "success", "message": "Designation archived successfully" }`
