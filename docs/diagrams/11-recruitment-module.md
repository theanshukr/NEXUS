# Recruitment & ATS Module (M-04)

## Purpose

This document describes the Recruitment module architecture: how job requisitions are created and approved, how job postings reach candidates via a public API, how candidates apply and move through the ATS pipeline, and how the offer-to-onboarding handoff works.

## Architectural Overview

The Recruitment module (M-04) implements a complete Applicant Tracking System (ATS). It has two distinct API surfaces: an **internal API** for HR and managers, and a **public API** for candidates who authenticate separately via their own session system.

| Service | Responsibility |
|---|---|
| `JobRequisitionService` | Create, approve, and manage headcount requests |
| `JobPostingService` | Publish open positions; manage visibility |
| `JobApplicationService` | Candidate applications; initial screening |
| `AtsApplicationService` | Move applications through pipeline stages |
| `InterviewService` | Schedule and record interview rounds |
| `OfferService` | Generate, send, and track offer letters |

## Recruitment Pipeline

```mermaid
flowchart LR
    REQ["Job Requisition\n(HR + Manager approval)"]
    POST["Job Posting\n(Published internally\nor to public)"]
    APP["Application Received\n(NEW)"]
    SCREEN["Screening\n(SHORTLISTED / REJECTED)"]
    INT["Interviews\n(Scheduled rounds)"]
    OFFER["Offer Issued\n(SENT)"]
    ACCEPT["Offer ACCEPTED"]
    ONB["Employee Onboarded\n(M-03 Employee record)"]

    REQ --> POST --> APP --> SCREEN --> INT --> OFFER --> ACCEPT --> ONB
```

## Dual API Surface

```mermaid
graph TB
    subgraph "Internal API (Authenticated Employees)"
        I1["POST /requisitions — create requisition"]
        I2["POST /requisitions/:id/approve — approve requisition"]
        I3["GET /applications — view applications"]
        I4["PUT /applications/:id/stage — move ATS stage"]
        I5["POST /applications/:id/interviews — schedule interview"]
        I6["POST /applications/:id/offer — issue offer"]
    end

    subgraph "Public API (Candidates)"
        P1["POST /public/:slug/auth/register — candidate signup"]
        P2["GET /public/:slug/jobs — browse open positions"]
        P3["POST /public/:slug/applications — submit application"]
        P4["GET /public/:slug/profile — view own application"]
    end

    subgraph "Candidate Auth (Separate from Employee Auth)"
        CA["CandidateAuthService\n(own JWT, own session namespace)"]
        CM["candidateAuth() middleware\nSeparate from employee authenticate()"]
    end

    P1 --> CA
    P3 & P4 --> CM
```

*The public API routes use a `:slug` parameter (organization slug) to identify the tenant — this is the only exception to the "no tenant ID in URLs" rule, because candidates authenticate independently and don't carry a JWT with `organizationId`.*

## ATS Application Pipeline Stages

```mermaid
stateDiagram-v2
    [*] --> NEW: Application submitted
    NEW --> SHORTLISTED: Screener review
    NEW --> REJECTED: Initial screening failed
    SHORTLISTED --> INTERVIEW: Move to interview
    INTERVIEW --> OFFER: Interview passed
    INTERVIEW --> REJECTED: Interview failed
    OFFER --> ACCEPTED: Candidate accepts
    OFFER --> DECLINED: Candidate declines
    OFFER --> WITHDRAWN: HR withdraws offer
    ACCEPTED --> [*]: Triggers employee onboarding
```

## Job Requisition Approval Flow

```mermaid
sequenceDiagram
    actor MGR as Department Manager
    actor HR as HR Manager
    participant JRS as JobRequisitionService
    participant DB as MongoDB

    MGR->>JRS: POST /requisitions { title, department, headcount, justification }
    JRS->>JRS: hasPermission('user.create') check
    JRS->>DB: Create requisition (PENDING_APPROVAL)

    HR->>JRS: PUT /requisitions/:id/approve
    JRS->>JRS: hasPermission('user.create') check
    JRS->>DB: runInTransaction():
    Note over DB: Update status: APPROVED\nCreate JobPosting (DRAFT)\nAuditLog

    MGR->>JRS: PUT /requisitions/:id/publish
    JRS->>DB: Update JobPosting to PUBLISHED
    Note over JRS: Now visible in public API
```

## Offer-to-Onboarding Handoff

When a candidate accepts an offer, the system creates an employee record via an internal service call — this is a cross-module interaction between M-04 and M-03.

```mermaid
sequenceDiagram
    participant OS as OfferService (M-04)
    participant ES as EmployeeService (M-03)
    participant DB as MongoDB

    OS->>DB: runInTransaction():
    Note over DB: Update Offer: ACCEPTED\nUpdate Application: ACCEPTED

    OS->>ES: createEmployee({ candidateData, organizationId })
    ES->>DB: Create Employee record
    ES->>DB: Create User account
    Note over ES: Employee has no login until\nHR sends an invitation separately

    OS->>EventBus: emit(EMPLOYEE.CREATED)
```

## Key Takeaways

- **Candidates have their own authentication system.** The `candidateAuth` middleware and `CandidateAuthService` are completely separate from the employee authentication stack. Candidate JWTs cannot be used to call internal APIs.
- **Organization slug in the URL is the only exception to the no-tenant-in-URL rule.** It is necessary because candidates don't carry an authenticated `organizationId` in their JWT before they register.
- **The ATS pipeline is state-machine driven.** Invalid stage transitions (e.g., moving directly from `NEW` to `OFFER`) are rejected at the service layer.
- **Offer acceptance triggers cross-module employee creation.** This is a direct service call (not an event) to ensure the employee record is created atomically within the same transaction as the offer acceptance.
- **Job postings decouple requisitions from public visibility.** A requisition can be approved without being publicly visible. Publishing is a separate explicit action.
