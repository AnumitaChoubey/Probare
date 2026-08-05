# Functional Specification Document (FSD)
## QEMS — Quality Error Management System

| Field | Value |
|---|---|
| Document Version | 1.0 |
| Status | Draft for Review |
| Depends On | PRD v1.0 |
| Feeds Into | FRS, NFRS, DB Schema, API Design, UI/UX Wireframes |

---

## 1. Purpose

This document specifies **how** each Phase 1 feature from the PRD behaves functionally: screen-level field specs, validation rules, business rules, state transitions, notification triggers, and edge-case handling. Where the PRD says *what* the system must do, this document says *exactly how* it does it.

---

## 2. Module Map

| Module Code | Module Name |
|---|---|
| M1 | Authentication & Session |
| M2 | Error Logging |
| M3 | QA Error ID Generation |
| M4 | Ownership Resolution & Notification |
| M5 | Rebuttal Workflow |
| M6 | QA Final Decision Workflow |
| M7 | Evidence Management |
| M8 | Status, Aging & SLA Engine |
| M9 | Escalation Engine |
| M10 | Dashboards & Reporting |
| M11 | Audit Trail |
| M12 | RBAC / User & Role Management |
| M13 | Admin Configuration Console |
| M14 | Extensibility Service Layer (AI-readiness hooks) |

---

## 3. M1 — Authentication & Session

### 3.1 Functional Behavior
- Users authenticate via enterprise SSO (SAML2/OIDC against enterprise IdP — see NFRS for security detail).
- On first SSO login, QEMS auto-provisions a user record (Just-In-Time provisioning) with a **default "Unassigned" role** — no functional access until an Admin assigns a role.
- Session timeout: configurable, default 30 minutes of inactivity (admin-configurable per NFRS).
- Users see a role-appropriate landing page immediately after login (see Section 10, Dashboards).

### 3.2 Business Rules
- BR-1.1: A user with no assigned role sees only a "Pending Access" screen and cannot access any module.
- BR-1.2: A user may hold more than one role simultaneously (e.g., QA Auditor + QA Lead for a small team) — permissions are the union of all assigned roles (see RBAC Matrix document).
- BR-1.3: Deactivated users (per HRIS sync or manual admin action) immediately lose session access, even mid-session (session is force-invalidated within 5 minutes of deactivation).

---

## 4. M2 — Error Logging

### 4.1 Entry Points
- "Log New Error" button on Auditor Dashboard.
- Deep-link from a scheduled audit tool (future integration placeholder — out of scope Phase 1, field reserved in schema).

### 4.2 Form Field Specification

| Field | Type | Mandatory | Validation | Notes |
|---|---|---|---|---|
| Transaction/Interaction Reference ID | Text | Yes | Alphanumeric, 3–50 chars | Free text in Phase 1; source-system lookup is a Phase 3 candidate |
| LOB / Process Area | Dropdown (single-select) | Yes | Must match Admin-configured list | Drives ownership resolution |
| Error Category | Dropdown (single-select, dependent on LOB) | Yes | Must match Admin-configured category list for selected LOB | Drives SLA and ownership |
| Error Sub-Category | Dropdown (dependent on Category) | Conditional (mandatory if sub-categories configured for the category) | Must match configured list | |
| Severity | Dropdown: Critical / High / Medium / Low | Yes | Fixed enum | Drives SLA window (Section 8) |
| Agent / Owner Identified (if known) | Searchable user picker | No | Must resolve to a valid active user if filled | If blank, ownership resolves to team-level per LOB/category mapping |
| Date of Occurrence | Date picker | Yes | Cannot be a future date | |
| Date of Audit/Detection | Date picker | Yes, auto-defaulted to today | Cannot be before Date of Occurrence | Editable |
| Error Description | Rich text | Yes | Min 20 characters, max 4000 characters | |
| Root Cause (initial auditor assessment) | Dropdown + free text "Other" | No | — | Optional at logging; can be refined at closure |
| Evidence Attachment(s) | File upload, multi-file | Conditional — mandatory for Critical/High severity, optional for Medium/Low (admin-configurable) | See M7 for type/size rules | |
| Client/Contractual Impact Flag | Boolean toggle | No | — | Drives visibility on Leadership Dashboard |
| Internal Notes (QA-only, not visible to accused) | Text | No | Max 2000 chars | Never shown to Operations role |

