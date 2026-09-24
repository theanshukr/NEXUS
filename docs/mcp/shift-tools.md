# MCP Shift Tool Specification (`shift-tools.md`)

## 1. `mcp_shift_list`
- **Purpose**: Lists all work schedule shifts.
- **HTTP Mapping**: `GET /api/v1/shifts`
- **Authentication**: Bearer JWT Required
- **Permission Required**: `shift.read`
- **Input JSON Schema**: `{ "type": "object", "properties": { "status": { "type": "string" } } }`

---

## 2. `mcp_shift_get_by_id`
- **Purpose**: Retrieves details for a specific shift schedule.
- **HTTP Mapping**: `GET /api/v1/shifts/:id`
- **Authentication**: Bearer JWT Required
- **Permission Required**: `shift.read`
- **Input JSON Schema**: `{ "type": "object", "properties": { "id": { "type": "string" } }, "required": ["id"] }`

---

## 3. `mcp_shift_create`
- **Purpose**: Creates a new shift schedule with start time, end time, and break durations.
- **HTTP Mapping**: `POST /api/v1/shifts`
- **Authentication**: Bearer JWT Required
- **Permission Required**: `shift.create`
- **Input JSON Schema**: `{ "type": "object", "properties": { "name": { "type": "string" }, "code": { "type": "string" }, "startTime": { "type": "string", "pattern": "^(([0-1][0-9])|(2[0-3])):[0-5][0-9]$" }, "endTime": { "type": "string", "pattern": "^(([0-1][0-9])|(2[0-3])):[0-5][0-9]$" } }, "required": ["name", "code", "startTime", "endTime"] }`
- **Events Emitted**: `SHIFT.CREATED`.
- **Audit Logs Generated**: `SHIFT_CREATED`.

---

## 4. `mcp_shift_update`
- **Purpose**: Updates work shift timing or break rules.
- **HTTP Mapping**: `PATCH /api/v1/shifts/:id`
- **Authentication**: Bearer JWT Required
- **Permission Required**: `shift.update`
- **Input JSON Schema**: `{ "type": "object", "properties": { "id": { "type": "string" }, "name": { "type": "string" }, "startTime": { "type": "string" }, "endTime": { "type": "string" } }, "required": ["id"] }`
- **Audit Logs Generated**: `SHIFT_UPDATED`.

---

## 5. `mcp_shift_archive`
- **Purpose**: Soft-deletes/archives a shift schedule.
- **HTTP Mapping**: `POST /api/v1/shifts/:id/archive`
- **Authentication**: Bearer JWT Required
- **Permission Required**: `shift.delete`
- **Input JSON Schema**: `{ "type": "object", "properties": { "id": { "type": "string" } }, "required": ["id"] }`
- **Events Emitted**: `SHIFT.ARCHIVED`.
- **Audit Logs Generated**: `SHIFT_ARCHIVED`.
