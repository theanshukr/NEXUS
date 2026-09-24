# AI API Specification
**Version:** 1.0.0 | **Base URL:** `http://localhost:8001`

---

## 1. Chat Endpoint

### `POST /api/v1/ai/chat`

**Headers**
```
Authorization: Bearer <userJwt>
Content-Type: application/json
X-User-Name: John Doe  (optional — used in system prompt)
```

**Request Body**
```json
{
  "userPrompt": "Approve Priya's casual leave for next Monday",
  "sessionId": "sess_abc123",  
  "clientContext": {
    "currentModule": "LEAVE",
    "currentPageUrl": "/dashboard/leaves/pending",
    "selectedRecordIds": ["leave_id_xyz"]
  }
}
```

**Response:** `text/event-stream`

```
event: session
data: {"sessionId":"sess_abc123","timestamp":1720000000000}

event: token
data: {"content":"I'll approve Priya's","correlationId":"corr_xyz"}

event: tool_start
data: {"name":"approveLeave","args":{"leaveId":"leave_id_xyz"},"correlationId":"corr_xyz"}

event: tool_result
data: {"name":"approveLeave","result":{"success":true,"data":{...}},"correlationId":"corr_xyz"}

event: token
data: {"content":" casual leave for Monday, Oct 14th. Done!","correlationId":"corr_xyz"}

event: done
data: {"correlationId":"corr_xyz","usage":{"inputTokens":1250,"outputTokens":89,"costUsd":0.0052},"toolsInvoked":[{"name":"approveLeave","status":"SUCCESS","executionTimeMs":312}],"totalLatencyMs":1840}
```

**Error events**
```
event: error
data: {"message":"Permission denied to execute approveLeave","correlationId":"corr_xyz"}
```

---

## 2. Conversation Endpoints

### `GET /api/v1/ai/conversations/:sessionId`
Returns conversation history for a session.

**Response**
```json
{
  "success": true,
  "sessionId": "sess_abc123",
  "messages": [
    { "role": "user", "content": "...", "timestamp": 1720000000 },
    { "role": "assistant", "content": "...", "timestamp": 1720000001 }
  ],
  "count": 4
}
```

### `DELETE /api/v1/ai/conversations/:sessionId`
Clears a conversation context. Useful for "start over."

```json
{ "success": true, "message": "Conversation cleared successfully", "sessionId": "sess_abc123" }
```

---

## 3. MCP Endpoints

### `GET /api/v1/mcp/tools`
Returns RBAC-filtered tool definitions as JSON Schema.

```json
{
  "success": true,
  "tools": [
    {
      "name": "getMyLeaveBalances",
      "description": "Returns the authenticated employee's current leave balances...",
      "parameters": { "type": "object", "properties": { "year": {...} } }
    }
  ],
  "count": 23
}
```

### `POST /api/v1/mcp/execute`
Directly execute a tool from an external MCP client.

**Request**
```json
{ "toolName": "getMyLeaveBalances", "arguments": { "year": 2026 } }
```

**Response**
```json
{
  "success": true,
  "toolName": "getMyLeaveBalances",
  "correlationId": "corr_abc",
  "result": { "balances": [...] },
  "executionTimeMs": 214
}
```

---

## 4. Health Endpoints

### `GET /health`
```json
{
  "status": "ok",
  "service": "nexusops-ai-platform",
  "version": "1.0.0",
  "uptime": 3600,
  "tools": 42,
  "providers": ["gemini", "groq", "openrouter"]
}
```

---

## 5. Error Codes

| Code | HTTP | Meaning |
|------|------|---------|
| `ERR_SAFETY_BLOCKED` | 400 | Prompt injection or jailbreak detected |
| `ERR_AI_RATE_LIMITED` | 429 | 20 req/15min exceeded |
| `ERR_AUTH` | 401 | Invalid or expired JWT |
| `ERR_AI_DISABLED` | 503 | AI_ENABLED=false feature flag |
