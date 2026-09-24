# Frontend API: Validate Invitation Token (`validate-token.md`)

- **HTTP Method & URL**: `GET /api/v1/invites/validate/:token`
- **Authentication**: Unauthenticated (Public)
- **Response (`200 OK`)**: `{ "status": "success", "data": { "email": "...", "organizationId": "...", "roleIds": [...] } }`
