# MCP Organization Tool Specification (`organization-tools.md`)

## 1. `mcp_org_create`
- **Purpose**: Provisions a new enterprise tenant organization, root admin account, settings, and default hierarchy.
- **HTTP Mapping**: `POST /api/v1/organizations`
- **Authentication**: Public
- **Input JSON Schema**:
  ```json
  {
    "type": "object",
    "properties": {
      "name": { "type": "string", "minLength": 2 },
      "domain": { "type": "string" },
      "code": { "type": "string", "pattern": "^[A-Z0-9_-]+$" },
      "adminEmail": { "type": "string", "format": "email" },
      "adminPassword": { "type": "string", "minLength": 8 },
      "adminFirstName": { "type": "string" },
      "adminLastName": { "type": "string" }
    },
    "required": ["name", "domain", "code", "adminEmail", "adminPassword", "adminFirstName", "adminLastName"]
  }
  ```
- **Transaction Behavior**: ACID ClientSession transaction. Provisions `Organization`, `OrganizationSettings`, system role templates, root `Super Admin` user, and default `General Administration` department.
- **Events Emitted**: `TENANT.PROVISIONED` (triggers sequential bootstrap handlers).
- **Audit Logs Generated**: `TENANT_PROVISIONED`.

---

## 2. `mcp_org_get_my`
- **Purpose**: Retrieves details and operational configuration settings of the authenticated user's organization.
- **HTTP Mapping**: `GET /api/v1/organizations/me`
- **Authentication**: Bearer JWT Required
- **Input JSON Schema**: `{ "type": "object", "properties": {} }`
- **Side Effects**: Reads tenant-scoped configuration from MongoDB.
