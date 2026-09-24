# MCP Holiday Tool Specification (`holiday-tools.md`)

## 1. `mcp_holidays_get_calendar`
- **Purpose**: Retrieves the holiday calendar for a specific office location and year.
- **HTTP Mapping**: `GET /api/v1/locations/:locationId/holidays/:year`
- **Authentication**: Bearer JWT Required
- **Permission Required**: `holiday.read`
- **Input JSON Schema**:
  ```json
  {
    "type": "object",
    "properties": {
      "locationId": { "type": "string" },
      "year": { "type": "integer" }
    },
    "required": ["locationId", "year"]
  }
  ```

---

## 2. `mcp_holidays_create_or_update`
- **Purpose**: Creates or replaces the holiday calendar for a location and year.
- **HTTP Mapping**: `PUT /api/v1/locations/:locationId/holidays/:year`
- **Authentication**: Bearer JWT Required
- **Permission Required**: `holiday.update`
- **Input JSON Schema**:
  ```json
  {
    "type": "object",
    "properties": {
      "locationId": { "type": "string" },
      "year": { "type": "integer" },
      "holidays": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "name": { "type": "string" },
            "date": { "type": "string", "format": "date" },
            "type": { "type": "string", "enum": ["MANDATORY", "OPTIONAL"] }
          },
          "required": ["name", "date", "type"]
        }
      }
    },
    "required": ["locationId", "year", "holidays"]
  }
  ```
- **Events Emitted**: `HOLIDAY_CALENDAR.UPDATED`.
- **Audit Logs Generated**: `HOLIDAY_UPDATED`.
