# People Flow - Frontend UI Documentation

**Version:** 1.1.0
**Last Updated:** 2026-07-06
**Theme / Aesthetic:** Apple Liquid Glass (Light Theme)
**Tech Stack:** React 18, TypeScript, Vite, Vanilla CSS

---

## 1. Overview
This directory contains the decentralized React UI for the People Flow (formerly EWMP) platform. The frontend is designed to run independently of the backend using a strict contract-first approach, allowing parallel development.

The UI is built entirely using standard web technologies (React + Vanilla CSS) and enforces strict constraints, such as using pure CSS for background animations to ensure compatibility within iframes and zero-dependency rendering.

## 2. Design System: Apple Liquid Glass
The UI adheres strictly to the **Apple Liquid Glass (Light Theme)**.

### Color Palette
- **Primary:** `#111111`
- **Background Base:** `#F7F7F5`
- **Glass Surface:** `rgba(255, 255, 255, 0.4)`
- **Text Secondary:** `#6B6B6B`
- **Accent:** `#10B981` (Soft Emerald)
### Role-Based Dynamic Theming
The UI uses dynamic CSS variables mapped to user roles to instantly communicate RBAC context:
- **Employee (Self-Service):** 🌊 Blue (Ocean, Sky, Azure)
- **HR Manager:** 💜 Purple (Amethyst, Violet, Lilac)
- **IT Administrator:** 🟩 Green (Emerald, Mint, Sage)
- **Finance Executive:** 🪙 Gold/Orange (Amber, Peach, Yellow)
- **Super Admin:** 🔴 Crimson (Rose, Ruby, Blush)

*The fluid blobs (`.blob-1`, `.blob-2`, `.blob-3`) dynamically transition their `background-color` based on the selected role.*
### Typography
- **Font Family:** `Geist`, sans-serif.
- Utilizes strict weight tracking (e.g., `-0.04em` tracking for headings) and uppercase tracking (`0.12em`) for metadata labels to achieve a premium look.

### CSS Glassmorphism & Dynamic Edge Lighting
All interactive cards and panels use the `.glass-panel` or `.glass-cutout` utility classes. 

Instead of static borders, the UI employs a highly advanced **Dynamic Edge Lighting** system. It uses a base subtle border combined with an additive radial-gradient `::before` pseudo-element that tracks the mouse cursor via JavaScript variables (`--mouse-x`, `--mouse-y`), creating a fluid glowing spotlight that illuminates the edges of cards as you hover near them.

```css
.glass-panel {
  background: var(--color-glass-surface);
  backdrop-filter: blur(40px) saturate(150%);
  border: 1px solid var(--cutout-border);
  box-shadow: 0 30px 60px -15px var(--glass-shadow);
}
```

In Light Mode, the edge light automatically inverts into a dynamic edge shadow (`rgba(0, 0, 0, 0.15)`) to maintain perfect contrast against the light grey background. Deeply nested elements (like `.btn-glass`) cast independent drop shadows (`box-shadow: 0 2px 8px var(--glass-shadow);`) to ensure visual elevation.

### Ambient Background
The background uses a pure CSS approach (`.ambient-background`) with three absolute positioned radial blobs that animate continuously using `@keyframes float`, providing a fluid mesh-gradient without the heavy performance cost of WebGL or JavaScript.

---

## 3. Implemented Screens

### 3.1 Role-Specific Dashboard Hubs (`App.tsx` & `/components/dashboards/`)
**Purpose:** Provides a high-level, RBAC-filtered overview of organizational health and daily operations, specifically tailored to the user's role.

**Architecture:**
Instead of a monolithic dashboard, `App.tsx` conditionally renders one of five distinct dashboard components located in `src/components/dashboards/`:
- **`EmployeeDashboard.tsx`:** Self-service tools, attendance clocking, leave balances, and personal tasks.
- **`HRManagerDashboard.tsx`:** Recruitment pipelines, leave approvals, and total headcount.
- **`ITAdminDashboard.tsx`:** Asset inventory, helpdesk SLA breaches, and network uptime.
- **`FinanceDashboard.tsx`:** Payroll run drafts, pending expenses, and tax compliance.
- **`SuperAdminDashboard.tsx`:** Multi-tenant global overview, API latency, and system logs.

**Role-Based Access Control (RBAC) Simulator:**
To simulate the backend's JWT/Session logic and dynamic role delegation system, the frontend uses a hardcoded Role Dropdown in the main navigation bar. This dropdown instantly switches the application's context.

**Currently Supported Roles (Aligned with Backend `AGENTS.md` and `AUTH_RBAC_DESIGN.md`):**
- **Standard Employee:** (Default) Basic access. Can view their own dashboard, tasks, and read-only documents.
- **HR Manager:** Extended access. Can view headcount metrics, manage recruitment, and upload new enterprise policies to the Policy Nexus.
- **Administrator:** System access. Can view IT infrastructure, unassigned assets, and SLA breaches.
- **Finance Executive:** Financial access. Can view payroll estimates, pending expenses, and tax compliance.
- **Super Admin:** God mode. Can view global metrics, audit logs, and has full read/write capabilities across all modules.

**Layout:** 
- 12-column Bento Box Grid on desktop for all dashboard variants.

**Core Elements:**
1. **Floating Nav Pill:** Contains routing hooks matching the backend modules (Dashboard, Employees, Attendance, Leaves, Payroll, Recruitment, Help Desk).
2. **Central AI Greeting & Ops Assistant:**
   - Provides a conversational UI directly on the dashboard.
   - Includes an "RBAC Secured Query" visual badge ensuring all AI interactions are grounded in the user's backend permissions.
