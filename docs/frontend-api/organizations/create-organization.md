# Frontend API: Create Organization (`create-organization.md`)

- **HTTP Method & URL**: `POST /api/v1/organizations`
- **Authentication**: Unauthenticated (Public Onboarding)
- **Headers**: `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "name": "Acme Enterprise Corp",
    "domain": "acme.com",
    "code": "ACME_CORP",
    "adminEmail": "owner@acme.com",
    "adminPassword": "SecureAdminPassword123!",
    "adminFirstName": "Alice",
    "adminLastName": "Founder"
  }
  ```
- **Success Response (`201 Created`)**:
  ```json
  {
    "status": "success",
    "data": {
      "organization": { "id": "...", "name": "Acme Enterprise Corp", "code": "ACME_CORP" },
      "adminUser": { "id": "...", "email": "owner@acme.com" }
    }
  }
  ```
