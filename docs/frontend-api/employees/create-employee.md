# Frontend API: Create Employee (`create-employee.md`)

- **HTTP Method & URL**: `POST /api/v1/employees`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Permission**: `user.create` or `employee.create`
- **Request Body**: `{ "firstName": "Jane", "lastName": "Smith", "workEmail": "jane@acme.com", "departmentId": "dept-id", "joinDate": "2026-07-01" }`
- **Response (`201 Created`)**: Returns created employee profile.
