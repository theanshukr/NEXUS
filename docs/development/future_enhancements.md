# Known Issues & Future Enhancements (Post-Freeze Roadmap)

*This document outlines known non-blocking architectural observations and future feature enhancements for frozen modules (M-01 to M-05) and upcoming integrations (M-06+).*

---

## 1. M-01 to M-05 Foundational Modules (Frozen)

### 1.1 Distributed EventBus Scaling
- **Current State:** `EventBus` operates via native Node.js in-memory `EventEmitter` (`src/core/events/EventBus.js`).
- **Future Enhancement:** For multi-instance horizontal scaling, implement a Redis Pub/Sub or AWS EventBridge adapter behind the canonical `EventBus` interface. This ensures domain events (e.g., `TENANT_PROVISIONED`, `ATTENDANCE.PAY_PERIOD_FINALIZED`) broadcast reliably across clustered container instances without modifying domain emitters.

### 1.2 IoT & Biometric Hardware Clock-In Ingestion
- **Current State:** Attendance tracking (M-05) supports web/mobile GPS geofenced clock-in and manual regularization workflows.
- **Future Enhancement:** Introduce a dedicated high-throughput IoT hardware ingestion gateway (`POST /api/v1/attendance/devices/clock`) authenticated via HMAC device tokens. This will allow RFID badge scanners and facial recognition terminals to stream raw punch logs directly into the attendance engine.

### 1.3 ATS Semantic Resume Parsing & AI Ranking (M-04 + M-15)
- **Current State:** Recruitment Management (M-04) manages job requisitions, candidate profiles, documents, and interview stages.
- **Future Enhancement:** Integrate M-15 (AI Operations Co-Pilot) to automatically parse uploaded PDF/DOCX resumes, extract key competencies using LLMs, and compute a semantic compatibility score against Zod-validated Job Requisition criteria.

---

## 2. Upcoming Module Integrations (M-06 to M-07)

### 2.1 Automated Leave Balance Accrual Cron Engine (M-06)
- **Observation:** Leave Management (M-06) requires periodic balance calculations (e.g., monthly 1.5-day PTO accruals).
- **Plan:** Implement a reliable background worker cron job using Upstash Redis scheduling or Redis-based distributed locks to execute atomic accrual batches per organization without race conditions.

### 2.2 Attendance-to-Payroll Automated Audit Pre-Checks (M-05 + M-07)
- **Observation:** While M-05 provides `AttendanceReconciliationService` with strict state machine validation (`NOT_PROCESSED` -> `PROCESSING` -> `PROCESSED` -> `LOCKED`), payroll administrators benefit from proactive anomaly detection.
- **Plan:** When M-07 Payroll initiates a pay period run, add an automated pre-flight audit check that flags chronic tardiness, unapproved regularizations, or suspicious overtime spikes before computing final payouts.
