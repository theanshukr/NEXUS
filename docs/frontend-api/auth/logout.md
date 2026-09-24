# Frontend API: User Logout (`logout.md`)

- **HTTP Method & URL**: `POST /api/v1/auth/logout`
- **Authentication**: Bearer JWT Required
- **Headers**: `Authorization: Bearer <accessToken>`
- **Request Body**: None / Empty JSON
- **Success Response (`200 OK`)**:
  ```json
  {
    "status": "success",
    "message": "Logged out successfully"
  }
  ```
- **Frontend Example**:
  ```typescript
  await axios.post('/api/v1/auth/logout', {}, { headers: { Authorization: `Bearer ${token}` } });
  localStorage.removeItem('accessToken');
  ```
