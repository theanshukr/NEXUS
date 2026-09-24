# Enterprise Frontend REST API Integration Guide

*Version 1.0 | Compatible with Next.js, React, iOS, Android, and Enterprise Integrations*

## 1. Overview
The Enterprise Workforce Management Platform exposes an agnostic, versioned JSON REST API v1 (`/api/v1`). All endpoints return structured JSON responses with uniform success indicators, data payloads, and standardized error formats.

---

## 2. Authentication & Header Conventions

### Request Headers
Every protected endpoint requires the following HTTP headers:
```http
Authorization: Bearer <accessToken>
Content-Type: application/json
Accept: application/json
```

### Token Rotation Flow (Frontend Client)
Access tokens are short-lived (15 minutes). When an API call returns `401 Unauthorized` with error code `ERR_UNAUTHORIZED` or `ERR_TOKEN_EXPIRED`, frontend clients should automatically execute a silent refresh:
1. Post stored refresh token to `POST /api/v1/auth/refresh`.
2. Update local storage or HTTP-only cookies with the new `accessToken` and rotated `refreshToken`.
3. Replay the failed API request with the new access token.

---

## 3. Multi-Tenancy & Zero URL Leaking
Frontend applications never include tenant IDs or organization ObjectIds in API URL paths (e.g., avoid `/api/v1/:orgId/users`).
- The backend automatically resolves the tenant context (`organizationId`) from the validated JWT bearer token.
- Attempting to query or mutate records belonging to a different tenant returns a `404 Not Found` or throws a fatal security exception.

---

## 4. Standardized Response Formats

### Successful Response Schema
```json
{
  "success": true,
  "data": {
    "id": "64b8f010a0123456789abcde",
    "name": "Engineering",
    "code": "ENG"
  },
  "message": "Department created successfully.",
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 50
  }
}
```

### Error Response Schema
```json
{
  "success": false,
  "error": {
    "code": "ERR_VALIDATION",
    "message": "Request input validation failed.",
    "details": [
      {
        "field": "code",
        "message": "Department code must be alphanumeric uppercase."
      }
    ]
  }
}
```

---

## 5. HTTP Status Code Conventions
- `200 OK`: Successful read or update.
- `201 Created`: Successful creation of a new resource.
- `400 Bad Request`: Input validation failure (`ERR_VALIDATION`).
- `401 Unauthorized`: Missing, expired, or invalid JWT access token (`ERR_UNAUTHORIZED`).
- `403 Forbidden`: Authenticated user lacks required RBAC permission or role delegation authority (`ERR_FORBIDDEN`).
- `404 Not Found`: Resource does not exist or belongs to a different tenant (`ERR_NOT_FOUND`).
- `409 Conflict`: Resource duplication (e.g., duplicate employee code, email, or department code) (`ERR_CONFLICT`).
- `423 Locked`: Account locked due to 5 consecutive failed login attempts (`ERR_ACCOUNT_LOCKED`).
- `500 Internal Server Error`: Unhandled server exception (`ERR_INTERNAL`).

---

## 6. Endpoint Reference Directory
For full request/response payloads, query parameters, and TypeScript interface definitions for all 57 endpoints, see [endpoints.md](file:///d:/Programming/Intern/Xebia/MainProject/docs/frontend-api/endpoints.md).
