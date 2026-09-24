# MCP Designation Tool Specification (`designation-tools.md`)

## 1. `mcp_desig_list`
- **Purpose**: Lists all job designations/titles in the organization.
- **HTTP Mapping**: `GET /api/v1/designations`
- **Authentication**: Bearer JWT Required
- **Permission Required**: `designation.read`
- **Input JSON Schema**: `{ "type": "object", "properties": { "status": { "type": "string" } } }`

---

## 2. `mcp_desig_get_by_id`
- **Purpose**: Retrieves details for a specific job designation.
- **HTTP Mapping**: `GET /api/v1/designations/:id`
- **Authentication**: Bearer JWT Required
- **Permission Required**: `designation.read`
- **Input JSON Schema**: `{ "type": "object", "properties": { "id": { "type": "string" } }, "required": ["id"] }`

---

## 3. `mcp_desig_create`
- **Purpose**: Creates a new job designation/title.
- **HTTP Mapping**: `POST /api/v1/designations`
- **Authentication**: Bearer JWT Required
- **Permission Required**: `designation.create`
- **Input JSON Schema**: `{ "type": "object", "properties": { "name": { "type": "string" }, "code": { "type": "string" }, "description": { "type": "string" } }, "required": ["name", "code"] }`
- **Events Emitted**: `DESIGNATION.CREATED`.
- **Audit Logs Generated**: `DESIGNATION_CREATED`.

---

## 4. `mcp_desig_update`
- **Purpose**: Updates job designation metadata.
- **HTTP Mapping**: `PATCH /api/v1/designations/:id`
- **Authentication**: Bearer JWT Required
- **Permission Required**: `designation.update`
- **Input JSON Schema**: `{ "type": "object", "properties": { "id": { "type": "string" }, "name": { "type": "string" }, "description": { "type": "string" } }, "required": ["id"] }`
- **Audit Logs Generated**: `DESIGNATION_UPDATED`.

---

## 5. `mcp_desig_archive`
- **Purpose**: Soft-deletes/archives a designation.
- **HTTP Mapping**: `POST /api/v1/designations/:id/archive`
- **Authentication**: Bearer JWT Required
- **Permission Required**: `designation.delete`
- **Input JSON Schema**: `{ "type": "object", "properties": { "id": { "type": "string" } }, "required": ["id"] }`
- **Events Emitted**: `DESIGNATION.ARCHIVED`.
- **Audit Logs Generated**: `DESIGNATION_ARCHIVED`.
