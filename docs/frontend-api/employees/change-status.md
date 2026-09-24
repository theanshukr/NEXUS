# Frontend API: Change Status (`change-status.md`)

- **HTTP Method & URL**: `PUT /api/v1/employees/:id/status`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Permission**: `user.update` or `employee.update`
- **Request Body**: `{ "status": "TERMINATED", "reason": "Contract ended" }`
- **Response (`200 OK`)**: Returns updated profile and revokes sessions if suspended/terminated.
