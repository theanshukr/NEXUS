# NEXUS — Development Phases

**Version:** 1.0 | **Status:** Hackathon MVP | **Stack:** FastAPI · React · PostgreSQL · pgvector · LLM API

---

## Overview

```
Phase 1 → Foundation          (Docker · FastAPI · React · Auth)
Phase 2 → Workforce Data      (Employees · Skills · Projects · Seed)
Phase 3 → Initiative AI       (LLM Extraction · Normalization)
Phase 4 → Matching Engine     (Scoring · Semantic · Gaps)
Phase 5 → Explainability      (Evidence · Explanations · Gap UI)
Phase 6 → Dashboard           (Metrics · Visualizations)
Phase 7 → Polish & Demo       (Loading · Errors · E2E Test)
```

---

## Phase 1 — Foundation

> **Goal:** Runnable full-stack skeleton with JWT authentication.

### Backend Tasks
- [ ] Initialize FastAPI project (`app/main.py`, CORS, lifespan)
- [ ] `core/config.py` — load all env vars via Pydantic Settings
- [ ] `core/database.py` — SQLAlchemy async engine + session factory
- [ ] `core/security.py` — bcrypt password hashing + JWT sign/verify
- [ ] `models/user.py` — users table (id, email, password_hash, name, role)
- [ ] `schemas/auth.py` — LoginRequest, RegisterRequest, TokenResponse
- [ ] `api/routes/auth.py` — `POST /auth/login`, `POST /auth/register`, `GET /auth/me`
- [ ] `api/dependencies.py` — `get_current_user` JWT dependency
- [ ] Alembic init + first migration (users table)
- [ ] `requirements.txt`

### Frontend Tasks
- [ ] Vite + React + TypeScript scaffold
- [ ] Tailwind CSS + base design tokens
- [ ] `app/providers.tsx` — QueryClient + Auth context
- [ ] `app/router.tsx` — React Router v6 routes
- [ ] Login page (`/login`) — email/password form
- [ ] Auth store (JWT in localStorage + context)
- [ ] Protected route wrapper (redirect to login if no token)
- [ ] Base API client (`api/client.ts`) — axios with auth header interceptor

### Infrastructure Tasks
- [ ] `docker-compose.yml` — postgres (pgvector/pgvector:pg16), backend, frontend
- [ ] `backend/Dockerfile`
- [ ] `frontend/Dockerfile`
- [ ] `.env.example` with all required variables
- [ ] `.gitignore`

### ✅ Definition of Done
```
docker compose up
  → Login screen renders
  → Register a user → Login → JWT stored → /dashboard redirects
```

---

## Phase 2 — Workforce Data

> **Goal:** Employee directory with rich skill profiles visible in the UI.

### Backend Tasks
- [ ] `models/skill.py` — skills table (id, name, category, description, embedding VECTOR)
- [ ] `models/employee.py` — employees, employee_skills, employee_projects tables
- [ ] `models/project.py` — projects table
- [ ] Alembic migrations for all new tables
- [ ] DB indexes (department, employee_id, skill_id, initiative_id)
- [ ] `repositories/employees.py` — CRUD + filter by dept/role/skill
- [ ] `repositories/skills.py` — CRUD + search by name
- [ ] `services/employee_service.py` — pagination, search, filtering
- [ ] `services/skill_service.py`
- [ ] `api/routes/employees.py` — full CRUD + query params
- [ ] `api/routes/skills.py` — list + create
- [ ] `scripts/seed.py` — 50–100 employees, 80–150 skills, 30–50 projects, 5–10 initiatives skeleton

### Frontend Tasks
- [ ] `types/employee.ts`, `types/skill.ts`
- [ ] `api/employees.ts`, `api/skills.ts`
- [ ] `hooks/useEmployees.ts`, `hooks/useEmployee.ts`
- [ ] People Directory page (`/employees`) — search + dept/skill filter chips
- [ ] Employee card component (`EmployeeCard`)
- [ ] Employee Detail page (`/employees/:id`):
  - Capability profile with skill progress bars
  - Project history timeline
  - Certifications list
- [ ] Shared `SkillBadge` and `ProficiencyBar` components

### ✅ Definition of Done
```
/employees → see all seeded employees
  → filter by Engineering + Python
  → click employee → see skills with proficiency bars + project history
```

---

## Phase 3 — Initiative Intelligence

