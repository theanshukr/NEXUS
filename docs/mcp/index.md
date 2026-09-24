# Master Model Context Protocol (MCP) Tool Catalog

*Synchronized with Backend Architecture (M-01 + M-02 + M-03 + M-04)*

This index serves as the master catalog for all 65 Model Context Protocol (MCP) tool schemas exposed by the Enterprise Workforce Management Platform. Tools are categorized by domain module into specialized specification files.

---

## 📂 MCP Category Tool Files

| Module | Schema Specification File | Namespace Prefix | Tool Count | Primary Responsibilities |
|---|---|---|---|---|
| **Authentication** | [`auth-tools.md`](file:///d:/Programming/Intern/Xebia/MainProject/docs/mcp/auth-tools.md) | `mcp_auth_*` | 5 | Session login, token rotation, invite redemption, logout, profile inquiry |
| **Organizations** | [`organization-tools.md`](file:///d:/Programming/Intern/Xebia/MainProject/docs/mcp/organization-tools.md) | `mcp_org_*` | 2 | Tenant provisioning, active tenant configuration inquiry |
| **RBAC Roles** | [`role-tools.md`](file:///d:/Programming/Intern/Xebia/MainProject/docs/mcp/role-tools.md) | `mcp_roles_*` | 8 | Custom role creation, duplication, assignment, removal, permission inquiry |
| **Role Delegation**| [`role-delegation-tools.md`](file:///d:/Programming/Intern/Xebia/MainProject/docs/mcp/role-delegation-tools.md)| `mcp_delegation_*`| 3 | Role delegation policy CRUD and governance |
| **Invitations** | [`invitation-tools.md`](file:///d:/Programming/Intern/Xebia/MainProject/docs/mcp/invitation-tools.md) | `mcp_invites_*` | 4 | Token validation, employee onboarding invitation issuance and revocation |
| **Departments** | [`department-tools.md`](file:///d:/Programming/Intern/Xebia/MainProject/docs/mcp/department-tools.md) | `mcp_dept_*` | 8 | Hierarchical tree inquiry, tree reorganization, department archival |
| **Designations** | [`designation-tools.md`](file:///d:/Programming/Intern/Xebia/MainProject/docs/mcp/designation-tools.md) | `mcp_desig_*` | 5 | Job title and designation lifecycle management |
| **Locations** | [`location-tools.md`](file:///d:/Programming/Intern/Xebia/MainProject/docs/mcp/location-tools.md) | `mcp_loc_*` | 5 | Office location, timezone, and operational site management |
| **Shifts** | [`shift-tools.md`](file:///d:/Programming/Intern/Xebia/MainProject/docs/mcp/shift-tools.md) | `mcp_shift_*` | 5 | Work schedule scheduling and timing rule administration |
| **Holidays** | [`holiday-tools.md`](file:///d:/Programming/Intern/Xebia/MainProject/docs/mcp/holiday-tools.md) | `mcp_holidays_*` | 2 | Yearly location-bound holiday calendar management |
| **Employees** | [`employee-tools.md`](file:///d:/Programming/Intern/Xebia/MainProject/docs/mcp/employee-tools.md) | `mcp_emp_*` | 10 | Workforce directory, org chart tree, profile edits, archival & restoration |
| **Recruitment** | [`recruitment-tools.md`](file:///d:/Programming/Intern/Xebia/MainProject/docs/mcp/recruitment-tools.md) | `mcp_recruitment_*` | 8 | Job requisitions, job postings, applications, ATS stages, offers, hiring |

---

## 🏛️ General MCP Execution Architecture
1. **Stateless JWT Propagation**: All tools require a valid `Authorization: Bearer <token>` header propagated from the client host.
2. **Zero Tenant Leaking**: The `organizationId` is never passed as a tool parameter; it is resolved strictly from the authenticated JWT session context.
3. **ACID Transaction Boundaries**: Multi-step or multi-document tools execute inside Mongoose ClientSession transactions with automatic rollback on error.
