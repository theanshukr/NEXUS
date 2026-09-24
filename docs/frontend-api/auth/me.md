# Frontend API: Get Current Profile & Permissions (`me.md`)

- **HTTP Method & URL**: `GET /api/v1/auth/me`
- **Authentication**: Bearer JWT Required
- **Headers**: `Authorization: Bearer <accessToken>`
- **Query Parameters**: None
- **Success Response (`200 OK`)**:
  ```json
  {
    "status": "success",
    "data": {
      "user": {
        "id": "6a4760000000000000000001",
        "email": "admin@nexusops.io",
        "firstName": "Super",
        "lastName": "Admin",
        "organizationId": "6a4760000000000000000000"
      },
      "permissions": ["*"]
    }
  }
  ```
- **Error Responses**: `401 Unauthorized` (Token expired or missing).
- **Frontend / React Example**:
  ```typescript
  const res = await axios.get('/api/v1/auth/me', { headers: { Authorization: `Bearer ${token}` } });
  const permissions = res.data.data.permissions;
  ```