3. **Quick Actions Matrix:** Action cards for Recruitment, Payroll Runs, and Help Desk SLA breaches.
4. **Stacked Metrics (Right Panel):** 
   - **KPI Lenses:** Displays Headcount and Attendance Status using translucent UI elements.
   - **Action Feed Widget:** Consumes event-driven data (e.g., pending leaves, missed punches) allowing managers to act quickly.

### 3.2 AI Operations Assistant View (`AIAssistantView.tsx`)
**Purpose:** Provides a full-screen, dedicated workspace for interacting with the platform via natural language, fulfilling the "Dual Interface Principle" (Module M-15).

**Architecture:**
- **Layout:** A split view with a 3-column Chat History sidebar (Left) and a 9-column Main Chat Area (Right).
- **Interactive Widgets:** Designed to go beyond standard text chat. AI responses can render embedded React components (e.g., Leave Approval Cards, Payroll Tables) directly within the chat feed, allowing managers to take action without navigating away.
- **Routing:** Handled via a simple `currentView` state in `App.tsx` for fast toggling between the Dashboards and the Assistant.

### 3.3 Login Screen (`LoginPage.tsx`)
**Purpose:** The entry gatekeeper for the People Flow application.
**Architecture:**
- **Visuals:** Uses the standard Apple Liquid Glass light theme with a neutral, subtle "Slate/Grey" fluid mesh background. This ensures consistency with the core design language.
- **Authentication:** Fully integrated with the backend REST API (`/api/v1/auth/login`). It securely exchanges credentials for a JWT `accessToken` which is used to authorize all subsequent requests, while dynamically loading the user's RBAC profile from the backend.

### 3.4 Policy Nexus (`PolicyNexusView.tsx`)
**Purpose:** Centralized Document Management Module (M-06).
**Architecture:**
- **Visuals:** Displays a searchable grid of glass cards representing documents (PDFs, Word).
- **RBAC:** Inherits the active role.
  - **Employee:** Acknowledges required compliance documents with clear warning indicators.
  - **HR Manager:** Analyzes company-wide compliance rates and pending acknowledgments, and can upload new documents.
  - **Administrator / Finance Executive:** Domain-specific dynamic titles (e.g., "IT Security Hub") and read-only library.

### 3.5 Recruitment Pipeline (`RecruitmentPipelineView.tsx`)
**Purpose:** Active Headcount Tracking and Internal Job Board (Module M-04).
**Architecture:**
- **Visuals & RBAC:** Highly dynamic based on role:
  - **HR Manager / Super Admin:** Interactive Kanban board tracking candidates through interview stages, displaying expected salaries, interview feedback scores, and a quick "Schedule" feature.
  - **Standard Employee:** Secure Internal Job Board allowing employees to browse and apply for open positions, prominently featuring referral bonuses (e.g. "$2,000").
  - **Finance Executive:** Specialized Financial Impact Dashboard that forecasts projected payroll increases and referral bonus liabilities based on active headcount.
  - **Administrator:** Read-only summary dashboard of active headcounts and pipeline metrics.

### 3.6 Time & Absence (`TimeAbsenceView.tsx`)
**Purpose:** Daily Attendance and Leave Management (Modules M-05 & M-06).
**Architecture:**
- **Visuals & RBAC:** Combined interface adapting to role:
  - **Standard Employee:** Self-service clock-in widget with simulated GPS geofencing, leave balance rings, and request history.
  - **HR Manager:** Oversight dashboard with a queue of pending leave requests, enriched with **Conflict Warnings** (e.g., "3 other engineers on leave") to prevent understaffing.
  - **Finance Executive:** Executive summary detailing leave encashment projections, total leave liabilities, and overtime payouts.
  - **Administrator:** Advanced IT dashboard tracking attendance security anomalies, cross-referencing physical clock-ins against logical VPN/Network access discrepancies.

### 3.7 AI Operations Assistant View (`AIAssistantView.tsx`)
**Purpose:** Provides a full-screen, dedicated workspace for interacting with the platform via natural language, fulfilling the "Dual Interface Principle" (Module M-15).
**Architecture:**
- **Layout:** A split view with a 3-column Chat History sidebar (Left) and a 9-column Main Chat Area (Right).
- **Interactive Widgets:** Designed to go beyond standard text chat. AI responses render embedded React components (e.g., Leave Approval Cards, Payroll Tables) directly within the chat feed.
- **Role-Specific Quick Prompts:** Dynamically injects context-aware quick action chips above the chat input, tailored to the user's role (e.g., HR: "Generate Q3 attrition report", IT Admin: "Revoke VPN access for inactive users", Finance: "Project payroll impact of open roles").
- **Routing:** Handled via a simple `currentView` state in `App.tsx` for fast toggling between the Dashboards and the Assistant.

---

## 4. Backend Integration Guide (For Teammates)
To connect this UI to the Node.js/Express backend:

1. **State Management:** The UI relies on local React state and standard fetch hooks (`useEffect`) to load backend data.
2. **REST Endpoints:** Standard modules (Leave, Attendance, Notifications, Auth) target the primary backend on `http://localhost:5001/api/v1`.
3. **WebSockets:** The `Action Feed Widget` is designed to be populated by Socket.IO events (e.g., listening for `leave.requested` or `ticket.escalated`).
4. **AI Microservice Integration:** The central AI Operations Assistant connects directly to the dedicated AI microservice (`http://localhost:8001/api/v1/ai`). It uses the native `fetch` API to consume Server-Sent Events (SSE) from `ReadableStream`, providing real-time text streaming and dynamic widget rendering exactly like ChatGPT.

---
*Note: This documentation will be continuously updated as new screens (AI Ops Assistant, Policy Nexus, Team Topologies) and components are added.*