### 4.3 Submission Logic
1. On "Submit," client-side validation runs first (mandatory fields, format, date logic).
2. On server-side validation pass, system:
   - Generates unique QA Error ID (M3).
   - Persists record with status **`OPEN_PENDING_ACK`**.
   - Resolves ownership (M4).
   - Creates initial audit trail entry (M11): "Error logged by {Auditor Name} at {timestamp}."
   - Triggers notification (M4).
3. On validation failure, form returns inline field-level errors; no partial record is created.
4. **Save as Draft**: auditors may save an incomplete form as a draft (status `DRAFT`, visible only to the creating auditor, not counted in any SLA/aging/reporting until submitted).

### 4.4 Edge Cases
- EC-2.1: Duplicate submission (double-click) — system must be idempotent; a client-generated idempotency token prevents duplicate error records on network retry.
- EC-2.2: Auditor logs an error against themselves — not blocked by system (a self-flag is valid, e.g., peer review), but system flags such record for QA Lead visibility.
- EC-2.3: LOB/Category deleted or deactivated by Admin after logging — historical records retain the original label as free-text snapshot; they do not break if the live dropdown option is later removed.

---

## 5. M3 — QA Error ID Generation

### 5.1 Format
```
QE-{LOBCODE}-{YYYY}-{SEQ6}
```
Example: `QE-BILL-2026-000481`

- `LOBCODE`: 3–5 character admin-configured code per LOB.
- `YYYY`: calendar year of logging.
- `SEQ6`: 6-digit zero-padded sequence, **reset per LOBCODE per year**, generated via an atomic database sequence (no gaps under normal operation; gaps only possible if a transaction is rolled back, which is acceptable and does not require ID re-use).

### 5.2 Rules
- BR-3.1: QA Error ID is immutable once generated — never edited, never reused, never deleted (soft-delete only, see M11).
- BR-3.2: ID generation must be atomic/thread-safe under concurrent submissions (implementation detail in TRD/API Design — e.g., DB sequence or advisory lock).
- BR-3.3: ID is the primary human-facing reference used in all notifications, dashboards, exports, and audit references.

---

## 6. M4 — Ownership Resolution & Notification

### 6.1 Ownership Resolution Logic
1. If "Agent/Owner Identified" was filled at logging → that user is the primary owner.
2. Else → system looks up the Admin-configured **Ownership Mapping Table** (LOB + Category → default Owner Role/Team + default Owner Manager) and assigns to the team queue; a specific individual owner may be self-claimed or assigned by the Operations Manager.
3. If no mapping exists for the LOB/Category combination → error is routed to a configurable **"Unmapped Errors"** queue visible to QA Admin, and the auditor's QA Lead is notified for manual routing. (This must not silently fail.)

### 6.2 Notification Triggers (Phase 1 channel: Email/Outlook, plus in-app notification center)

| Trigger Event | Recipients | Channel | Template Ref |
|---|---|---|---|
| Error logged (status → `OPEN_PENDING_ACK`) | Assigned owner (individual or team distribution) + owner's manager (CC) | Email + in-app | NT-01 |
| Owner acknowledges / opens error | QA Auditor who logged it | In-app only | NT-02 |
| Rebuttal submitted | QA Auditor + QA Lead | Email + in-app | NT-03 |
| Acceptance (no rebuttal) submitted | QA Auditor | In-app only | NT-04 |
| SLA breach — rebuttal window | Owner + Owner's Manager + QA Lead | Email + in-app | NT-05 |
| Final QA decision recorded | Owner + Owner's Manager + QA Auditor | Email + in-app | NT-06 |
| Escalation triggered (M9) | Escalation-path recipients per Admin config | Email + in-app | NT-07 |
| Error reopened | Owner + QA Lead + original Auditor | Email + in-app | NT-08 |

- BR-4.1: Every email notification includes the QA Error ID, a summary, current status, and a secure deep link to the record.
- BR-4.2: Email delivery failure (bounce/undeliverable) is logged and surfaces as an alert on the QA Lead's dashboard — the system does not "fail silently" if notification cannot be delivered.
- BR-4.3: In-app notification center (bell icon) mirrors every email notification and additionally supports notification read/unread state, independent of email delivery.

---

## 7. M5 — Rebuttal Workflow

### 7.1 Entry Conditions
- Rebuttal option is available only to the resolved owner (individual) or any member of the owner team queue with permission to respond, while status is `OPEN_PENDING_ACK` or `OPEN_PENDING_RESPONSE`.

