# NEXUS — AI-Powered Workforce Capability Intelligence Platform

> **Transform Strategic Initiatives into Optimized, Explainable Talent Alignments.**  
> Built with FastAPI, PostgreSQL + pgvector, React (TypeScript + Tailwind CSS), and LLM Intelligence.

---

## 🌟 Overview

**NEXUS** is an enterprise-grade Workforce Capability Intelligence Platform designed to solve the friction between executive business initiatives and internal technical talent deployment.

Instead of relying on keyword searches or outdated resumes, NEXUS:
1. **Understands Strategic Intent:** Ingests unstructured project briefs and automatically extracts structured skill taxonomies, proficiency levels, and role definitions using LLMs.
2. **Deterministic & Semantic Matching:** Evaluates talent using a multi-dimensional weighted scoring algorithm combined with vector cosine similarity.
3. **Transparent Explainability:** Generates clear narrative justifications, evidence breakdown (past projects & verified competencies), and targeted gap remediation recommendations.
4. **Executive Capability Analytics:** Delivers high-level organizational readiness metrics, domain coverage heatmaps, and critical capability gap tracking.

---

## 🏗️ Architecture & Tech Stack

```
                                  ┌───────────────────────────┐
                                  │      React Frontend       │
                                  │ (TypeScript + Tailwind)   │
                                  └─────────────┬─────────────┘
                                                │ REST API (JWT)
                                  ┌─────────────▼─────────────┐
                                  │      FastAPI Backend      │
                                  │     (Python 3.11 Async)   │
                                  └──────┬─────────────┬──────┘
                                         │             │
                    ┌────────────────────┘             └────────────────────┐
                    ▼                                                       ▼
      ┌───────────────────────────┐                           ┌───────────────────────────┐
      │   PostgreSQL + pgvector   │                           │     AI / LLM Service      │
      │  (Relational & Embeddings)│                           │(OpenAI / Custom / Fallback│
      └───────────────────────────┘                           └───────────────────────────┘
```

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS, TanStack Query, Lucide Icons |
| **Backend** | Python 3.10+, FastAPI, SQLAlchemy (Async), Pydantic v2, Alembic |
| **Database & Vector** | PostgreSQL 16 with `pgvector` extension (1536-dim embeddings) |
| **AI Orchestration** | OpenAI API (`gpt-4o-mini`, `text-embedding-3-small`) with Mock fallback |
| **Infrastructure** | Docker, Docker Compose |

---

## 📐 The NEXUS Matching Formula

Talent alignment is calculated deterministically through a multi-dimensional weighted scoring system:

$$\text{Overall Score} = (0.50 \times \text{Skill}) + (0.20 \times \text{Semantic}) + (0.15 \times \text{Experience}) + (0.15 \times \text{Evidence})$$

- **Skill Score (50%):** Direct Match (100%), Transferable Match (70%), Partial (40%), Missing (0%)
- **Semantic Score (20%):** Cosine similarity between initiative brief and employee profile embeddings
- **Experience Score (15%):** Seniority and tenure ratio against target delivery scope
- **Evidence Score (15%):** Proportion of peer-verified skills and verified project outcomes

---

## 📂 Project Structure

```
NEXUS/
├── docs/                               # Core specifications & architecture docs
│   ├── NEXUSPRD.md                     # Product Requirements Document
│   ├── NEXUSTDD.md                     # Technical Design Document
│   ├── USERFLOW.md                     # Comprehensive User Flows & Journeys
│   └── DEVELOPMENT_PHASES.md           # Step-by-Step Implementation Roadmap
│
├── backend/                            # FastAPI Application
│   ├── app/
│   │   ├── main.py                     # FastAPI entry point & lifespan
│   │   ├── core/                       # config, database async engine, JWT security
│   │   ├── models/                     # SQLAlchemy models (User, Skill, Employee, Project, Match)
│   │   ├── schemas/                    # Pydantic validation schemas
│   │   ├── api/                        # Route endpoints (auth, employees, initiatives, matching, dashboard)
│   │   ├── services/                   # Business logic layer
│   │   ├── repositories/               # Database query and persistence layer
│   │   ├── ai/                         # LLM prompts, skill extractor, explanation generator
│   │   └── matching/                   # Scoring algorithm, gap analyzer, vector similarity
│   ├── scripts/
│   │   └── seed.py                     # Realistic workforce & initiative seed data
│   ├── Dockerfile
│   └── requirements.txt
│
├── frontend/                           # React + TypeScript + Tailwind
│   ├── src/
│   │   ├── app/                        # Context providers & React Router
│   │   ├── api/                        # Typed Axios API clients
│   │   ├── types/                      # TypeScript domain models
│   │   ├── hooks/                      # TanStack React Query hooks
│   │   ├── components/                 # UI primitives & domain components
│   │   └── pages/                      # Views (Dashboard, Initiatives, Employees)
│   ├── Dockerfile
│   ├── package.json
│   └── tailwind.config.js
│
├── docker-compose.yml                  # Postgres (pgvector) + Backend + Frontend
├── .env.example                        # Template environment variables
├── .gitignore
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- [Docker & Docker Compose](https://www.docker.com/) OR
- Python 3.10+ and Node.js 18+

---

### Option 1: Quick Start with Docker Compose (Recommended)

1. **Clone the repository and enter the directory:**
   ```bash
   git clone <REPO_URL>
   cd NEXUS
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```
   *(Optional: Add your `OPENAI_API_KEY` in `.env` if you want live OpenAI completions; otherwise, the built-in smart mock generator will seamlessly handle extraction and matching).*

3. **Launch the entire stack:**
   ```bash
   docker compose up --build
   ```

4. **Access the application:**
   - 🌐 **Frontend UI:** [http://localhost:5173](http://localhost:5173)
   - ⚡ **Backend API Docs (Swagger):** [http://localhost:8000/docs](http://localhost:8000/docs)
   - 🗄️ **Postgres (pgvector):** `localhost:5432`

---

### Option 2: Local Development Setup

#### 1. Backend Setup
```bash
cd backend
python -m venv venv

# Windows
.\venv\Scripts\activate
# Linux/macOS
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

#### 2. Seed Initial Workforce Data
```bash
python scripts/seed.py
```
> **Default Test Credentials:**  
> **Email:** `manager@nexus.ai`  
> **Password:** `password123`

#### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

---

## 📖 Key API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/auth/login` | Authenticate user & receive JWT token |
| `POST` | `/api/v1/auth/register` | Register new manager / lead account |
| `GET` | `/api/v1/employees` | Paginated workforce directory with skill & dept filters |
| `GET` | `/api/v1/employees/{id}` | Detailed employee capability profile & project history |
| `POST` | `/api/v1/initiatives/analyze` | AI extraction of skills from initiative text brief |
| `POST` | `/api/v1/initiatives` | Create strategic initiative with linked skill criteria |
| `POST` | `/api/v1/initiatives/{id}/match` | Execute multi-dimensional matching engine |
| `GET` | `/api/v1/initiatives/{id}/matches` | Get ranked candidates, score breakdowns & gap analysis |
| `GET` | `/api/v1/dashboard/overview` | Executive metrics, skill coverage & dept readiness |

---

## 🗺️ Roadmap & Development Phases

For a detailed phase-by-phase implementation plan and checklist, refer to:
- 📄 **[DEVELOPMENT_PHASES.md](file:///d:/Projects/NEXUS/docs/DEVELOPMENT_PHASES.md)**

---

## 📄 License

This project is licensed under the MIT License.
