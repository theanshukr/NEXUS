# 🔌 AI Backend Requirements & Integration Ledger
**Document Version:** 1.0.0  
**Classification:** Internal — Backend & AI Teams  
**Date:** July 3, 2026  

---

## 1. Overview
The NexusOps AI Platform operates as an authenticated HTTP client calling the backend REST API (port 5000) using the user's JWT. Below is the strict inventory of required endpoints, highlighting missing interfaces that block active development.

---

## 2. Critical & Blocking Integration Requirements

### 2.1 Get User Effective Permissions
*   **Required Endpoint:** `GET /api/v1/auth/me` or `GET /api/v1/users/me/permissions`
*   **HTTP Method:** `GET`
*   **Authentication:** Bearer JWT
*   **RBAC Permission:** None (self-query)
*   **Request Format:** Empty
*   **Response Format:**
    ```json
    {
      "success": true,
      "data": {
        "user": { "userId": "...", "email": "..." },
        "permissions": ["department.create", "role.assign", "user.read"]
      }
    }
    ```
*   **Why AI Requires It:** The AI Gateway must populate the user's permission array at request start. Without this, the local `ToolManager` blocks all tool execution (RBAC check fails due to empty context permissions).
*   **Priority:** 🔴 **CRITICAL & BLOCKING**

### 2.2 Department Select Options / Options Endpoint
*   **Required Endpoint:** `GET /api/v1/departments/options`
*   **HTTP Method:** `GET`
*   **Authentication:** Bearer JWT
*   **RBAC Permission:** `department.read`
*   **Request Format:** Empty
*   **Response Format:**
    ```json
    {
      "success": true,
      "data": [
        { "id": "...", "name": "Technology", "code": "TECH" }
      ]
    }
    ```
*   **Why AI Requires It:** Before creating or moving departments, the AI must resolve user-provided string names (e.g. "Technology group") to parent codes or IDs.
*   **Priority:** 🔴 **CRITICAL & BLOCKING (Needed for M-02 integration)**

### 2.3 Create Department (AI Tool Interface)
*   **Required Endpoint:** `POST /api/v1/departments`
*   **HTTP Method:** `POST`
*   **Authentication:** Bearer JWT
*   **RBAC Permission:** `department.create`
*   **Request Format:**
    ```json
    {
      "name": "Engineering",
      "code": "ENG",
      "parentCode": "TECH"
    }
    ```
*   **Response Format:** Standard success payload with created object ID.
*   **Why AI Requires It:** Execution tool for "Create department" prompt.
*   **Priority:** 🔴 **CRITICAL & BLOCKING (M-02 integration)**

---

## 3. Non-Blocking / Planned Future Module Requirements

### 3.1 Search Employees (Module M-03)
*   **Required Endpoint:** `GET /api/v1/employees?query=`
*   **HTTP Method:** `GET`
*   **Authentication:** Bearer JWT
*   **RBAC Permission:** `user.read`
*   **Request Format:** Query string parameters.
*   **Why AI Requires It:** Resolving employee names to MongoDB ObjectIds for performance reviews, leave overrides, and role assignments.
*   **Priority:** 🟡 **HIGH & NON-BLOCKING (Pending M-03 execution)**

### 3.2 Apply for Leave (Module M-06)
*   **Required Endpoint:** `POST /api/v1/leaves/apply`
*   **HTTP Method:** `POST`
*   **Authentication:** Bearer JWT
*   **RBAC Permission:** `leave.apply`
*   **Request Format:** `{ leaveType, startDate, endDate, reason }`
*   **Why AI Requires It:** Core conversational leave application workflow.
*   **Priority:** 🟡 **HIGH & NON-BLOCKING (Pending M-06 execution)**

### 3.3 Lock and Publish Payroll (Module M-07)
*   **Required Endpoint:** `POST /api/v1/payroll/:payrollRunId/lock`
*   **HTTP Method:** `POST`
*   **Authentication:** Bearer JWT
*   **RBAC Permission:** `payroll.lock`
*   **Request Format:** Empty
*   **Why AI Requires It:** Finalizes monthly payroll runs via manager prompts.
*   **Priority:** 🟢 **LOW & NON-BLOCKING (Pending M-07 execution)**

---

## 4. Summary Table of Dependencies

| Dependency | Endpoint | Method | Status | Target Module |
|---|---|---|---|---|
| Get Auth User Permissions | `/api/v1/auth/me` | `GET` | ✅ Implemented (Needs AI hookup) | M-01 |
| Resolve Department Names | `/api/v1/departments/options` | `GET` | ✅ Implemented (Needs AI hookup) | M-02 |
| Create Department | `/api/v1/departments` | `POST` | ✅ Implemented (Needs AI tool definition) | M-02 |
| Move Department | `/api/v1/departments/:id/move` | `POST` | ✅ Implemented (Needs AI tool definition) | M-02 |
| Search Employees | `/api/v1/employees` | `GET` | 🔴 Missing | M-03 |
| Apply Leave | `/api/v1/leaves/apply` | `POST` | 🔴 Missing | M-06 |
| Vector Ingestion Webhook | `/api/v1/ai/internal/document-ingestion` | `POST` | 🔴 Missing | M-12 (RAG) |
