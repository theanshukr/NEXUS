# Nexus — Workforce Intelligence Platform & Decision OS

> An enterprise-grade workforce intelligence operating system that unifies dynamic employee profiles, multi-tier skills matrices, verified technical proficiencies, internal mobility matching, and core workforce operational workflows into a single high-performance platform.

---

## Executive Summary

Modern enterprise organizations struggle with talent discovery, skill decay, and disconnected workforce records. Traditional HR Information Systems (HRIS) store static, point-in-time employment records but fail to reflect actual capabilities, evolving project expertise, or employee career trajectories.

**Nexus** bridges this operational gap by combining:
1. **Dynamic Workforce Intelligence**: Deep-tier technical skills matrices, competency verifications, verified project milestones, and career aspiration graphs.
2. **Comprehensive Workforce Management**: Enterprise RBAC, time & absence management, point-in-time payroll computations, recruitment candidate conversion, and cross-department workflows.
3. **High-Performance Architecture**: React 18 TypeScript frontend with zero layout-shift dark glassmorphism styling, Node.js micro-modular service layer, MongoDB document store, and Redis-backed caching & rate limiting.

---

## Architecture & System Capabilities

```
┌────────────────────────────────────────────────────────────────────────────┐
│                             NEXUS PLATFORM                                 │
├────────────────────────────────────────────────────────────────────────────┤
│  [ HR Manager ]    [ Employee ]    [ Super Admin ]   [ Finance ]   [ IT ]  │
│  Directory & Skill  Personal Skill  Tenant & RBAC     Payroll Run   Asset  │
│  Verification Hub   & Growth Path   Control Plane     Audit Engine  Mgmt   │
├────────────────────────────────────────────────────────────────────────────┤
│                       NEXUS INTELLIGENCE LAYER                             │
│  • Unified Employee Profile (Skills Matrix, Projects, Career Goals)        │
│  • Multi-Tier Category Mapping (Backend, Frontend, Cloud/DevOps, AI/Data)  │
│  • Skill Endorsement & Lead Verification Engine                            │
│  • High-Density Workforce Benchmarks (45+ Indian Engineering Profiles)    │
├────────────────────────────────────────────────────────────────────────────┤
│                         CORE WORKFORCE ENGINE                              │
│  • Dynamic RBAC Middleware (Organization-scoped permissions)               │
│  • Geofenced Time & Absence Engine with Automated Policy Checkers          │
│  • Point-in-Time Salary & Payroll Deduction Resolution                     │
│  • Recruitment Kanban Pipeline & Candidate-to-Hire Conversion              │
├────────────────────────────────────────────────────────────────────────────┤
│                       DATA & PERSISTENCE LAYER                             │
│          MongoDB Document Store  │  Upstash Redis Cache / PubSub           │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Core Feature Modules

### 1. Employee Intelligence Profiles
- **Unified Profile Persona**: Connects organizational metadata (department, designation, manager hierarchy, base location) with comprehensive technical profiles.
- **Skills Matrix & Categorization**: Structured taxonomies across `BACKEND`, `FRONTEND`, `CLOUD_DEVOPS`, `DATA_AI`, `DATABASE`, `ARCHITECTURE`, `QA_TESTING`, and `SECURITY`.
- **Proficiency & Verification Flow**: Proficiency scale (`Beginner`, `Intermediate`, `Advanced`, `Expert`) coupled with Lead / HR verification status badges and direct inline actions.
- **Project Portfolios & Technology Stacks**: Tracks production responsibilities, tech stacks utilized, impact metrics, and project tenure.
- **Career Growth & Relocation Preferences**: Captures desired engineering roles, target competencies, and work mode preferences (Hybrid, Remote, On-Site).
- **Engineering Workforce Dataset**: Pre-populated with 45+ comprehensive engineering profiles spanning major Indian tech hubs (Bangalore, Hyderabad, Pune, Gurgaon, Noida, Chennai).

### 2. Multi-Role Enterprise Workspaces
- **HR Manager Workspace**: Talent directory, skill auditing, onboarding/offboarding pipelines, team structuring.
- **Standard Employee Portal**: Self-service profiles, skill additions, leave applications, geo-checkin, salary slips.
- **Super Admin Workspace**: Organization settings, RBAC definitions, system activity audit logs.
- **Finance Executive Hub**: Payroll run reviews, deduction configurations, automated payslip distribution.
- **IT Administrator Console**: User provisioning, role delegations, access policies.

### 3. Time, Absence & Attendance Tracking
- Geofenced attendance clock-in/out with device telemetry.
- Automated leave balance snapshots and conflict detection algorithms.
- Multi-tier manager approval workflows with real-time in-app alerts.

### 4. Payroll & Compensation Architecture
- Precise point-in-time salary breakdowns (Base, HRA, Allowances, PF, Deductions).
- Automated payslip batch generation with instant client-side PDF downloads.

### 5. Talent Acquisition & Recruitment Pipeline
- Interactive Kanban candidate tracking from application review to offer letter.
- One-click cryptographic invitation generation for new hires.

---

## Technology Stack

| Layer | Technologies | Key Responsibilities |
|---|---|---|
| **Frontend** | React 18, TypeScript, Vite | Single-page reactive interface, zero-dependency glassmorphism design tokens, accessible components |
| **Backend API** | Node.js, Express (ES Modules) | RESTful API layer, micro-modular domain structure, validation pipelines, error handling |
| **Database** | MongoDB, Mongoose ODM | Multi-tenant schema design, atomic updates, indexes on organization and employee codes |
| **Security & Auth** | JWT, Argon2 / Bcrypt, Helmet | Short-lived access tokens, rotated HTTP-only refresh tokens, granular RBAC middleware |
| **Caching & Rate Limit** | Upstash Redis / In-Memory fallback | Session caching, distributed rate limiting, rapid lookup optimization |

---

## Getting Started

### Prerequisites
- **Node.js** (v18.0.0 or higher)
- **npm** (v9.0.0 or higher)
- **MongoDB** (Local instance running on port `27017` or a remote MongoDB Atlas connection string)

### 1. Repository Setup
```bash
git clone https://github.com/theanshukr/NEXUS.git
cd NEXUS
```

### 2. Backend Installation & Seeding
```bash
cd backend
npm install
```

Configure `backend/.env` with your connection parameters:
```env
PORT=5001
NODE_ENV=development
MONGO_URI=mongodb://127.0.0.1:27017/nexus_db
JWT_ACCESS_SECRET=your_jwt_access_secret_here
JWT_REFRESH_SECRET=your_jwt_refresh_secret_here
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d
CORS_ORIGIN=http://localhost:5173
```

Execute the database seeder to provision the organization, roles, recruitment workflows, and the 45+ Indian engineering intelligence profiles:
```bash
node scripts/seedDevMode.js
```

Start the backend server:
```bash
npm run dev
```
*Backend runs on `http://localhost:5001`.*

