# Functional Requirements Specification (FRS)
## QEMS — Quality Error Management System

| Field | Value |
|---|---|
| Document Version | 1.0 |
| Status | Draft for Review |
| Depends On | PRD v1.0, FSD v1.0 |
| Purpose | Itemized, testable, traceable functional requirements for build and QA sign-off |

---

## 1. Requirement ID Convention

`FR-<ModuleNumber>-<Sequence>` — e.g., `FR-02-005` = Module 2 (Error Logging), requirement 5.

Each requirement includes: Description, Priority (Must/Should/Could — MoSCoW), Source (FSD section), Acceptance Criteria.

Priority definitions:
- **Must (M):** Required for Phase 1 go-live; system is not production-ready without it.
- **Should (S):** Important, targeted for Phase 1 but may slip to an immediate fast-follow release without blocking go-live.
- **Could (C):** Desirable, only built if time/budget allows within Phase 1.

---

## 2. Module 1 — Authentication & Session

| ID | Requirement | Priority | Acceptance Criteria |
|---|---|---|---|
| FR-01-001 | System shall authenticate users via enterprise SSO (SAML2/OIDC) | M | User cannot access any module without a valid SSO session; direct URL access redirects to IdP login |
| FR-01-002 | System shall auto-provision a user record on first successful SSO login with default role "Unassigned" | M | New SSO user appears in Admin user list within the same session; has zero module access until role assigned |
| FR-01-003 | System shall enforce configurable session timeout (default 30 min inactivity) | M | Session expires after configured inactivity; user is redirected to re-authenticate |
| FR-01-004 | System shall immediately revoke access for deactivated users | M | Deactivated user's active session is terminated within 5 minutes; subsequent requests return 401/redirect to login |
| FR-01-005 | System shall support a user holding multiple roles simultaneously | M | User assigned QA Auditor + QA Lead sees the union of both roles' permitted actions |

---

## 3. Module 2 — Error Logging

| ID | Requirement | Priority | Acceptance Criteria |
|---|---|---|---|
| FR-02-001 | System shall present a structured error logging form with all fields defined in FSD §4.2 | M | All mandatory fields present; conditional fields (sub-category, evidence) appear/require correctly based on prior selections |
| FR-02-002 | System shall validate all mandatory fields client-side and server-side before persisting a record | M | Submitting with a missing mandatory field is rejected with field-level error, both with JS disabled (server) and enabled (client) |
| FR-02-003 | System shall reject a Date of Occurrence in the future | M | Selecting/entering a future date blocks submission with inline error |
| FR-02-004 | System shall reject a Date of Audit/Detection earlier than Date of Occurrence | M | Attempting this combination blocks submission with inline error |
| FR-02-005 | System shall require at least one evidence attachment when Severity is Critical or High (unless Admin has disabled this rule) | M | Submitting a Critical/High severity error with zero attachments is blocked, per current Admin config |
| FR-02-006 | System shall support saving an incomplete form as Draft, visible only to its creator | S | Draft saved mid-form is retrievable later by the same user; not visible to any other user; excluded from all SLA/aging/reporting calculations |
| FR-02-007 | System shall be idempotent against duplicate submission from double-click or network retry | M | Rapid double-submit of the same form (same idempotency token) creates exactly one error record |
| FR-02-008 | System shall retain the LOB/Category label as a historical snapshot even if the live config entry is later removed | S | Deleting a Category in Admin console does not alter or break previously logged records referencing it |
| FR-02-009 | System shall flag records where the logging auditor is also the identified owner, for QA Lead visibility | C | Self-flagged record appears in a distinct filter/tag on the QA Lead dashboard |

---

## 4. Module 3 — QA Error ID Generation

| ID | Requirement | Priority | Acceptance Criteria |
|---|---|---|---|
| FR-03-001 | System shall generate a unique QA Error ID in format `QE-{LOBCODE}-{YYYY}-{SEQ6}` upon successful submission | M | Every submitted (non-draft) error has exactly one, unique, correctly formatted ID |
| FR-03-002 | System shall guarantee no duplicate ID is generated under concurrent submission load | M | Load test: N concurrent submissions for the same LOB/year produce N unique sequential IDs with zero collisions |
| FR-03-003 | System shall never allow an assigned QA Error ID to be edited, reused, or hard-deleted | M | No UI or API path exists to modify/delete an ID; attempting via direct API call returns authorization/validation error |
| FR-03-004 | Sequence shall reset per LOBCODE per calendar year | S | First error logged for a LOB on Jan 1 of a new year receives `SEQ6 = 000001` |

