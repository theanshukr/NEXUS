<div align="center">
  <img src="frontend/public/favicon.svg" alt="Nexus Logo" width="100" />
  <h1>NEXUS</h1>
  <p><b>Workforce Intelligence Platform & Enterprise Decision OS</b></p>
  <p><i>Unifying Employee Intelligence Profiles, Skill Extraction, Internal Mobility, and HR Decision Systems</i></p>
</div>

---

## 🌟 Overview

**Nexus** is an enterprise workforce intelligence platform built on top of a resilient HR decision and workforce management foundation. It transforms static employee directories into dynamic intelligence profiles with multi-tier skills matrices, verified proficiencies, project experience timelines, career aspirations, and organizational knowledge graphs.

Nexus features a state-of-the-art dark-mode glassmorphic interface with reactive UI components, zero layout shifts, and deep role-based workspaces.

---

## 🚀 Key Modules & Capabilities

### 1. 🧠 Employee Intelligence Profiles (Phase 1)
- **Unified Intelligence Persona**: Combines core HR data (department, designation, reporting lines, compensation, shifts) with skill portfolios and technical experience.
- **Multi-Category Skills Matrix**: Categorized across `BACKEND`, `FRONTEND`, `CLOUD_DEVOPS`, `DATA_AI`, `DATABASE`, `ARCHITECTURE`, `QA_TESTING`, and `SECURITY`.
- **Skill Verification Engine**: Allows HR and Engineering leads to verify, adjust proficiency levels (`Beginner`, `Intermediate`, `Advanced`, `Expert`), or record endorsements.
- **Experience & Project Portfolios**: Track high-impact technical initiatives, tech stacks used, team roles, and quantifiable business outcomes.
- **Career Aspirations & Growth Paths**: Maps employees' target roles, skills of interest, relocation willingness, and preferred work arrangements (Hybrid/Remote/On-site).
- **Indian Engineering Workforce Benchmark**: Pre-seeded with 45+ comprehensive Indian engineering workforce profiles across Bangalore, Hyderabad, Pune, Gurgaon, Noida, and Chennai.

### 2. 👥 Dynamic Role-Based Workspaces
5 distinct dashboards tailored to operational organizational responsibilities:
- **HR Manager Workspace**: Talent directory, skill gap audits, onboarding/offboarding workflows, department structuring.
- **Standard Employee Portal**: Self-service profile, skill management, leave requests, attendance check-in, payroll view.
- **Super Admin Dashboard**: Tenant provisioning, RBAC management, system audit logs, enterprise settings.
- **Finance Executive Hub**: Payroll run approvals, point-in-time salary audits, payslip generation.
- **IT Administrator Console**: System user management, role assignments, security policies.

### 3. ⏱️ Time, Absence & Attendance
- Geofenced clock-ins and clock-outs.
- Automated leave balance snapshots and conflict warnings.
- Manager approval queues with real-time notifications.

### 4. 💰 Payroll & Compensation Engine
- Point-in-time salary computation and deduction rules.
- Automated payslip generation with instant PDF export.

### 5. 🎯 Talent Acquisition & Recruitment Pipeline
- Kanban applicant tracking with custom interview stages.
- Automated candidate-to-employee onboarding conversion.

---

## 🛠 Tech Stack

### Frontend
- **Framework**: React 18 with TypeScript & Vite
- **Styling**: Vanilla CSS Design System with Glassmorphic tokens (`.glass-panel`, `.glass-cutout`, `.btn-glass`, `.btn-primary`)
- **Icons & Typography**: Google Material Symbols Outlined & Plus Jakarta Sans / Fira Code

### Backend
- **Runtime**: Node.js & Express (ES Modules)
- **Database**: MongoDB with Mongoose ODM
- **Caching & Rate Limiting**: Upstash Redis / In-Memory fallback
- **Authentication**: JWT (Access tokens + rotated HTTP-only refresh tokens)
- **Security**: Argon2/bcrypt password hashing, RBAC middleware, Helmet

---

## ⚡ Quick Start Guide

### Prerequisites
- **Node.js**: v18+ 
- **MongoDB**: Local MongoDB instance (port `27017`) or MongoDB Atlas URI

### 1. Clone the repository
```bash
git clone https://github.com/theanshukr/NEXUS.git
cd NEXUS
```

### 2. Backend Setup
```bash
cd backend
npm install

# Configure environment variables (create .env)
# Ensure MONGO_URI, JWT_SECRET, PORT=5001 are set

# Seed organization, roles, recruitment data, and 45 Indian Engineering Profiles:
node scripts/seedDevMode.js

# Start backend dev server:
npm run dev
```
Backend runs at `http://localhost:5001`.

### 3. Frontend Setup
```bash
cd ../frontend
npm install
npm run dev
```
Frontend runs at `http://localhost:5173`.

---

## 🧪 Demo Login Credentials

Run `node scripts/seedDevMode.js` to populate these ready-to-test workspace accounts:

| Role | Email | Password | Primary Feature Access |
|---|---|---|---|
| **HR Manager** | `hr@dev.com` | `Dev@1234` | Full Employee Directory, Intelligence Profiles, Skill Verification |
| **Standard Employee** | `employee@dev.com` | `Dev@1234` | Personal Intelligence Profile, Skills, Attendance, Leaves |
| **Super Admin** | `admin@dev.com` | `Dev@1234` | All Modules, RBAC, System Overview |
| **IT Admin** | `it@dev.com` | `Dev@1234` | User Management, Role Assignments |
| **Finance Executive** | `finance@dev.com` | `Dev@1234` | Payroll Runs, Salary Structures |

---

## 🗺️ Nexus Platform Roadmap

- [x] **Phase 1: Employee Intelligence Profiles** (Unified profiles, skills matrix, experience timeline, career goals, 45+ Indian engineering benchmarks)
- [ ] **Phase 2: Skill Extraction & Normalization Engine** (Taxonomy mapping, resume/doc parsing, proficiency normalization)
- [ ] **Phase 3: Workforce Search & Skill-Based Discovery** (Semantic filter, proficiency scoring, location & availability filters)
- [ ] **Phase 4: Internal Mobility & Intelligent Project Staffing** (Project requirement matching, fit scoring, gap analysis)
- [ ] **Phase 5: Workforce Analytics & Skill Gap Insights** (Capability heatmaps, critical skill risks, training recommendation matrix)
- [ ] **Phase 6: Continuous Intelligence Sync & Notifications** (Automated updates on project completion, certification sync)

---

## 📄 License & Attribution

Internal platform developed for workforce management & workforce intelligence.
