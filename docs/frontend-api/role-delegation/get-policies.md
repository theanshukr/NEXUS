# Frontend API: Get Role Delegation Policies (`get-policies.md`)

- **HTTP Method & URL**: `GET /api/v1/role-delegation-policies`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Response (`200 OK`)**: Returns array of delegation policy rules (`sourceRoleId` $\longrightarrow$ `targetRoleId`).
