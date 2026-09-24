# Frontend API: Create Department (`create-department.md`)

- **HTTP Method & URL**: `POST /api/v1/departments`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Permission**: `department.create`
- **Request Body**: `{ "name": "Engineering", "code": "ENG", "parentCode": "ROOT" }`
- **Response (`201 Created`)**: Returns newly created department.