### 7.2 Options Presented to Owner
| Action | Resulting Status | Required Fields |
|---|---|---|
| **Accept** (agree error is valid) | `ACCEPTED_PENDING_CLOSURE` | Optional acknowledgement comment |
| **Rebut** (dispute) | `REBUTTAL_SUBMITTED_PENDING_QA_REVIEW` | Mandatory rebuttal justification (min 20 chars), optional evidence upload |
| **No action within SLA window** | Auto-transitions to `SLA_BREACHED_ESCALATED` (M9) | — |

### 7.3 Business Rules
- BR-5.1: Only one active rebuttal cycle per error at a time; a second rebuttal round is only possible if QA Lead explicitly **reopens for renegotiation** (a distinct, logged, permissioned action — see M6.5).
- BR-5.2: Rebuttal justification field is mandatory and cannot be a copy of the original error description (system performs a simple non-empty/non-identical check; deeper semantic duplicate-justification detection is a Phase 2 AI candidate).
- BR-5.3: Owner may attach evidence to their rebuttal (M7); this evidence is timestamped separately from the auditor's original evidence and never overwrites it.
- BR-5.4: Once submitted, a rebuttal cannot be edited by the owner — a correction requires the QA Auditor/Lead to reopen the rebuttal window (logged action).

---

## 8. M6 — QA Final Decision Workflow

### 8.1 Entry Conditions
- Available to the QA Auditor who logged the error, or their QA Lead, once status is `REBUTTAL_SUBMITTED_PENDING_QA_REVIEW` or `ACCEPTED_PENDING_CLOSURE`.

### 8.2 Decision Options

| Decision | Meaning | Resulting Status | Mandatory Fields |
|---|---|---|---|
| **Upheld** | Original finding confirmed as-is | `CLOSED_UPHELD` | Rationale (min 20 chars) |
| **Overturned** | Original finding reversed | `CLOSED_OVERTURNED` | Rationale (min 20 chars) |
| **Partially Upheld** | Mixed outcome | `CLOSED_PARTIAL` | Rationale + specific breakdown of what was upheld vs. conceded |

### 8.3 Business Rules
- BR-6.1: A decision cannot be recorded without a rationale — this is a hard system validation, not a UI convention (enforced server-side).
- BR-6.2: Once a decision is recorded, the record moves to **read-only** for all roles except QA Lead/Manager, who retain a permissioned **Reopen** action.
- BR-6.3: If status was `ACCEPTED_PENDING_CLOSURE` (owner accepted, no rebuttal), the only valid decision is **Upheld** — the system does not allow "Overturned" on an accepted error without first reopening.
- BR-6.4: **Reopen** action (M6.5) requires: reason (mandatory text), and is itself a distinct audit-logged event; reopened errors get a `_REOPENED` suffix state and revert to the appropriate prior stage (e.g., back to rebuttal pending) rather than being deleted/recreated.
- BR-6.5: All closure notifications (NT-06) fire immediately upon decision save — no batch delay.

---

## 9. M7 — Evidence Management

### 9.1 Functional Rules
- Supported file types (Phase 1 default, admin-configurable): PDF, PNG, JPG, MP3, MP4, DOCX, XLSX, TXT, EML.
- Max file size: 25 MB per file (admin-configurable); max 10 files per error record per party (auditor side and owner side tracked separately).
- Every evidence file is stored with metadata: uploader, upload timestamp, associated error ID, associated workflow stage (original logging / rebuttal / decision), and a checksum (integrity verification).
- Evidence is **never overwritten or deleted** by any role — only "soft superseded" if a corrected file is uploaded (both versions retained, latest flagged as current, prior versions still viewable in audit history).
- Evidence access is permission-scoped: Operations roles see only evidence relevant to errors where they are a named party; QA and Leadership roles see all evidence per their RBAC scope.

### 9.2 Business Rules
- BR-7.1: Critical/High severity errors require at least one evidence file before submission (BR from M2.2 restated here for completeness).
- BR-7.2: Evidence retention follows enterprise data governance policy (retention duration configurable in Admin console; default assumption 3 years, to be confirmed against actual enterprise policy — flagged as an Open Item in the PRD).
- BR-7.3: Evidence download/view actions are themselves logged in the audit trail (who viewed/downloaded what, when) to support compliance review.

---

## 10. M8 — Status Lifecycle, Aging & SLA Engine

### 10.1 Full Status List

