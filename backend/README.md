# 🌐 NexusOps – Enterprise Workforce Management Platform (Backend Service)

![Build Status](https://img.shields.io/badge/Status-M--01%20Frozen%20%26%20Complete-success)
![Architecture](https://img.shields.io/badge/Architecture-Modular%20Monolith-blue)
![Node.js](https://img.shields.io/badge/Node.js-v20%2B-green)
![Database](https://img.shields.io/badge/Database-MongoDB%20Atlas%20(ACID)-001E2B)
![Cache](https://img.shields.io/badge/Cache-Upstash%20Redis%20REST-00E9A3)
![License](https://img.shields.io/badge/License-ISC-purple)

An AI-Native, enterprise-grade B2B SaaS **Workforce Management Platform** designed for high-scale multi-tenant operations. NexusOps combines strict zero-trust tenant isolation, dynamic policy-driven role delegation, and ACID transactional integrity into a clean **Modular Monolith** architecture.

---

## 🏛️ Architecture & Module Status

### Module M-01 & M-02: Auth & Departments
> [!IMPORTANT]
> **STATUS: COMPLETE & FROZEN**  
> The Auth (M-01) and Departments (M-02) modules are feature-complete and frozen against architectural redesigns. Future work is strictly limited to bug, security, and critical performance fixes. All upcoming enterprise modules build directly on top of this verified core.

```text
[ Agnostic JSON REST API v1 ]
             │
             ▼
[ Security & Auth Middleware ] (JWT / Tenant Scoping / RBAC / Zod)
             │
             ▼
[ Domain Business Services ] (Auth / Roles / Delegation / Invites / Tenants)
             │
             ▼
[ BaseRepository Pattern ] (Automatic { organizationId } zero-trust query scoping)
             │
             ▼
[ MongoDB Atlas (ACID Sessions) ]  &  [ Upstash Redis (REST Serverless Cache) ]
```

---

## ✨ Key Features (M-01)

*   **Zero-Trust Multi-Tenancy**: Automated query scoping via `BaseRepository`. Attempting database access without an explicit `organizationId` scope triggers a fatal security exception.
*   **Dynamic RBAC & Role Delegation**: Organizations create unlimited custom roles alongside seeded enterprise templates. All permission strings are governed by a Centralized Permission Registry (`src/core/constants/permissions/`) using the enterprise `user.*` namespace. `RoleDelegationPolicy` enforces strict boundary rules governing which roles an administrative user is permitted to delegate or assign.
*   **ACID Tenant Onboarding**: Organization provisioning, system role seeding, and admin creation execute atomically inside Mongoose ClientSession transactions with guaranteed rollback on failure.
*   **Cryptographic Invitations**: Secure onboarding via hashed token verification, automated role assignment, and multi-tenant isolation.
*   **Immutable Compliance Ledger**: Mongoose-enforced tamper-evident audit logs recording all administrative, security, and provisioning events.
*   **Serverless Caching Strategy**: Low-latency Upstash Redis REST caching for user sessions, refresh tokens, RBAC permissions, and delegation policies with automatic mutation invalidation.

---

## 🚀 Quick Start & Installation

### Prerequisites
*   **Node.js**: v20.x or higher
*   **MongoDB Atlas**: Cluster with Replica Set enabled (required for ACID transactions)
*   **Upstash Redis**: Serverless REST database URL and Token

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Setup
Copy the example environment template and configure your cloud credentials:
```bash
cp .env.example .env
```

Ensure your `.env` contains:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/workforce_db?retryWrites=true&w=majority
UPSTASH_REDIS_REST_URL=https://your-upstash-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_upstash_token
JWT_SECRET=your_super_secret_jwt_key_at_least_32_characters_long
JWT_REFRESH_SECRET=your_super_secret_refresh_key_at_least_32_characters_long
```

### 3. Start Development Server
```bash
npm run dev
```
The server will boot, connect to MongoDB and Redis, and log:
```text
[INFO] Enterprise Backend Server running in [development] on port 5000
[INFO] MongoDB Connected -> Host: cluster.mongodb.net | Database: workforce_db
```

---

## 🧪 Testing & Verification

NexusOps includes a comprehensive automated regression suite powered by **Vitest** and **Supertest**, executing against isolated in-memory database and Redis mock environments.

```bash
# Run the complete test suite (164 tests across 17 suites)
npm test

# Run tests once without watch mode
npm run test:run

# Run tests with code coverage analysis
npm run test:coverage
```

### Verified Test Pass Rate
```text
 Test Files  17 passed (17)
      Tests  164 passed (164)
   Start at  12:36:51
   Duration  81.96s
```

---

## 📚 Documentation & Developer Guides

*   **[AI Development Guide (AGENTS.md)](../AGENTS.md)**: The primary architectural context guide and coding conventions for engineering teams and AI assistants.
*   **[Architecture Documentation](../docs/architecture/)**: Deep dive into zero-trust multi-tenancy, database schema, security architecture, and RBAC permission matrix.
*   **[OpenAPI Specification](../docs/openapi/openapi.yaml)**: The canonical contract for every HTTP REST endpoint. Import into Postman, Swagger UI, Bruno, or any OpenAPI-compatible client.
*   **[MCP Tool Registry](../docs/mcp/)**: Machine-consumable tool definitions for AI agents and MCP clients, synchronized with the REST API.
*   **[Frontend API Documentation](../docs/frontend-api/)**: Developer guides for integrating the REST API into frontend clients.
*   **[Orchestration Workflows](../docs/workflows/)**: AI reasoning patterns, tool selection strategy, and orchestration scenario guides.

---

## 🗺️ Enterprise Roadmap

*   [x] **M-01**: Authentication, Multi-Tenancy, RBAC & Role Delegation Foundation **[FROZEN]**
*   [x] **M-02**: Departments & Organizational Hierarchy **[FROZEN]**
*   [x] **M-03**: Employee Management & Profiles **[FROZEN]**
*   [x] **M-04**: Recruitment Management & ATS Pipeline **[FROZEN]**
*   [x] **M-05**: Attendance Management & Reconciliation **[FROZEN]**
*   [x] **M-06**: Leave Management (Policy Enforcement, Accruals, Approval Workflows)
*   [ ] **M-07**: Payroll Management (Automated Salary Calculation, Statutory Deductions, Payslips)
*   [ ] **M-08**: Performance Management (SMART Goals, KPI Tracking, Reviews)
*   [ ] **M-09**: Project & Task Management (Kanban Boards, Sprint Tracking)
*   [ ] **M-10**: Asset Management (Hardware/Software Inventory, Condition Audits)
*   [ ] **M-11**: Help Desk (Support Ticketing, SLA Enforcement)
*   [ ] **M-12**: Document Management (Corporate Repository, Semantic Search)
*   [ ] **M-13**: Notification System (In-App Alerts, Transactional Emails)
*   [ ] **M-14**: Reports & Analytics (Executive Dashboards, CSV/PDF Export)
*   [ ] **M-15**: AI Operations Assistant (Conversational Co-Pilot, Tool Registry)

---

## 📝 License
This project is licensed under the **ISC License**.
