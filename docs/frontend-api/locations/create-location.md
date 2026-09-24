# Frontend API: Create Location (`create-location.md`)

- **HTTP Method & URL**: `POST /api/v1/locations`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Permission**: `location.create`
- **Request Body**: `{ "name": "New York HQ", "code": "NYC-HQ", "timezone": "America/New_York", "address": "123 Broadway" }`
- **Response (`201 Created`)**: Returns created location.
