# Frontend API: Create Designation (`create-designation.md`)

- **HTTP Method & URL**: `POST /api/v1/designations`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Permission**: `designation.create`
- **Request Body**: `{ "name": "Senior Software Engineer", "code": "SSE", "description": "Lead developer role" }`
- **Response (`201 Created`)**: Returns created designation.
