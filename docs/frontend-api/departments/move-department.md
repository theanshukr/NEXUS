# Frontend API: Move Department (`move-department.md`)

- **HTTP Method & URL**: `POST /api/v1/departments/:id/move`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Permission**: `department.update`
- **Request Body**: `{ "newParentCode": "TECH_OPS" }`
- **Response (`200 OK`)**: Returns relocated department.
