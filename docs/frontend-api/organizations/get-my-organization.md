# Frontend API: Get My Organization (`get-my-organization.md`)

- **HTTP Method & URL**: `GET /api/v1/organizations/me`
- **Authentication**: Bearer JWT Required
- **Headers**: `Authorization: Bearer <accessToken>`
- **Success Response (`200 OK`)**:
  ```json
  {
    "status": "success",
    "data": {
      "organization": {
        "id": "6a4760000000000000000000",
        "name": "Acme Enterprise Corp",
        "domain": "acme.com",
        "code": "ACME_CORP",
        "settings": {
          "employee": {
            "codeStrategy": "SEQUENCE",
            "codePrefix": "EMP-",
            "codeSequence": 1000
          }
        }
      }
    }
  }
  ```