---

## 5. Module 4 — Ownership Resolution & Notification

| ID | Requirement | Priority | Acceptance Criteria |
|---|---|---|---|
| FR-04-001 | System shall resolve ownership to a named individual if provided at logging time | M | Error record's "Owner" field matches the individual selected on the form |
| FR-04-002 | System shall resolve ownership via the Admin-configured Ownership Mapping Table when no individual is named | M | Error logged with LOB=X, Category=Y routes to the team/role configured for X/Y |
| FR-04-003 | System shall route to an "Unmapped Errors" queue and notify QA Admin/QA Lead when no mapping exists for the LOB/Category combination | M | Logging an error for an LOB/Category with no configured mapping never fails silently — it appears in the Unmapped queue and triggers a notification |
| FR-04-004 | System shall send an email + in-app notification to the resolved owner (and CC their manager) immediately upon error logging | M | Notification is dispatched within the latency target defined in NFRS; email content matches template NT-01 with correct token substitution |
| FR-04-005 | System shall log and surface any notification delivery failure (bounce/undeliverable) to the QA Lead dashboard | M | Simulated bounce results in a visible alert; failure is recorded in the audit trail |
| FR-04-006 | System shall maintain an in-app notification center mirroring all email notifications, independent of email delivery status | S | In-app notification appears even if the corresponding email fails to deliver |

---

## 6. Module 5 — Rebuttal Workflow

| ID | Requirement | Priority | Acceptance Criteria |
|---|---|---|---|
| FR-05-001 | System shall present Accept / Rebut options to the resolved owner while status is `OPEN_PENDING_ACK` or `OPEN_PENDING_RESPONSE` | M | Owner viewing an eligible error sees both actions; a user who is not the owner does not see these actions |
| FR-05-002 | System shall require a mandatory justification (min. 20 characters) for a Rebut action | M | Submitting Rebut with fewer than 20 characters, or empty, is blocked with inline error |
| FR-05-003 | System shall reject a rebuttal justification that is identical to the original error description | S | Submitting an exact copy of the original description as rebuttal is blocked with a validation message |
| FR-05-004 | System shall allow the owner to attach evidence to a rebuttal, stored distinctly from the auditor's original evidence | M | Rebuttal evidence appears in a separate, clearly labeled section of the record; original evidence is untouched |
| FR-05-005 | System shall auto-transition status to `SLA_BREACHED_ESCALATED` when no owner action occurs within the configured SLA window | M | Error with elapsed time ≥ 100% of SLA window and no action automatically changes status and triggers NT-05/NT-07 |
| FR-05-006 | System shall prevent a submitted rebuttal from being edited by the owner | M | Owner has no edit action available on a submitted rebuttal; only QA Lead/Auditor "Reopen" can allow resubmission |
| FR-05-007 | System shall permit only one active rebuttal cycle at a time unless explicitly reopened by QA Lead | M | A second rebuttal attempt without a logged Reopen action is blocked |

---

## 7. Module 6 — QA Final Decision Workflow

| ID | Requirement | Priority | Acceptance Criteria |
|---|---|---|---|
| FR-06-001 | System shall present Upheld / Overturned / Partially Upheld decision options to QA Auditor/Lead once status is `REBUTTAL_SUBMITTED_PENDING_QA_REVIEW` or `ACCEPTED_PENDING_CLOSURE` | M | Decision options visible only to authorized roles at the correct status |
| FR-06-002 | System shall require a mandatory rationale (min. 20 characters) for every decision | M | Attempting to save a decision without rationale is blocked, server-side enforced |
| FR-06-003 | System shall restrict decisions on `ACCEPTED_PENDING_CLOSURE` records to "Upheld" only, unless the record is first reopened | M | Attempting "Overturned" directly on an accepted-without-rebuttal record is blocked |
| FR-06-004 | System shall move the record to read-only (except Reopen action) immediately upon decision save | M | No field on a closed record is editable by any role except an authorized Reopen |
| FR-06-005 | System shall send closure notifications (NT-06) immediately upon decision save, not on a batch delay | M | Notification dispatch timestamp is within the latency target of decision save timestamp |
| FR-06-006 | System shall allow only QA Lead/Manager roles to Reopen a closed or decided record, with mandatory reason | M | Reopen action is unavailable to QA Auditor, Operations roles; requires non-empty reason field; action is audit-logged |

---

## 8. Module 7 — Evidence Management

