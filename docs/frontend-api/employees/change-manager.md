# Frontend API: Change Manager (`change-manager.md`)

- **HTTP Method & URL**: `PUT /api/v1/employees/:id/manager`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Permission**: `user.update` or `employee.update`
- **Request Body**: `{ "newManagerId": "manager-id", "reason": "Team transition" }`
- **Response (`200 OK`)**: Returns updated profile and checks against reporting cycles.
