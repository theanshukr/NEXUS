# MCP Department Tool Specification (`department-tools.md`)

## 1. `mcp_dept_list`
- **Purpose**: Lists all departments in the organization with optional filtering by status or parent code.
- **HTTP Mapping**: `GET /api/v1/departments`
- **Authentication**: Bearer JWT Required
- **Permission Required**: `department.read`
- **Input JSON Schema**: `{ "type": "object", "properties": { "status": { "type": "string" }, "parentCode": { "type": "string" } } }`

---

## 2. `mcp_dept_get_tree`
- **Purpose**: Retrieves the full organizational department hierarchy structured as a nested tree.
- **HTTP Mapping**: `GET /api/v1/departments/tree`
- **Authentication**: Bearer JWT Required
- **Permission Required**: `department.read`
- **Input JSON Schema**: `{ "type": "object", "properties": {} }`
- **Side Effects**: Reads computed hierarchy tree, utilizing caching where applicable.

---

## 3. `mcp_dept_get_select_options`
- **Purpose**: Retrieves a lightweight list of department codes and names formatted for UI dropdown selectors.
- **HTTP Mapping**: `GET /api/v1/departments/select-options` (and alias `/options`)
- **Authentication**: Bearer JWT Required
- **Permission Required**: `department.read`
- **Input JSON Schema**: `{ "type": "object", "properties": {} }`

---

## 4. `mcp_dept_get_by_id`
- **Purpose**: Retrieves detailed metadata and cost center info for a specific department.
- **HTTP Mapping**: `GET /api/v1/departments/:id`
- **Authentication**: Bearer JWT Required
- **Permission Required**: `department.read`
- **Input JSON Schema**: `{ "type": "object", "properties": { "id": { "type": "string" } }, "required": ["id"] }`

---

## 5. `mcp_dept_create`
- **Purpose**: Creates a new organizational department or sub-department.
- **HTTP Mapping**: `POST /api/v1/departments`
- **Authentication**: Bearer JWT Required
- **Permission Required**: `department.create`
- **Input JSON Schema**:
  ```json
  {
    "type": "object",
    "properties": {
      "name": { "type": "string", "minLength": 2 },
      "code": { "type": "string", "pattern": "^[A-Z0-9_-]+$" },
      "parentCode": { "type": "string" },
      "costCenter": { "type": "string" }
    },
    "required": ["name", "code"]
  }
  ```
- **Events Emitted**: `DEPARTMENT.CREATED`.
- **Audit Logs Generated**: `DEPARTMENT_CREATED`.

---

## 6. `mcp_dept_update`
- **Purpose**: Updates department name, cost center, or operational metadata.
- **HTTP Mapping**: `PUT /api/v1/departments/:id`
- **Authentication**: Bearer JWT Required
- **Permission Required**: `department.update`
- **Input JSON Schema**: `{ "type": "object", "properties": { "id": { "type": "string" }, "name": { "type": "string" }, "costCenter": { "type": "string" } }, "required": ["id"] }`
- **Audit Logs Generated**: `DEPARTMENT_UPDATED`.

---

## 7. `mcp_dept_move`
- **Purpose**: Reorganizes the organizational hierarchy by relocating a department under a new parent code.
- **HTTP Mapping**: `POST /api/v1/departments/:id/move`
- **Authentication**: Bearer JWT Required
- **Permission Required**: `department.update`
- **Input JSON Schema**: `{ "type": "object", "properties": { "id": { "type": "string" }, "newParentCode": { "type": "string" } }, "required": ["id", "newParentCode"] }`
- **Business Rules**: Prevents cyclic parenting (a department cannot become a child of itself or its descendants).
- **Events Emitted**: `DEPARTMENT.MOVED`.
- **Audit Logs Generated**: `DEPARTMENT_MOVED`.

---

## 8. `mcp_dept_archive`
- **Purpose**: Soft-deletes/archives a department.
- **HTTP Mapping**: `DELETE /api/v1/departments/:id`
- **Authentication**: Bearer JWT Required
- **Permission Required**: `department.delete`
- **Input JSON Schema**: `{ "type": "object", "properties": { "id": { "type": "string" } }, "required": ["id"] }`
- **Business Rules**: Prevents archival if active child departments or active employees are assigned to this department.
- **Events Emitted**: `DEPARTMENT.ARCHIVED`.
- **Audit Logs Generated**: `DEPARTMENT_ARCHIVED`.
