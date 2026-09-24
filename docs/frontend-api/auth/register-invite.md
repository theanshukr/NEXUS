# Frontend API: Register via Invitation (`register-invite.md`)

- **HTTP Method & URL**: `POST /api/v1/auth/register-invite`
- **Authentication**: Unauthenticated (Public)
- **Headers**: `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "token": "hex_invitation_token_string",
    "firstName": "John",
    "lastName": "Doe",
    "password": "SecurePassword123!"
  }
  ```
- **Success Response (`201 Created`)**:
  ```json
  {
    "status": "success",
    "data": {
      "accessToken": "eyJhb...",
      "refreshToken": "4d8a...",
      "user": { "id": "...", "email": "john.doe@enterprise.com", "organizationId": "..." }
    }
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: Token expired, revoked, or already redeemed.
- **Frontend / React Example**:
  ```typescript
  await axios.post('/api/v1/auth/register-invite', { token, firstName, lastName, password });
  ```
