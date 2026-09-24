# Frontend API: Authenticate User (`login.md`)

- **HTTP Method & URL**: `POST /api/v1/auth/login`
- **Authentication**: Unauthenticated (Public)
- **Headers**: `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "email": "admin@nexusops.io",
    "password": "SecurePassword123!"
  }
  ```
- **Success Response (`200 OK`)**:
  ```json
  {
    "status": "success",
    "data": {
      "accessToken": "eyJhbGciOiJIUzI1Ni...",
      "refreshToken": "4d8a1f2e9c...",
      "user": {
        "id": "6a4760000000000000000001",
        "email": "admin@nexusops.io",
        "firstName": "Super",
        "lastName": "Admin",
        "organizationId": "6a4760000000000000000000"
      }
    }
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: Validation failure (missing email or password).
  - `401 Unauthorized`: Invalid credentials.
  - `423 Locked`: Account locked due to 5 consecutive failed login attempts (`ERR_ACCOUNT_LOCKED`).
- **Frontend / React Axios Example**:
  ```typescript
  const response = await axios.post('/api/v1/auth/login', { email, password });
  localStorage.setItem('accessToken', response.data.data.accessToken);
  ```