> **Goal:** User describes a business need in plain English → AI extracts structured skills.

### Backend Tasks
- [ ] `models/initiative.py` — initiatives + initiative_skills tables
- [ ] Alembic migration
- [ ] `ai/client.py` — LLM API wrapper (OpenAI-compatible)
- [ ] `ai/prompts.py` — skill extraction prompt template (structured JSON output)
- [ ] `ai/skill_extractor.py` — call LLM → parse → validate with Pydantic
- [ ] `ai/skill_normalizer.py` — lowercase → alias lookup → semantic similarity
- [ ] LLM failure handling (retry × 2 → return partial → manual fallback flag)
- [ ] `services/initiative_service.py` — create, analyze, store InitiativeSkills
- [ ] `repositories/initiatives.py`
- [ ] `api/routes/initiatives.py`:
  - `POST /initiatives` — create
  - `GET /initiatives` — list
  - `GET /initiatives/{id}` — detail
  - `POST /initiatives/{id}/analyze` — trigger LLM extraction

### LLM Output Schema (Pydantic validated)
```json
{
  "initiative_title": "AI Customer Support Platform",
  "skills": [
    { "name": "Generative AI", "importance": 0.95, "required_level": 0.80 },
    { "name": "Python",        "importance": 0.90, "required_level": 0.80 },
    { "name": "API Development","importance": 0.80, "required_level": 0.75 }
  ]
}
```

### Frontend Tasks
- [ ] `types/initiative.ts`
- [ ] `api/initiatives.ts`
- [ ] `hooks/useInitiatives.ts`, `hooks/useInitiative.ts`
- [ ] Create Initiative page (`/initiatives/new`):
  - Large textarea ("Describe your business initiative…")
  - Example prompts
  - "Analyze Initiative" button
  - Animated progress steps during analysis
- [ ] Skill Review screen (after AI returns):
  - List extracted skills with importance level
  - Edit skills (add / remove / change importance)
  - "Confirm & Find Talent" button
- [ ] Error state: "Couldn't analyze → Try Again / Add Skills Manually"

### ✅ Definition of Done
```
Enter: "Build an AI customer support platform using LLMs and Salesforce"
  → Loading animation shows progress steps
  → Skills appear: Generative AI · Python · API Dev · CRM Integration · Salesforce
  → User can edit + confirm
```

---

## Phase 4 — Matching Engine

> **Goal:** Employees ranked by fit against initiative requirements with deterministic scores.

### Backend Tasks
- [ ] `models/match.py` — matches + match_skills tables
- [ ] Alembic migration
- [ ] pgvector: generate + store employee capability embeddings on seed
- [ ] pgvector: generate + store initiative embeddings on analyze
- [ ] `matching/semantic.py` — cosine similarity retrieval (pgvector)
- [ ] `matching/skill_matcher.py` — per-skill coverage:
  - **Direct**: employee has canonical skill
  - **Transferable**: related skill with partial credit
  - **Partial**: has skill but below required level
  - **Missing**: no evidence
- [ ] `matching/scorer.py` — final weighted score:
  ```
  Final = 0.50 × Skill Score
        + 0.20 × Semantic Score
        + 0.15 × Experience Score
        + 0.15 × Evidence Score
  ```
- [ ] `matching/gap_analyzer.py` — per-skill org status: Covered / Partial / Missing
- [ ] `services/matching_service.py` — orchestrate full pipeline
- [ ] `api/routes/matching.py`:
  - `POST /initiatives/{id}/match` — run engine + store results
  - `GET /initiatives/{id}/matches` — paginated list (`?limit=&minimum_score=&department=`)
  - `GET /initiatives/{id}/matches/{employee_id}` — single match detail
  - `GET /initiatives/{id}/gaps` — skill gap analysis

### Frontend Tasks
- [ ] `types/match.ts`
- [ ] `api/matching.ts`
- [ ] `hooks/useInitiativeMatches.ts`, `hooks/useInitiativeGaps.ts`
- [ ] Initiative Detail page (`/initiatives/:id`):
  - Capability coverage progress bar
  - Required skills list (✓ / △ / ○ status)
  - Ranked talent match cards
  - Capability Gaps tab
- [ ] `MatchCard` component (name, score, skill coverage icons, snippet explanation)
- [ ] Filter bar (department, min score, required skill, experience)

