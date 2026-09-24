# People Flow - Integration Guide

Welcome to the **People Flow** development team! This guide provides everything you need to know about the current integration state between the Frontend (React/Vite) and Backend (Node.js/Express) applications.

## 🚀 Quick Start

To run both systems locally for development:

### 1. Start the Backend
The backend uses Node.js and MongoDB.
```bash
cd backend
npm install
npm run dev
```
- Server runs on: `http://localhost:3000` (by default)
- The API is served under the `/api/v1` prefix.

### 2. Start the Frontend
The frontend is a Vite-powered React application using vanilla CSS for premium glassmorphism UI.
```bash
cd frontend
npm install
npm run dev
```
- Client runs on: `http://localhost:5173`
- API calls are routed via `src/api/client.ts`. The base URL is configured in `.env`.

---

## 🔌 Currently Wired Features (Phase 1-3)

We have successfully migrated several modules from static mock data to live backend REST APIs. The following features are currently wired up:

### 1. Authentication & Profile
- **Organization Provisioning**: `POST /api/v1/organizations` handles SaaS tenant creation and sets up the root Super Admin account.
- **Employee Signup Flow**: `POST /api/v1/auth/employee-signup` allows users to join an existing organization (pending Super Admin approval).
- **Login Flow**: `POST /api/v1/auth/login` issues secure JWTs. Role-switching and isolation is fully enforced on the backend.
- **My Profile**: `GET /api/v1/auth/me` fetches the authenticated user's profile and RBAC permissions.

### 2. Leave Management (Time & Absence Module)
- **Submit Leave Request**: Employees can submit a leave request via the "Request Leave" modal.
  - **Endpoint**: `POST /api/v1/leave/requests`
  - **Payload**: `{ type, startDate, endDate, reason }`
- **View Pending Leaves**: HR Managers see actual pending requests from the database.
  - **Endpoint**: `GET /api/v1/leave/requests?status=PENDING_APPROVAL`
- **Approve/Reject Leaves**: HR Managers can approve or reject leaves.
  - **Endpoints**: `POST /api/v1/leave/requests/:id/approve` and `POST /api/v1/leave/requests/:id/reject`

### 3. Attendance Clock-In (Time & Absence Module)
- **Active Shift Status**: On mount, the frontend checks if the employee is already clocked in.
  - **Endpoint**: `GET /api/v1/attendance/today`
- **Clock In**: Initiates a shift, passing GPS coordinates.
  - **Endpoint**: `POST /api/v1/attendance/clock-in`
- **Clock Out**: Ends the active shift.
  - **Endpoint**: `POST /api/v1/attendance/clock-out`

### 4. Payroll & Financials (Payroll Module)
- **Employee Payslips**: Employees view their historically generated payslips.
  - **Endpoint**: `GET /api/v1/payroll/payslips/my`
- **Finance Dashboard**: The latest payroll cycle and aggregated metrics are fetched dynamically.
  - **Endpoints**: `GET /api/v1/payroll/cycles` and `GET /api/v1/payroll/runs`
- **Initiate Payout**: Finance Executives can trigger the backend Payroll Calculation Engine to generate payslips for the current cycle.
  - **Endpoint**: `POST /api/v1/payroll/runs`

### 5. Global Notifications (Notifications Module)
- **Real-Time Polling**: The frontend dashboard automatically polls the backend every 30 seconds for live notifications.
  - **Endpoint**: `GET /api/v1/notifications/my`
- **Interactive Actions**: Employees can click a notification or the "Mark all as read" button to instantly dismiss alerts.
  - **Endpoint**: `POST /api/v1/notifications/read`

### 6. AI Operations Assistant (AI Microservice)
- **Standalone Microservice**: The AI engine runs as a separate microservice on port 8001 (`http://localhost:8001/api/v1/ai`).
- **Dynamic Context**: On load, the AI fetches the user's role-based conversation history.
  - **Endpoint**: `GET /api/v1/ai/conversations/:sessionId`
- **Interactive Streaming Chat Engine**: Users query the real LLM orchestrator, which streams responses via Server-Sent Events (SSE) and emits dynamic widget payloads when executing agentic tools.
  - **Endpoint**: `POST /api/v1/ai/chat`

---

## 🔑 Testing the Application (Clean Slate)
Because the database is not pre-seeded with mock data, you are working with a **clean slate**. 

To test the application locally:
1. Navigate to the `Signup` page on the frontend.
2. Select **Create Workspace**.
3. Provision a new organization (e.g., ACME Corp) and set the Root Super Admin credentials.
4. Log in using those new admin credentials.
5. From the Admin dashboard, you can approve new employees who use the **Join Workspace** signup flow.

---

## 🔗 Connected Modules

When you are ready to wire up a new module (e.g., Notifications, Performance, Recruitment), follow this standard pattern:

### 1. Frontend API Client (`src/api/client.ts`)
Always use the centralized `apiClient` Axios instance. It handles JWT injection automatically via interceptors.

```typescript
import { apiClient } from '../api/client';

// Example fetching data
const fetchData = async () => {
  const response = await apiClient.get('/your-module/endpoint');
  return response.data;
};
```

### 2. Handling State
Replace static mock arrays with `useState` and `useEffect`. Ensure you provide a fallback for loading states and empty data arrays.

```typescript
const [data, setData] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  const loadData = async () => {
    try {
      const res = await apiClient.get('/your-module/endpoint');
      setData(res.data?.data || []);
    } catch (error) {
      console.error("API Error", error);
    } finally {
      setLoading(false);
    }
  };
  loadData();
}, []);
```

### 3. Backend Routes
Ensure your backend route validates permissions using the `hasPermission` middleware before executing controller logic.

```javascript
import { hasPermission } from '#@/core/middleware/hasPermission.js';
import { PERMISSIONS } from '#@/core/constants/permissions/index.js';

router.post(
  '/',
  hasPermission(PERMISSIONS.MODULE.ACTION),
  YourController.createAction
);
```

---

## 🎨 UI & Styling Guidelines

- **Vanilla CSS**: We strictly use vanilla CSS (`index.css` and modular CSS) for styling. Tailwind is NOT used in this project to maintain ultimate control over the premium glassmorphism aesthetic.
- **Glassmorphism**: Use the `.glass-panel` and `.glass-cutout` utility classes for container backgrounds. Do not hardcode `rgba()` backgrounds in inline styles for containers.
- **Icons**: We use Google Material Symbols. Include them via `<span className="material-symbols-outlined">icon_name</span>`.

Happy coding! If you run into issues, consult the API documentation located in `backend/docs` or the frontend tracker in `docs/FRONTEND_TRACKER.md`.