| Status Code | Display Name | Description |
|---|---|---|
| `DRAFT` | Draft | Auditor has not yet submitted |
| `OPEN_PENDING_ACK` | Open — Pending Acknowledgement | Logged, notification sent, awaiting owner action |
| `OPEN_PENDING_RESPONSE` | Open — Pending Response | Owner acknowledged/opened but has not yet accepted or rebutted |
| `ACCEPTED_PENDING_CLOSURE` | Accepted — Pending Closure | Owner accepted; awaiting QA closure decision |
| `REBUTTAL_SUBMITTED_PENDING_QA_REVIEW` | Rebuttal Submitted — Pending QA Review | Owner disputed; awaiting QA decision |
| `SLA_BREACHED_ESCALATED` | SLA Breached — Escalated | No owner action within SLA window; escalated per M9 |
| `CLOSED_UPHELD` | Closed — Upheld | Final, read-only |
| `CLOSED_OVERTURNED` | Closed — Overturned | Final, read-only |
| `CLOSED_PARTIAL` | Closed — Partially Upheld | Final, read-only |
| `REOPENED` | Reopened | Previously closed/decided, manually reopened with logged reason |

*(Full transition diagram with guard conditions is provided in the dedicated Workflow/State Machine document.)*

### 10.2 SLA Configuration
- SLA windows are defined per **Severity × Category** combination in the Admin console (e.g., Critical = 1 business day to respond; Low = 5 business days).
- Business-day calculation respects a configurable holiday/working-hours calendar (per region, to support multi-geography per PRD assumption).
- Aging is calculated continuously and displayed as: `Elapsed Time / SLA Window` with a color-coded indicator:
  - Green: < 70% of SLA window elapsed
  - Amber: 70–99% elapsed
  - Red: SLA breached (≥100% elapsed, auto-escalates per M9)

---

## 11. M9 — Escalation Engine

### 11.1 Rules
- BR-9.1: On SLA breach (rebuttal window or QA decision window), status auto-transitions to `SLA_BREACHED_ESCALATED` and notification NT-07 fires to the configured escalation path.
- BR-9.2: Escalation path is configurable per LOB: Level 1 = direct manager, Level 2 = department head, Level 3 = QA Governance lead — each level with its own additional time window before escalating further (e.g., +2 days unresolved → Level 2).
- BR-9.3: Escalation does **not** change the underlying decision requirement — the error still requires the same rebuttal/decision workflow; escalation only adds visibility and urgency, and adds escalation-path recipients to notifications until resolved.
- BR-9.4: All escalations are visible in a dedicated "Escalations" dashboard view for QA Leadership.

---

## 12. M10 — Dashboards & Reporting

### 12.1 Auditor Dashboard
- My logged errors (list, filterable by status/date/category).
- Aging indicators per error.
- Quick actions: log new error, view drafts, review rebuttals awaiting my decision.

### 12.2 QA Lead / Team Dashboard
- All errors for team/LOB, filterable.
- SLA compliance %, average time-to-close, overturn rate by auditor (for coaching/calibration purposes).
- Escalations requiring attention.
- Unmapped-error queue (if applicable).

### 12.3 Operations Manager Dashboard
- All errors where their team is the owner.
- Rebuttal status, aging, historical trend for their team.

### 12.4 Leadership / Governance Dashboard
- Cross-LOB aggregate view: open/closed counts, aging distribution, overturn rate, recurring category trends, SLA compliance, client-impact-flagged errors.
- Filters: date range, LOB, category, severity, site/geography.
- Export: PDF (formatted report) and Excel (raw filtered data extract) for QBR/BRM use.

### 12.5 Business Rules
- BR-10.1: Dashboard data is near-real-time (see NFRS for refresh/latency target) — not a nightly batch.
- BR-10.2: All dashboard views respect RBAC scope; a QA Lead cannot see another LOB's data unless explicitly granted cross-LOB access.
- BR-10.3: Exports are logged in the audit trail (who exported what data, when) given the sensitivity of quality/performance data.

---

## 13. M11 — Audit Trail

### 13.1 What Is Logged
Every one of the following is an immutable, timestamped, user-attributed audit entry:
- Error creation, edits (pre-submission draft edits are not required to be logged individually, but the final submission is)
- Every status transition
- Every notification sent (and delivery success/failure)
- Every evidence upload/view/download
- Every rebuttal submission
- Every QA decision
- Every reopen action (with reason)
- Every admin configuration change (category, SLA, ownership mapping, escalation rule edits)
- Every report export

### 13.2 Business Rules
- BR-11.1: Audit records are append-only; no update or delete operation is exposed to any role, including Admin, through the application layer.
- BR-11.2: Every error record has a "History" tab showing its full timeline in chronological order, visible to all roles with read access to that record (redacted for Internal Notes if the viewer is an Operations role).