### 3. Frontend Installation & Startup
```bash
cd ../frontend
npm install
npm run dev
```
*Frontend application launches at `http://localhost:5173`.*

---

## Pre-Configured Test Accounts

Use the credentials below to test the platform across different roles:

| Role | Email | Password | Primary Access Scope |
|---|---|---|---|
| **HR Manager** | `hr@dev.com` | `Dev@1234` | Full Employee Directory, Intelligence Profiles, Skill Verification |
| **Standard Employee** | `employee@dev.com` | `Dev@1234` | Personal Profile, Skills Portfolio, Attendance, Leave Management |
| **Super Admin** | `admin@dev.com` | `Dev@1234` | Organization Controls, RBAC Config, Full Platform Access |
| **Finance Executive** | `finance@dev.com` | `Dev@1234` | Payroll Cycles, Point-in-time Salary Audits |
| **IT Administrator** | `it@dev.com` | `Dev@1234` | User Provisioning, Access Matrix, Asset Allocations |

---

## Product Roadmap & Phases

- [x] **Phase 1: Employee Intelligence Profiles**
  - Unified profiles combining HR data with technical skill sets.
  - Multi-category skills matrix with verified proficiency ratings.
  - Pre-seeded dataset of 45+ Indian engineering profiles across major technology hubs.
- [ ] **Phase 2: Skill Extraction & Normalization Engine**
  - AI-assisted resume & internal document skill parsing.
  - Automatic taxonomy canonicalization and proficiency scoring.
- [ ] **Phase 3: Workforce Search & Skill-Based Discovery**
  - Multi-attribute Boolean & semantic query engine.
  - Location, proficiency, and bandwidth matching.
- [ ] **Phase 4: Internal Mobility & Intelligent Project Staffing**
  - Project requirement specification matching.
  - Talent fit scoring and team composition simulation.
- [ ] **Phase 5: Workforce Analytics & Capability Gap Insights**
  - Organizational capability heatmaps.
  - Single point of failure (SPOF) risk analysis for critical technologies.
- [ ] **Phase 6: Continuous Intelligence Sync**
  - Automated skill refreshes based on completed milestones and certifications.

---

## License & Ownership

Proprietary enterprise software developed for workforce intelligence and talent operations.
