# Frontend API: Refresh Token Rotation (`refresh.md`)

- **HTTP Method & URL**: `POST /api/v1/auth/refresh`
- **Authentication**: Unauthenticated (requires valid refresh token in body or HTTP-only cookies)
- **Headers**: `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "refreshToken": "4d8a1f2e9c..."
  }
  ```
- **Success Response (`200 OK`)**:
  ```json
  {
    "status": "success",
    "data": {
      "accessToken": "eyJhbGciOiJIUzI1Ni...",
      "refreshToken": "8b9c2d1e0f..."
    }
  }
  ```
- **Error Responses**:
  - `401 Unauthorized`: Token expired, revoked, or invalid.
- **Frontend / React Example**:
  ```typescript
  // Axios interceptor handles 401 silently
  const res = await axios.post('/api/v1/auth/refresh', { refreshToken });
  ```
