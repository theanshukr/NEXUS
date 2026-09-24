# Frontend API: Restore Employee (`restore-employee.md`)

- **HTTP Method & URL**: `POST /api/v1/employees/:id/restore`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Permission**: `user.delete` or `employee.delete`
- **Request Body**: None / `{}`
- **Response (`200 OK`)**: Restores archived employee profile.
