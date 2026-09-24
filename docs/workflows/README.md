> **Orchestration Workflows** | Version: 2.0 | REST API is the single source of truth

# AI Orchestration Workflows

This directory contains documentation for how AI orchestrators, conversational assistants, and MCP clients should **think and reason** when using the NexusOps REST API.

> [!NOTE]
> This directory documents **reasoning and orchestration patterns** only. For the machine-consumable contract (schemas, parameters, responses), see `docs/openapi/` and `docs/mcp/`. For HTTP integration guides, see `docs/frontend-api/`.

---

## Contents

| File | Purpose |
|---|---|
| [scenarios.md](./scenarios.md) | Realistic prompt-to-REST orchestration walkthroughs |
| [tool-selection.md](./tool-selection.md) | Endpoint selection guide: which REST call to make for which user intent |
| [orchestration-protocol.md](./orchestration-protocol.md) | HTTP request construction, response parsing, and error handling patterns |

---

## Core Principle

The NexusOps AI layer follows a **REST-first architecture**. Every AI action is executed by making authenticated HTTP calls to `/api/v1/*`. There is no separate function dispatch layer or tool manager runtime.

```
User Intent
    │
    ▼ (AI reasons about which endpoint to call)
REST API (/api/v1/*)
    │
    ▼
Domain Service → Repository → MongoDB
```

---

## Quick Reference

For the permission required by each endpoint, see [`docs/architecture/permissions-matrix.md`](../architecture/permissions-matrix.md).

For the OpenAPI schema definition of each endpoint, see [`docs/openapi/openapi.yaml`](../openapi/openapi.yaml).

For MCP tool wrappers over each endpoint, see [`docs/mcp/README.md`](../mcp/README.md).