---

## 14. M12 — RBAC / User & Role Management

*(Full matrix in the dedicated RBAC document; functional summary here.)*

- Roles (Phase 1 baseline): QA Auditor, QA Lead/Manager, Operations Agent, Operations Manager, QA Leadership/Governance, System Admin, (read-only) Compliance/Audit Reviewer.
- A user can hold multiple roles; effective permission = union of role permissions, scoped by LOB/team assignment.
- Role assignment and LOB-scoping is managed in the Admin Console (M13) and itself audit-logged (M11).

---

## 15. M13 — Admin Configuration Console

### 15.1 Configurable Entities
- LOBs and LOB codes
- Error categories and sub-categories (per LOB)
- Severity levels (fixed enum in Phase 1: Critical/High/Medium/Low — relabeling allowed, adding new levels is a schema change, not a config change)
- Ownership mapping (LOB × Category → default owner team/role)
- SLA windows (Severity × Category → rebuttal window, decision window)
- Escalation matrix (per LOB: levels, recipients, time thresholds)
- Notification templates (subject/body per NT-code, with token placeholders e.g. `{QAErrorID}`, `{Category}`, `{DueDate}`)
- Evidence rules (allowed file types, size limits, mandatory-evidence severity threshold)
- Working-hours/holiday calendar per region (for SLA business-day calculation)
- Role-permission matrix overrides (within the bounds defined in the RBAC document)

### 15.2 Business Rules
- BR-13.1: All configuration changes are versioned — the system retains prior configuration values for audit purposes (e.g., "SLA for Critical/Billing was 1 day until {date}, changed to 2 days by {admin}").
- BR-13.2: Configuration changes do not retroactively alter already-open errors' SLA calculations (an error's SLA is locked at the value in effect when it was logged), to avoid unfair/confusing aging shifts.

---

## 16. M14 — Extensibility Service Layer (AI-Readiness, Phase 1 = rule-based)

Per PRD Section 5 (#13) and the explicit direction to defer AI to Phase 2, Phase 1 implements the following as **internal services with stable contracts**, using deterministic/rule-based logic (not ML/AI):

| Service | Phase 1 Implementation | Phase 2 Swap-in Candidate |
|---|---|---|
| Categorization Suggestion Service | Returns category suggestions based on simple keyword/LOB rule mapping (or no suggestion — auditor selects manually) | ML/NLP-based category prediction from free-text description |
| Duplicate Detection Service | Rule-based check: same Transaction Reference ID + overlapping date range + same LOB flags a possible duplicate for auditor confirmation | Semantic similarity search across descriptions/evidence |
| Summarization Service | No-op in Phase 1 (full text shown as-is) | LLM-based summarization of long rebuttal threads for QA reviewers |
| Recurring Pattern / Analytics Service | Standard aggregate SQL-based trend reports (counts by category/owner/time) | Predictive/anomaly-detection analytics on recurring defects |

- BR-14.1: These services must be called through a defined internal API contract (see API Design doc) so that swapping the underlying implementation (rule-based → AI-based) requires no changes to calling modules (M2, M5, M10).
- BR-14.2: Phase 1 launch has zero external AI/ML service dependency — the platform must be fully functional and demonstrable without any AI component provisioned or funded.

---

## 17. Cross-Module Notification Template Reference (Summary)

| Code | Trigger | Key Tokens |
|---|---|---|
| NT-01 | Error logged | `{QAErrorID}`, `{Category}`, `{Severity}`, `{DueDate}`, `{Link}` |
| NT-02 | Owner opens/acknowledges | `{QAErrorID}`, `{OwnerName}`, `{Timestamp}` |
| NT-03 | Rebuttal submitted | `{QAErrorID}`, `{RebuttalSummary}`, `{Link}` |
| NT-04 | Accepted | `{QAErrorID}`, `{OwnerName}` |
| NT-05 | SLA breach | `{QAErrorID}`, `{DaysOverdue}`, `{EscalationLevel}` |
| NT-06 | Final decision | `{QAErrorID}`, `{Decision}`, `{Rationale}` |
| NT-07 | Escalation | `{QAErrorID}`, `{EscalationLevel}`, `{Recipients}` |
| NT-08 | Reopened | `{QAErrorID}`, `{ReopenReason}` |

*(Full HTML/text templates to be finalized during Sprint 0 content design; token contract above is binding for API/backend implementation.)*

---

*End of FSD. Next document: Functional Requirements Specification (FRS) — itemized, traceable requirement list.*
