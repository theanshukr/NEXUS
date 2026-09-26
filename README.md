# ⚡ NEXUS — Workforce Intelligence Platform & Decision OS

<div align="center">

![NEXUS Platform Banner](https://img.shields.io/badge/NEXUS-Workforce%20Intelligence%20OS-6366f1?style=for-the-badge&logo=rocket&logoColor=white)

[![React](https://img.shields.io/badge/React_18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript_5-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite_5-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Node.js](https://img.shields.io/badge/Node.js_18+-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python_3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)

**An enterprise-grade workforce intelligence operating system that unifies dynamic employee profiles, AI-powered skill extraction, deep-tier skill graphs, intelligent project team management, and core HR operational workflows into a high-performance, glassmorphic decision platform.**

[Features](#-key-capabilities--modules) • [System Architecture](#-system-architecture) • [Getting Started](#-getting-started) • [Demo Credentials](#-pre-configured-demo-accounts) • [Tech Stack](#-technology-stack) • [API Overview](#-api-architecture)

---

</div>

## 🌟 Executive Overview

Modern enterprises face critical challenges with **talent discovery**, **skill decay**, and **static workforce records**. Legacy HR Information Systems (HRIS) act as passive databases storing point-in-time employment records, disconnected from the actual technical skills, project contributions, and career trajectories of engineering teams.

**NEXUS** reimagines workforce management as an **active intelligence layer**:
- 🧠 **Dynamic Workforce Intelligence**: Deep-tier technical skill matrices, proficiency verification workflows, project tenure tracking, and career aspiration matching.
- 🤖 **AI-Driven Skill Extraction**: Zero-shot Named Entity Recognition (GLiNER2 / FastAPI) that extracts structured skills and competencies from unstructured text and resumes in real time.
- 🗂️ **Interactive Project Management**: Rich glassmorphic project cards detailing team rosters, required tech stacks, progress metrics, and resource allocation.
- 🌐 **Enterprise Skill Graph**: Visual graph network representing competency relationships, cross-domain dependencies, and talent density across the organization.
- 🏢 **End-to-End HR Operations**: Multi-tenant RBAC, geofenced attendance, automated leave approval pipelines, point-in-time payroll computations, and recruitment Kanban tracking.

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       NEXUS CLIENT                                          │
│           React 18 + TypeScript + Vite  │  Dark Glassmorphic UI Design System               │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│  [ HR Manager ]    [ Employee ]    [ Super Admin ]    [ Project Lead ]    [ Finance / IT ]  │
│  Directory & Skill  Personal Talent Tenant & RBAC     Project Rosters &   Payroll, Assets   │
│  Verification Hub   Growth Path     Control Center    Skill Matching      & Governance      │
└──────────────────────────────────────────────┬──────────────────────────────────────────────┘
                                               │ HTTP / REST / JWT Auth
                                               ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                  NEXUS API GATEWAY (Node.js)                                │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│  • Granular RBAC & Permission Middleware (Organization & Role Isolation)                    │
│  • Domain Modules: Auth, Employees, Projects, Skills, Attendance, Leaves, Payroll, Recruits  │
│  • Validation Pipelines, Error Normalization & Audit Logging                                │
└───────────────────────┬─────────────────────────────────────────────┬───────────────────────┘
                        │                                             │
                        ▼                                             ▼
┌──────────────────────────────────────────────┐  ┌───────────────────────────────────────────┐
│              PERSISTENCE LAYER               │  │             AI CO-PROCESSOR               │
├──────────────────────────────────────────────┤  ├───────────────────────────────────────────┤
│  • MongoDB Multi-Tenant Document Store       │  │  • FastAPI Python Microservice (Port 8002)│
│  • Mongoose Schema Population & Indexing     │  │  • GLiNER2 Zero-Shot Skill NER Engine     │
│  • Redis Caching & Distributed Rate Limiting │  │  • Real-Time Resume & Text Skill Parser   │
└──────────────────────────────────────────────┘  └───────────────────────────────────────────┘
```

---

## ✨ Key Capabilities & Modules

### 1. 📇 Dynamic Employee Intelligence Profiles
- **Comprehensive Profile Modal**: Connects organizational metadata (department, designation, manager hierarchy, base location) with real-world engineering credentials.
- **Categorized Skills Matrix**: Multi-tier taxonomy covering `BACKEND`, `FRONTEND`, `CLOUD_DEVOPS`, `DATA_AI`, `DATABASE`, `ARCHITECTURE`, `QA_TESTING`, and `SECURITY`.
- **Proficiency & Verification Flow**: Tracks ratings (`Beginner`, `Intermediate`, `Advanced`, `Expert`) coupled with Lead / HR verification status badges and direct inline actions.
- **Project Portfolios & Technology Stacks**: Records production responsibilities, tech stacks utilized, impact metrics, and project tenure.
- **Career Growth & Work Mode**: Captures desired engineering roles, target competencies, and work mode preferences (Hybrid, Remote, On-Site).
- **High-Density Engineering Dataset**: Pre-seeded with 45+ comprehensive engineering profiles spanning major Indian tech hubs (Bangalore, Hyderabad, Pune, Gurgaon, Noida, Chennai).

### 2. 🚀 Intelligent Project Management Cards
- **Rich Glassmorphic Project Cards**: Visual cards displaying project status, progress bars, due dates, and client-facing summaries.
- **Team Roster & Role Mapping**: Instant visibility into all employees assigned to a project with their designations, departments, project roles, and avatars.
- **Required Skills Stack**: Color-coded skill chips with category badges ensuring project requirement alignment.
- **Dynamic Project Details Drawer**: Expanded view for comprehensive project inspection, team management, and milestone tracking.
- **Search & Filter Engine**: Live filtering by project name, description, and status tags.

### 3. 🤖 AI-Powered Skill Extraction Microservice
- **Zero-Shot Skill Extraction**: Standalone FastAPI service utilizing the **GLiNER2** lightweight transformer model to identify technical and soft skills from resumes and job descriptions without expensive LLM API tokens.
- **Automatic Taxonomy Canonicalization**: Matches extracted entities against existing standardized skill collections in MongoDB.

### 4. 🕸️ Interactive Skill Graph & Knowledge Visualizer
- **Graph-Based Competency Exploration**: Visualizes relationships between engineering disciplines, adjacent technical competencies, and workforce skill clusters.
- **Talent Density Heatmaps**: Pinpoints organizational skill strengths and single-point-of-failure (SPOF) risks for mission-critical technologies.

### 5. 👥 Employee Onboarding & Lifecycle Management
- **Step-by-Step Onboarding Wizard**: Automated workflows for provisioning new hires with department, role, designated mentor, compensation, and initial skill set.
- **Auto-Populated Taxonomy Selectors**: Real-time reactive selectors for designations and categorized skills directly sourced from the database.

### 6. ⏱️ Time, Absence & Attendance Tracking
- **Geofenced Clock-In/Out**: Mobile and desktop attendance logging with telemetry validation.
- **Leave Balance Engine**: Real-time accruals, conflict detection algorithms, and manager approval queues.

### 7. 💰 Payroll & Compensation Architecture
- **Point-in-Time Salary Computation**: Base pay, HRA, special allowances, PF contributions, and tax deductions.
- **Instant Payslip Generation**: Client-side automated generation and PDF export.

### 8. 🎯 Talent Acquisition & Recruitment Pipeline
- **Interactive Kanban Pipeline**: Tracks candidates from application screening, technical interviews, and HR rounds to offer generation.
- **Cryptographic Candidate Invitations**: Generates secure, tokenized onboarding links for selected candidates.

---

## 💻 Technology Stack

| Layer | Technologies | Purpose & Highlights |
|---|---|---|
| **Frontend UI** | React 18, TypeScript, Vite | Single-page reactive application, custom dark glassmorphism design system, responsive layouts |
| **Icons & Visuals** | Google Material Symbols, Lucide React | High-density enterprise iconography, SVG graphics |
| **Backend API** | Node.js, Express (ES Modules) | RESTful API layer, micro-modular domain structure, validation pipelines, error handling |
| **AI Services** | Python 3.10+, FastAPI, GLiNER2, Uvicorn | Microservice for real-time skill extraction and natural language entity parsing |
| **Database** | MongoDB, Mongoose ODM | Multi-tenant schema design, atomic updates, indexes on organization and employee codes |
| **Security & Auth** | JWT, Argon2 / Bcrypt, Helmet, CORS | Short-lived access tokens, rotated HTTP-only refresh tokens, granular RBAC middleware |
| **Tooling & Tests** | Vitest, Nodemon, ESLint, Postman | High-speed unit & integration test suites, continuous dev reloading |

---

## 📁 Repository Structure

```
NEXUS/
├── backend/                         # Node.js Express REST API
│   ├── src/
│   │   ├── core/                    # Core database, middleware, utils & repositories
│   │   │   ├── database/            # MongoDB connection manager
│   │   │   ├── middleware/          # Auth, RBAC, error handlers
│   │   │   └── repositories/        # Base repository patterns
│   │   └── modules/                 # Micro-modular business domains
│   │       ├── auth/                # Authentication & token services
│   │       ├── employees/           # Employee intelligence profiles & directory
│   │       ├── projects/            # Project cards, team allocation & tracking
│   │       ├── skills/              # Skills taxonomy & proficiency verification
│   │       ├── departments/         # Department hierarchy & budgeting
│   │       ├── designations/        # Role & title catalog
│   │       ├── attendance/          # Geofenced clock-in & telemetry
│   │       ├── leave/               # Leave applications & approval flows
│   │       ├── payroll/             # Salary calculation & payslips
│   │       └── recruitment/         # Candidate pipeline & invitations
│   ├── scripts/                     # Seeder scripts & database provisioning
│   │   └── seedDevMode.js           # Seeds organization, roles & 45+ Indian engineering profiles
│   └── package.json
│
├── frontend/                        # React 18 + TypeScript + Vite Application
│   ├── src/
│   │   ├── api/                     # Axios/Fetch API client and interceptors
│   │   ├── components/              # Enterprise views & glassmorphic UI components
│   │   │   ├── EmployeeManagementView.tsx  # Employee directory & profile management
│   │   │   ├── NexusEmployeeProfileModal.tsx # Full intelligence profile modal
│   │   │   ├── ProjectManagementView.tsx   # Rich glassmorphic project cards & team rosters
│   │   │   ├── OnboardingView.tsx          # Multi-step employee onboarding wizard
│   │   │   ├── SkillGraphView.tsx          # Graph visualization of workforce skills
│   │   │   ├── TimeAbsenceView.tsx         # Attendance & leave management
│   │   │   ├── PayrollView.tsx             # Compensation & payslips
│   │   │   ├── RecruitmentPipelineView.tsx # Candidate Kanban board
│   │   │   └── OrgChartView.tsx            # Organizational hierarchy chart
│   │   ├── index.css                # Glassmorphic CSS tokens & design system
│   │   ├── App.tsx                  # Main router & role workspace switcher
│   │   └── main.tsx                 # React DOM entrypoint
│   └── package.json
│
└── python-services/                 # AI & Machine Learning Microservices
    └── skill-extractor/             # GLiNER2 Zero-Shot Skill Extraction Service
        ├── app.py                   # FastAPI application & extraction endpoints
        └── requirements.txt         # Python dependencies (gliner, fastapi, uvicorn)
```

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed on your machine:
- **Node.js**: `v18.0.0` or higher
- **npm**: `v9.0.0` or higher
- **Python**: `3.10` or higher *(for AI skill extraction service)*
- **MongoDB**: Local MongoDB instance (`mongodb://127.0.0.1:27017`) or a MongoDB Atlas URI

---

### Step 1: Clone the Repository

```bash
git clone https://github.com/theanshukr/NEXUS.git
cd NEXUS
```

---

### Step 2: Set Up & Start Python AI Service *(Optional but recommended)*

The skill extraction microservice runs on port `8002`:

```bash
cd python-services/skill-extractor

# Create and activate virtual environment
python -m venv .venv

# On Windows (PowerShell):
.venv\Scripts\Activate.ps1
# On Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI server
uvicorn app:app --host 0.0.0.0 --port 8002 --reload
```

---

### Step 3: Configure & Start Backend API

In a new terminal window:

```bash
cd backend

# Install dependencies
npm install

# Create environment file if not already present
cp .env.example .env
```

Ensure your `backend/.env` is configured properly:

```env
PORT=5001
NODE_ENV=development
MONGO_URI=mongodb://127.0.0.1:27017/nexus_db
JWT_ACCESS_SECRET=your_jwt_access_secret_key_here
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key_here
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d
CORS_ORIGIN=http://localhost:5173
AI_SERVICE_URL=http://localhost:8002
```

#### Seed the Database:
Provision the organization, role datasets, skill taxonomies, and **45+ Indian engineering profiles**:

```bash
node scripts/seedDevMode.js
```

#### Start the Backend Server:

```bash
npm run dev
```
*Backend API will run at `http://localhost:5001`.*

---

### Step 4: Configure & Start Frontend

In another terminal window:

```bash
cd frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```
*Frontend application will launch at `http://localhost:5173`.*

---

## 🔑 Pre-Configured Demo Accounts

Use any of the seeded credentials below to explore different role-based views and workspaces:

| Role | Email | Password | Primary Capabilities & Scope |
|---|---|---|---|
| 👔 **HR Manager** | `hr@dev.com` | `Dev@1234` | Employee Directory, Onboarding Wizard, Skill Verification, Org Chart |
| 💻 **Standard Employee** | `employee@dev.com` | `Dev@1234` | Personal Profile, Skills Portfolio, Project Assignments, Attendance & Leaves |
| 🛡️ **Super Admin** | `admin@dev.com` | `Dev@1234` | Global Configuration, RBAC Management, Project Management, Audit Logs |
| 💳 **Finance Executive** | `finance@dev.com` | `Dev@1234` | Payroll Cycles, Point-in-Time Salary Computations, Payslip Distribution |
| 🔧 **IT Administrator** | `it@dev.com` | `Dev@1234` | User Provisioning, Asset Management, Access Policies |

---

## 📡 API Architecture & Key Endpoints

| Module | Method | Endpoint | Description |
|---|---|---|---|
| **Auth** | `POST` | `/api/v1/auth/login` | User authentication & JWT token issuance |
| **Auth** | `POST` | `/api/v1/auth/refresh-token` | Rotates short-lived access tokens |
| **Employees** | `GET` | `/api/v1/employees` | Retrieves paginated workforce profiles with filters |
| **Employees** | `GET` | `/api/v1/employees/:id` | Returns complete employee intelligence profile |
| **Employees** | `POST` | `/api/v1/employees/onboard` | Provisions new employee and assigns initial role/skills |
| **Projects** | `GET` | `/api/v1/projects` | Returns all projects populated with team members & skill requirements |
| **Projects** | `POST` | `/api/v1/projects` | Creates a new project and assigns team members |
| **Skills** | `GET` | `/api/v1/skills` | Fetches normalized skills taxonomy by category |
| **Skills** | `POST` | `/api/v1/skills/verify` | Endorsement & HR/Lead verification of employee skill |
| **AI Extractor** | `POST` | `http://localhost:8002/extract` | Extracts structured skills from raw resume/job text |
| **Attendance** | `POST` | `/api/v1/attendance/check-in` | Geofenced attendance registration |
| **Payroll** | `GET` | `/api/v1/payroll/runs` | Fetches batch payroll records and payslips |

---

## 🎨 UI/UX Design System

NEXUS employs a **modern, high-density dark glassmorphic design language**:
- **Design Tokens**: Carefully balanced HSL color palettes with neon accents (`#6366f1` Indigo, `#10b981` Emerald, `#38bdf8` Sky, `#f59e0b` Amber).
- **Glassmorphism**: Multi-layer background blurs (`backdrop-filter: blur(16px)`), subtle translucent borders, and soft shadows for depth.
- **Zero Layout Shift**: High-performance UI rendering with optimized state transitions and skeleton loaders.
- **Typography**: Clean, readable sans-serif typography paired with Google Material Symbols.

---

## 🧪 Testing & Code Quality

```bash
# Run backend test suite
cd backend
npm test

# Run frontend unit tests
cd frontend
npm test

# Type-check TypeScript codebase
npm run typecheck # or npx tsc --noEmit
```

---

## 🗺️ Product Roadmap

- [x] **Phase 1: Dynamic Workforce Intelligence Profiles & 45+ Engineering Dataset**
- [x] **Phase 2: Rich Glassmorphic Project Management Cards & Team Roster View**
- [x] **Phase 3: AI-Assisted Skill Extraction (GLiNER2 FastAPI Service)**
- [x] **Phase 4: Multi-Step Employee Onboarding Wizard with Dynamic Taxonomies**
- [x] **Phase 5: Interactive Skill Knowledge Graph**
- [ ] **Phase 6: Automated Talent-to-Project Recommendation Engine**
- [ ] **Phase 7: Single-Point-of-Failure (SPOF) Risk Forecasting Analytics**
- [ ] **Phase 8: Real-Time WebSockets Sync for Team Collaboration**

---

## 📄 License & Attribution

This project is open for enterprise evaluation and development. Built with ❤️ for engineering and talent teams striving for workforce clarity.
