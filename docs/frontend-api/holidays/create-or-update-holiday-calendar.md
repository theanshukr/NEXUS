# Frontend API: Create or Update Holiday Calendar (`create-or-update-holiday-calendar.md`)

- **HTTP Method & URL**: `PUT /api/v1/locations/:locationId/holidays/:year`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Permission**: `holiday.update`
- **Request Body**: `{ "holidays": [{ "name": "New Years Day", "date": "2026-01-01", "type": "MANDATORY" }] }`
- **Response (`200 OK`)**: Returns updated calendar.