### ✅ Definition of Done
```
POST /initiatives/{id}/match (100 employees) → response < 2 seconds
  → Talent Results: Aarav 91% · Priya 86% · Rahul 79%
  → Scores are deterministic (run twice → same result)
  → Gap tab: ✓ Python · ✓ GenAI · △ CRM · ○ Salesforce
```

---

## Phase 5 — Explainability

> **Goal:** Every recommendation has a human-readable explanation backed by evidence.

### Backend Tasks
- [ ] `ai/explanation_generator.py` — structured match data → LLM → concise explanation
  - Input: employee, match score, matched/partial/missing skills, evidence list
  - Constraint: **must not invent evidence absent from structured input**
- [ ] Generate explanations only for **top N matches** (cost control)
- [ ] Store explanation in `matches.explanation` field
- [ ] Evidence linking: `match_skills` → `employee_skills` → `employee_projects`

### Frontend Tasks
- [ ] Evidence Panel — click a skill on employee profile → see:
  - Proficiency + confidence level
  - Supporting projects (name, role, duration)
  - Evidence source type badge
- [ ] "Why Nexus matched X" section on Employee Profile and Match Card
- [ ] Skill coverage breakdown on Match Card:
  - `✓` Direct match
  - `△` Partial match (with reason)
  - `○` Missing
- [ ] Gap Analysis screen (full page):
  - **Covered** section (green)
  - **Partial** section (amber) with required vs available count
  - **Missing** section (red) with "Required: N · Available: 0"
  - "View Related Talent" CTA

### ✅ Definition of Done
```
Click "Aarav Sharma" match card:
  → Read: "Aarav matches 5 of 6 required capabilities. Direct evidence in Python,
           LLM applications and API development from AI Support Bot project."
  → Click "Generative AI" skill → see evidence panel with project history
  → Gap tab: Salesforce Architecture → Missing (Required: 1 · Available: 0)
```

---

## Phase 6 — Dashboard

> **Goal:** Organization-wide capability intelligence at a glance.

### Backend Tasks
- [ ] `services/dashboard_service.py` — aggregate queries:
  - Total employees, total skills tracked
  - Active initiatives count + coverage %
  - Critical gaps (Missing status skills across all active initiatives)
  - Top skills by employee count
- [ ] `api/routes/dashboard.py`:
  - `GET /dashboard/overview` — metric cards data
  - `GET /dashboard/skills` — skill distribution
  - `GET /dashboard/gaps` — org-wide critical gaps
  - `GET /dashboard/initiatives` — active initiatives summary
- [ ] Response time target: < 500ms

### Frontend Tasks
- [ ] Dashboard page (`/dashboard`):
  - Metric cards (Employees · Skills · Active Initiatives · Critical Gaps)
  - Active Initiatives list (name + coverage bar)
  - Critical Skill Gaps panel (clickable → initiative)
  - "+ New Initiative" primary CTA
- [ ] `MetricCard` component with trend indicator
- [ ] `CapabilityBar` component (coverage %)
- [ ] `ActiveInitiativeRow` component
- [ ] `GapBadge` component (Covered / Partial / Missing)

### ✅ Definition of Done
```
/dashboard → loads in < 500ms
  → Shows: 87 Employees · 143 Skills · 8 Initiatives · 3 Critical Gaps
  → Active initiatives list with coverage bars
  → Click critical gap → navigates to initiative gaps tab
```

---

## Phase 7 — Polish & Demo Prep

> **Goal:** Demo-ready. Judges are wowed. No rough edges.

### UX Polish
- [ ] Animated loading states for all async operations:
  - AI analysis: multi-step progress (`✓ Understanding → ✓ Identifying → ● Mapping → ○ Preparing`)
  - Matching: `Searching workforce… Comparing skills… Calculating matches…`
- [ ] Empty states (no employees, no matches, no initiatives)
- [ ] "No Strong Matches" state → always show gap analysis instead of blank
- [ ] Error boundaries + graceful API error messages
- [ ] Responsive layout (desktop-first, tablet-usable, sidebar → top nav on mobile)
- [ ] Skeleton loaders on data-heavy pages

