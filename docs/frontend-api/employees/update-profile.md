# Frontend API: Update Profile (`update-profile.md`)

- **HTTP Method & URL**: `PATCH /api/v1/employees/:id/profile`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Permission**: `user.update` or `employee.update`
- **Request Body**: `{ "departmentId": "new-dept-id", "changeReason": "Annual Reorganization" }`
- **Response (`200 OK`)**: Returns updated profile and adds record to `EmploymentHistory`.