| ID | Requirement | Priority | Acceptance Criteria |
|---|---|---|---|
| FR-07-001 | System shall accept uploads only of Admin-configured allowed file types | M | Uploading a disallowed file type is rejected with a clear error message |
| FR-07-002 | System shall enforce max file size and max file count per Admin configuration | M | Exceeding size/count limit is rejected with inline error before upload completes |
| FR-07-003 | System shall store uploader identity, timestamp, associated stage, and checksum for every evidence file | M | Evidence metadata is retrievable and displayed on the record's Evidence tab |
| FR-07-004 | System shall never allow deletion of an evidence file by any role; corrections create a new version, retaining prior versions | M | No delete action exists in UI/API for evidence; re-upload creates version 2 while version 1 remains viewable |
| FR-07-005 | System shall scope evidence visibility by RBAC — Operations roles see only evidence for errors where they are a named party | M | Operations user attempting to access an unrelated error's evidence via direct link receives an authorization error |
| FR-07-006 | System shall log every evidence view/download action in the audit trail | M | Viewing/downloading a file creates a corresponding audit entry with user, timestamp, action |

---

## 9. Module 8 — Status, Aging & SLA Engine

| ID | Requirement | Priority | Acceptance Criteria |
|---|---|---|---|
| FR-08-001 | System shall implement the full status lifecycle exactly as defined in FSD §10.1 | M | Every status transition matches the defined state machine; no undefined/orphan states occur |
| FR-08-002 | System shall calculate SLA windows based on Admin-configured Severity × Category values | M | Changing SLA config for a category affects only newly logged errors, not already-open ones (see FR-13-004) |
| FR-08-003 | System shall calculate aging using a configurable business-hours/holiday calendar per region | M | An error logged in a region with a holiday on the following day correctly excludes that day from elapsed SLA time |
| FR-08-004 | System shall display color-coded aging indicators (Green <70%, Amber 70–99%, Red ≥100%) on all relevant dashboards | M | Dashboard visual state matches computed percentage thresholds in real time |
| FR-08-005 | System shall auto-transition to breached/escalated status the moment the SLA window is exceeded, without requiring manual intervention or batch job delay beyond the defined latency target | M | Verified via time-shifted test data; transition occurs within NFRS-defined processing latency of breach threshold |

---

## 10. Module 9 — Escalation Engine

| ID | Requirement | Priority | Acceptance Criteria |
|---|---|---|---|
| FR-09-001 | System shall notify the configured Level 1 escalation recipient immediately upon SLA breach | M | Escalation notification (NT-07) received by correct recipient at breach moment |
| FR-09-002 | System shall escalate further (Level 2, Level 3) per Admin-configured time thresholds if still unresolved | M | Simulated unresolved error past Level 1 threshold triggers Level 2 notification to correct recipient |
| FR-09-003 | System shall not alter the underlying rebuttal/decision requirement as a result of escalation | M | Escalated error still requires the same rebuttal/decision workflow steps as a non-escalated one |
| FR-09-004 | System shall surface all currently escalated errors in a dedicated Escalations view for QA Leadership | M | Escalations view lists all records in `SLA_BREACHED_ESCALATED` with current escalation level |

---

## 11. Module 10 — Dashboards & Reporting

| ID | Requirement | Priority | Acceptance Criteria |
|---|---|---|---|
| FR-10-001 | System shall provide role-specific dashboards (Auditor, QA Lead/Team, Operations Manager, Leadership/Governance) per FSD §12 | M | Each role, upon login, sees the dashboard variant defined for their role with correct data scope |
| FR-10-002 | System shall allow filtering by date range, LOB, category, severity, and (Leadership view) site/geography | M | Applying filters correctly narrows displayed data set with no errors |
| FR-10-003 | System shall support PDF and Excel export of the currently filtered dashboard/report view | M | Export produces a file matching the on-screen filtered data set |
| FR-10-004 | System shall log every report export action (user, timestamp, filter parameters) in the audit trail | M | Export action generates a corresponding audit entry |
| FR-10-005 | System shall refresh dashboard data within the near-real-time latency defined in the NFRS (not nightly batch) | M | New error/status change is reflected on relevant dashboards within NFRS-defined refresh latency |
| FR-10-006 | System shall restrict dashboard data strictly to the viewer's RBAC scope (no cross-LOB visibility unless explicitly granted) | M | QA Lead for LOB A cannot view LOB B data unless granted cross-LOB access |

---

## 12. Module 11 — Audit Trail

