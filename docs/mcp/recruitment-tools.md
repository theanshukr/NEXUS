# MCP Recruitment Tool Specification (`recruitment-tools.md`)

*Version 1.0 | Synchronized with Backend Architecture (M-04)*

## 1. `mcp_recruitment_create_requisition`
- **Purpose**: Initiates a new Job Requisition workflow for headcount approval.
- **HTTP Mapping**: `POST /api/v1/requisitions`
- **Service Called**: `JobRequisitionService.createRequisition`
- **Authentication**: Bearer JWT Required
- **Permission Required**: `recruitment.job.create`
- **Input JSON Schema**: `{ "type": "object", "properties": { "title": { "type": "string" }, "departmentId": { "type": "string" }, "headcount": { "type": "number" }, "type": { "type": "string" }, "location": { "type": "string" }, "level": { "type": "string" }, "salaryRange": { "type": "object" } }, "required": ["title", "departmentId", "headcount"] }`
- **Transaction Boundary**: ACID transaction.
- **Events Emitted**: `REQUISITION.CREATED`
- **Audit Logs Generated**: `REQUISITION_CREATED`
- **Idempotency**: Partial (Duplicate titles per department may conflict).
- **Errors**: `403 Forbidden`, `400 Validation Error`, `409 Conflict`.

---

## 2. `mcp_recruitment_approve_requisition`
- **Purpose**: Advances the approval tier of a Job Requisition.
- **HTTP Mapping**: `POST /api/v1/requisitions/:id/approve`
- **Service Called**: `JobRequisitionService.approveRequisition`
- **Authentication**: Bearer JWT Required
- **Permission Required**: `recruitment.job.approve`
- **Input JSON Schema**: `{ "type": "object", "properties": { "id": { "type": "string" }, "comments": { "type": "string" } }, "required": ["id"] }`
- **Transaction Boundary**: ACID transaction (Tier approval).
- **Events Emitted**: `REQUISITION.APPROVED`
- **Audit Logs Generated**: `REQUISITION_APPROVED`
- **Idempotency**: Yes.
- **Errors**: `403 Forbidden` (If user is not in active approval tier).

---

## 3. `mcp_recruitment_publish_job`
- **Purpose**: Creates a public-facing Job Posting from an approved Requisition.
- **HTTP Mapping**: `POST /api/v1/requisitions/:id/publish`
- **Service Called**: `JobPostingService.publishJob`
- **Authentication**: Bearer JWT Required
- **Permission Required**: `recruitment.job.publish`
- **Input JSON Schema**: `{ "type": "object", "properties": { "id": { "type": "string" }, "platforms": { "type": "array", "items": { "type": "string" } } }, "required": ["id"] }`
- **Transaction Boundary**: ACID transaction creating JobPosting.
- **Events Emitted**: `JOB.PUBLISHED`
- **Audit Logs Generated**: `JOB_PUBLISHED`
- **Idempotency**: Yes.
- **Errors**: `400 Bad Request` (If not APPROVED).

---

## 4. `mcp_recruitment_submit_application`
- **Purpose**: Submits a candidate to a Job Posting.
- **HTTP Mapping**: `POST /api/v1/applications`
- **Service Called**: `JobApplicationService.submit`
- **Authentication**: Bearer JWT Required / Public
- **Permission Required**: `recruitment.application.create` (If internal)
- **Input JSON Schema**: `{ "type": "object", "properties": { "candidateId": { "type": "string" }, "requisitionId": { "type": "string" }, "source": { "type": "string" } }, "required": ["candidateId", "requisitionId"] }`
- **Transaction Boundary**: ACID transaction linking candidate to job.
- **Events Emitted**: `APPLICATION.SUBMITTED`
- **Audit Logs Generated**: `APPLICATION_SUBMITTED`
- **Idempotency**: Yes (Candidate cannot apply twice).
- **Errors**: `409 Conflict` (Already applied).

---

## 5. `mcp_recruitment_advance_stage`
- **Purpose**: Advances the ATS pipeline stage.
- **HTTP Mapping**: `PUT /api/v1/applications/:id/stage`
- **Service Called**: `JobApplicationService.advanceStage`
- **Authentication**: Bearer JWT Required
- **Permission Required**: `recruitment.application.move-stage`
- **Input JSON Schema**: `{ "type": "object", "properties": { "id": { "type": "string" }, "stage": { "type": "string" } }, "required": ["id", "stage"] }`
- **Transaction Boundary**: ACID transaction writing stage and history.
- **Events Emitted**: `APPLICATION.STAGE_CHANGED`
- **Audit Logs Generated**: `APPLICATION_STAGE_CHANGED`
- **Idempotency**: Yes.
- **Errors**: `400 Invalid Stage`.

---

## 6. `mcp_recruitment_reject_application`
- **Purpose**: Marks an application as rejected.
- **HTTP Mapping**: `POST /api/v1/applications/:id/reject`
- **Service Called**: `JobApplicationService.reject`
- **Authentication**: Bearer JWT Required
- **Permission Required**: `recruitment.application.review`
- **Input JSON Schema**: `{ "type": "object", "properties": { "id": { "type": "string" }, "reason": { "type": "string" } }, "required": ["id", "reason"] }`
- **Transaction Boundary**: ACID transaction marking terminal state.
- **Events Emitted**: `APPLICATION.REJECTED`
- **Audit Logs Generated**: `APPLICATION_REJECTED`
- **Idempotency**: Yes.
- **Errors**: `403 Forbidden`.

---

## 7. `mcp_recruitment_create_offer`
- **Purpose**: Generates an offer for the candidate.
- **HTTP Mapping**: `POST /api/v1/offers`
- **Service Called**: `OfferService.createOffer`
- **Authentication**: Bearer JWT Required
- **Permission Required**: `recruitment.offer.create`
- **Input JSON Schema**: `{ "type": "object", "properties": { "applicationId": { "type": "string" }, "salary": { "type": "number" }, "expiresAt": { "type": "string", "format": "date" } }, "required": ["applicationId", "salary"] }`
- **Transaction Boundary**: ACID transaction.
- **Events Emitted**: `OFFER.CREATED`
- **Audit Logs Generated**: `OFFER_CREATED`
- **Idempotency**: Strict (Only one active offer allowed).
- **Errors**: `409 Conflict` (Active offer exists).

---

## 8. `mcp_recruitment_accept_offer`
- **Purpose**: Accepts an offer, generating an Employee profile.
- **HTTP Mapping**: `POST /api/v1/candidate/offers/:id/accept`
- **Service Called**: `OfferService.acceptOffer`
- **Authentication**: Candidate Bearer JWT
- **Permission Required**: None (Uses Candidate Identity)
- **Input JSON Schema**: `{ "type": "object", "properties": { "id": { "type": "string" }, "signature": { "type": "string" } }, "required": ["id"] }`
- **Transaction Boundary**: ACID transaction + Event Driven employee creation.
- **Events Emitted**: `OFFER.ACCEPTED`, `CANDIDATE.HIRED`
- **Audit Logs Generated**: `OFFER_ACCEPTED`
- **Idempotency**: Yes.
- **Errors**: `400 Offer Expired/Revoked`.
