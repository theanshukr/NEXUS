# MCP Location Tool Specification (`location-tools.md`)

## 1. `mcp_loc_list`
- **Purpose**: Lists office locations and operational sites.
- **HTTP Mapping**: `GET /api/v1/locations`
- **Authentication**: Bearer JWT Required
- **Permission Required**: `location.read`
- **Input JSON Schema**: `{ "type": "object", "properties": { "status": { "type": "string" } } }`

---

## 2. `mcp_loc_get_by_id`
- **Purpose**: Retrieves details for a specific location.
- **HTTP Mapping**: `GET /api/v1/locations/:id`
- **Authentication**: Bearer JWT Required
- **Permission Required**: `location.read`
- **Input JSON Schema**: `{ "type": "object", "properties": { "id": { "type": "string" } }, "required": ["id"] }`

---

## 3. `mcp_loc_create`
- **Purpose**: Creates a new office location with timezone specifications.
- **HTTP Mapping**: `POST /api/v1/locations`
- **Authentication**: Bearer JWT Required
- **Permission Required**: `location.create`
- **Input JSON Schema**: `{ "type": "object", "properties": { "name": { "type": "string" }, "code": { "type": "string" }, "timezone": { "type": "string" }, "address": { "type": "string" } }, "required": ["name", "code", "timezone"] }`
- **Events Emitted**: `LOCATION.CREATED`.
- **Audit Logs Generated**: `LOCATION_CREATED`.

---

## 4. `mcp_loc_update`
- **Purpose**: Updates office location details or timezone.
- **HTTP Mapping**: `PATCH /api/v1/locations/:id`
- **Authentication**: Bearer JWT Required
- **Permission Required**: `location.update`
- **Input JSON Schema**: `{ "type": "object", "properties": { "id": { "type": "string" }, "name": { "type": "string" }, "timezone": { "type": "string" } }, "required": ["id"] }`
- **Audit Logs Generated**: `LOCATION_UPDATED`.

---

## 5. `mcp_loc_archive`
- **Purpose**: Soft-deletes/archives an office location.
- **HTTP Mapping**: `POST /api/v1/locations/:id/archive`
- **Authentication**: Bearer JWT Required
- **Permission Required**: `location.delete`
- **Input JSON Schema**: `{ "type": "object", "properties": { "id": { "type": "string" } }, "required": ["id"] }`
- **Events Emitted**: `LOCATION.ARCHIVED`.
- **Audit Logs Generated**: `LOCATION_ARCHIVED`.