### Performance
- [ ] Cache skill embeddings (don't regenerate on every call)
- [ ] Cache initiative embeddings
- [ ] Generate LLM explanations for top 5 matches only (AI cost control)
- [ ] Semantic pre-filter: top 20 candidates → structured match → top 10 results

### Demo Hardening
- [ ] Seed script is idempotent (safe to re-run)
- [ ] `make seed` / `python -m scripts.seed` reproducibly loads clean demo data
- [ ] All demo initiative examples produce rich, varied talent results
- [ ] End-to-end test: login → create initiative → confirm skills → view matches → view employee → view gaps

### Documentation
- [ ] `README.md` — setup in < 5 commands
- [ ] `.env.example` — all vars documented with descriptions
- [ ] API Swagger accessible at `/docs`
- [ ] Docker setup verified on clean machine

### ✅ Definition of Done — Hackathon Complete
```
docker compose up
  → Seed loads
  → Full golden path demo in ~4 minutes:
      0:00 Dashboard → 0:30 New Initiative → 1:30 AI extracts skills
      → 2:15 Talent Results → 2:45 Open Aarav → 3:15 Evidence Panel
      → 3:45 Gap Analysis → 4:15 Closing statement
  → No backend intervention required during demo
```

---

## Hackathon Priority Order

> Ship in this order if time is limited:

| Priority | Feature | Why |
|---|---|---|
| 1 | Employee Dataset | Nothing works without data |
| 2 | Initiative Creation | Core entry point |
| 3 | AI Skill Extraction | The AI differentiator |
| 4 | Skill Matching | Core engine |
| 5 | Talent Results | Primary output |
| 6 | Match Explanation | Builds trust |
| 7 | Gap Analysis | Strategic insight |
| 8 | Dashboard | Context overview |
| 9 | UI Polish | Wow factor |

---

## Match Score Formula

```
Final Score  =  0.50 × Skill Score
             +  0.20 × Semantic Score
             +  0.15 × Experience Score
             +  0.15 × Evidence Score

Skill Score  =  Σ(skill_coverage × importance) / Σ(importance)
coverage     =  min(employee_level / required_level, 1.0)

Evidence Weights:
  Verified Project Experience   1.00
  Certification                 0.90
  Manager / Org Verified        0.90
  Resume / Profile              0.70
  Self Declared                 0.50
```

---

## Technical Definition of Done

Complete MVP checklist:

- [ ] PostgreSQL + pgvector running via Docker
- [ ] Migrations run clean from empty database
- [ ] Seed data loads in < 30 seconds
- [ ] FastAPI starts + `/docs` Swagger accessible
- [ ] React app starts + builds without errors
- [ ] Auth (register / login / JWT) works end-to-end
- [ ] Employee + Skill CRUD works
- [ ] Initiative creation works
- [ ] LLM skill extraction returns valid Pydantic-validated JSON
- [ ] Skill normalization works (aliases resolve correctly)
- [ ] Matching engine returns ranked results < 2s (100 employees)
- [ ] Match scores are deterministic
- [ ] LLM explanations generated for top matches
- [ ] Gap analysis returns Covered / Partial / Missing correctly
- [ ] Dashboard loads with correct aggregated metrics < 500ms
- [ ] API errors return standard error schema
- [ ] End-to-end golden path demo works without manual intervention
- [ ] No secrets committed to Git
- [ ] Docker Compose up brings entire stack online

---

## API Reference

```
Auth
  POST  /api/v1/auth/login
  POST  /api/v1/auth/register
  GET   /api/v1/auth/me

Employees
  GET    /api/v1/employees          ?department=&role=&skill=&search=&page=&limit=
  GET    /api/v1/employees/{id}
  POST   /api/v1/employees
  PATCH  /api/v1/employees/{id}
  DELETE /api/v1/employees/{id}

Skills
  GET   /api/v1/skills              ?search=
  GET   /api/v1/skills/{id}
  POST  /api/v1/skills

Initiatives
  GET    /api/v1/initiatives
  GET    /api/v1/initiatives/{id}
  POST   /api/v1/initiatives
  PATCH  /api/v1/initiatives/{id}
  DELETE /api/v1/initiatives/{id}
  POST   /api/v1/initiatives/{id}/analyze
  POST   /api/v1/initiatives/{id}/match
  GET    /api/v1/initiatives/{id}/matches   ?limit=&minimum_score=&department=
  GET    /api/v1/initiatives/{id}/matches/{employee_id}
  GET    /api/v1/initiatives/{id}/gaps

Dashboard
  GET  /api/v1/dashboard/overview
  GET  /api/v1/dashboard/skills
  GET  /api/v1/dashboard/gaps
  GET  /api/v1/dashboard/initiatives
```
