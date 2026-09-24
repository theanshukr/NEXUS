# Frontend API: Create Delegation Policy (`create-policy.md`)

- **HTTP Method & URL**: `POST /api/v1/role-delegation-policies`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Request Body**: `{ "sourceRoleId": "...", "targetRoleId": "..." }`
- **Response (`201 Created`)**: Returns created policy rule.