| ID | Requirement | Priority | Acceptance Criteria |
|---|---|---|---|
| FR-11-001 | System shall create an immutable audit entry for every event listed in FSD §13.1 | M | Each listed event type produces exactly one corresponding audit entry with correct actor/timestamp |
| FR-11-002 | System shall expose no update or delete capability on audit records through any interface (UI or API), including for Admin role | M | No endpoint or UI control exists to modify/delete an audit entry; attempted direct API call is rejected |
| FR-11-003 | System shall display a chronological "History" tab per error record, redacting Internal Notes for Operations-role viewers | M | Operations user viewing History tab does not see Internal Notes content; QA/Leadership roles do |

---

## 13. Module 12 — RBAC / User & Role Management

| ID | Requirement | Priority | Acceptance Criteria |
|---|---|---|---|
| FR-12-001 | System shall support the role set defined in the RBAC Matrix document, each with distinct permission sets | M | Each role's permitted/denied actions match the RBAC Matrix exactly, verified via role-based test accounts |
| FR-12-002 | System shall scope roles by LOB/team assignment, restricting data visibility accordingly | M | User assigned to LOB A only cannot view/act on LOB B records absent explicit cross-LOB grant |
| FR-12-003 | System shall audit-log every role/permission assignment change | M | Assigning/removing a role from a user creates a corresponding audit entry |

---

## 14. Module 13 — Admin Configuration Console

| ID | Requirement | Priority | Acceptance Criteria |
|---|---|---|---|
| FR-13-001 | System shall allow Admin role to manage LOBs, categories, sub-categories, ownership mapping, SLA windows, escalation matrix, notification templates, evidence rules, and working-hours calendars | M | Each configurable entity listed in FSD §15.1 has a corresponding Admin UI CRUD screen |
| FR-13-002 | System shall version every configuration change, retaining prior values with change metadata (who/when/old value/new value) | M | Changing an SLA value produces a retrievable history of prior values |
| FR-13-003 | System shall restrict configuration console access to Admin role only | M | Non-Admin roles cannot access configuration screens via UI or direct URL |
| FR-13-004 | System shall NOT retroactively alter SLA calculations for already-open errors when a config value changes | M | Changing Critical/Billing SLA from 1 day to 2 days does not change the due-date/aging of an error already open under the old value |

---

## 15. Module 14 — Extensibility Service Layer

| ID | Requirement | Priority | Acceptance Criteria |
|---|---|---|---|
| FR-14-001 | System shall implement Categorization Suggestion, Duplicate Detection, Summarization, and Analytics as internally callable services with stable, documented contracts | M | Each service is reachable via a defined internal API/interface, independent of its current (rule-based) implementation |
| FR-14-002 | System's Phase 1 implementation of these services shall use deterministic, rule-based logic only, with zero dependency on any external AI/ML service | M | Phase 1 system passes full functional test suite with no AI/ML endpoint provisioned, configured, or reachable |
| FR-14-003 | System shall allow future replacement of a service's internal implementation (e.g., rule-based → AI-based) without requiring changes to calling modules (M2, M5, M10) | M | Swapping the underlying implementation behind the documented contract requires no code change in calling modules (verified structurally in the API/Architecture design, testable via contract/interface tests) |
| FR-14-004 | Duplicate Detection Service shall flag possible duplicates (same Transaction Reference ID + overlapping date range + same LOB) for auditor confirmation, without auto-blocking submission | S | Logging a likely-duplicate error surfaces a non-blocking warning with a link to the possible original |

---

## 16. Traceability Summary

| PRD Feature (Section 5) | FSD Module | FRS Requirement Range |
|---|---|---|
| Digital Error Logging | M2 | FR-02-xxx |
| Unique QA Error ID | M3 | FR-03-xxx |
| Stakeholder Notification | M4 | FR-04-xxx |
| Rebuttal Handling | M5 | FR-05-xxx |
| QA Decision Tracking | M6 | FR-06-xxx |
| Evidence Management | M7 | FR-07-xxx |
| Status/Aging Tracking | M8 | FR-08-xxx |
| Ownership & Escalation | M4, M9 | FR-04-xxx, FR-09-xxx |
| Dashboards & Reports | M10 | FR-10-xxx |
| Audit Trail | M11 | FR-11-xxx |
| RBAC | M12 | FR-12-xxx |
| Admin Console | M13 | FR-13-xxx |
| AI-Readiness (rule-based Phase 1) | M14 | FR-14-xxx |

---

*End of FRS. Next document: Non-Functional Requirements Specification (NFRS).*
