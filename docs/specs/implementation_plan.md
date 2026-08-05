# QEMS — Complete Implementation Plan
## Quality Error Management System · End-to-End Build Blueprint

---

## 1. Project Analysis Summary

After deep analysis of all 11 specification documents, here is the complete picture:

| Document | Key Scope | Quality Assessment |
|---|---|---|
| [01-PRD](file:///d:/QA_QEMS/Implementation_specs/01-PRD-Product-Requirements-Document.md) | Business goals, personas, feature set, Phase 1-3 roadmap | ✅ Excellent — clear problem statement, KPIs, scope boundaries |
| [02-FSD](file:///d:/QA_QEMS/Implementation_specs/02-FSD-Functional-Specification-Document.md) | 14 modules, field specs, business rules, notification triggers | ✅ Excellent — detailed edge cases, template tokens |
| [03-FRS](file:///d:/QA_QEMS/Implementation_specs/03-FRS-Functional-Requirements-Specification.md) | 55+ itemized testable requirements with acceptance criteria | ✅ Strong — MoSCoW prioritized, traceable |
| [04-NFRS](file:///d:/QA_QEMS/Implementation_specs/04-NFRS-Non-Functional-Requirements-Specification.md) | Performance, security, scalability, monitoring targets | ✅ Strong — quantified targets |
| [05-RBAC-Matrix](file:///d:/QA_QEMS/Implementation_specs/05-RBAC-Matrix.md) | 8 roles, permission matrices, field-level redaction rules | ✅ Comprehensive |
| [06-Workflow-State-Machine](file:///d:/QA_QEMS/Implementation_specs/06-Workflow-State-Machine.md) | 10 states, 17 transitions, guard conditions, Mermaid diagram | ✅ Excellent — complete state machine |
| [07-Database-Schema](file:///d:/QA_QEMS/Implementation_specs/07-Database-Schema.md) | 22 PostgreSQL tables, indexes, capacity projections | ✅ Production-grade design |
| [08-REST-API-Design](file:///d:/QA_QEMS/Implementation_specs/08-REST-API-Design.md) | Full REST API with FastAPI/Pydantic, extensibility contracts | ✅ Well-structured |
| [09-System-Architecture](file:///d:/QA_QEMS/Implementation_specs/09-System-Architecture.md) | Modular monolith, deployment view, security architecture | ✅ Sound decisions |
| [10-UIUX-Wireframe-Specification](file:///d:/QA_QEMS/Implementation_specs/10-UIUX-Wireframe-Specification.md) | Screen-by-screen specs for 12+ screens, responsive behavior | ✅ Good — layout & interaction defined |
| [11-Sprint-Implementation-Plan](file:///d:/QA_QEMS/Implementation_specs/11-Sprint-Implementation-Plan.md) | Sprint 0-9 + Hypercare, sequencing rationale | ⚠️ Good structure but needs granular checklists |

---

## 2. Identified Gaps & Improvement Areas

> [!IMPORTANT]
> These are the areas where the current specs need enhancement or have gaps that could cause issues during implementation.

### 2.1 Specification-Level Gaps

| # | Gap | Severity | Current State | Recommendation |
|---|---|---|---|---|
| G1 | **No Project-Level Isolation for Error Logs** | 🔴 High | Error logs are flat — all projects/LOBs share a single view. An error or failure in one project's logs can create noise/confusion for other projects. | **Add per-project isolated error log views** — separate log streams, dashboards, and filtering per LOB/project so that issues in one project don't bleed into another's monitoring space. (User's explicit requirement) |
| G2 | **No Application Error/Debug Logging Strategy** | 🔴 High | NFRS mentions structured logging (NFR-MAINT-04) but no schema, format, correlation ID pattern, or per-project separation is defined | Define a complete application logging architecture with per-project log streams, structured JSON format, correlation IDs, and log levels |
| G3 | **No API Versioning Migration Strategy** | 🟡 Medium | API Design says v1, mentions v2 for breaking changes, but no strategy for maintaining backwards compatibility during transitions | Document a deprecation & migration strategy |
| G4 | **Missing Pagination for Audit Trail/History** | 🟡 Medium | History tab and audit_log queries have no pagination spec — for long-lived records, these could become very large | Add pagination to `GET /errors/{id}/history` and audit-related endpoints |
| G5 | **No Bulk Operations** | 🟡 Medium | No bulk accept, bulk close, bulk reassign APIs — QA Leads managing 50+ errors will face friction | Add bulk action endpoints for QA Lead/Manager workflows |
| G6 | **No Search / Full-Text Search Spec** | 🟡 Medium | UI Wireframe mentions "global search (optional Phase 1.1)" but no spec exists | Define at least a basic search across QA Error IDs, descriptions, transaction references |
| G7 | **No Data Migration Plan from Legacy** | 🟡 Medium | PRD mentions replacing manual trackers but no import/migration path is specified | Define a one-time import tool for legacy Excel/SharePoint data |
| G8 | **Notification Template Testing/Preview** | 🟢 Low | FSD defines 8 templates but no test-send or preview mechanism beyond the admin screen | Add a "Send Test" button in admin notification template screen |
| G9 | **No Soft Delete / Archive for Errors** | 🟢 Low | Errors are never deleted (correct), but after 3+ years, there's no archive/cold-storage mechanism | Define an archival strategy for records past retention |
| G10 | **Missing Real-Time Updates (WebSocket/SSE)** | 🟢 Low | Dashboards rely on polling for near-real-time, but no WebSocket/SSE spec exists | Consider SSE for dashboard data push in a future sprint |

### 2.2 Per-Project Error Log Isolation (User's Key Requirement)

> [!CAUTION]
> **Current Problem:** All error/system logs are commingled. If a bug or error occurs in the context of one project (LOB), its application logs, error traces, and debug output could interfere with or be confused with another project's data.

**Proposed Solution — Project-Scoped Error Log Isolation:**

1. **Separate Application Log Streams per Project/LOB:**
   - Every application log entry will include a `project_id` / `lob_id` tag
   - Logs can be filtered, viewed, and exported per project
   - Error/exception logs in one project's context are completely isolated from others

2. **Per-Project Error Log Dashboard (New Admin Screen):**
   - New route: `/admin/system-logs/{lob_id}`
   - Shows application errors, exceptions, API failures, and system events scoped to a specific project
   - Separate log views so an issue in "Billing" project doesn't pollute "Claims" project's log view
   - Filterable by: log level (ERROR, WARN, INFO, DEBUG), date range, module, user

3. **Database Changes:**
   - New table: `application_error_logs` with `lob_id` as a required column
   - New table: `system_health_log` per-project health tracking
   - All existing audit/error/notification logs already have `error_id` → `lob_id` traceability; we add explicit project-scoped views/queries

4. **Technical Implementation:**
   - Structured logging middleware adds `project_context` to every log entry
   - Log aggregation backend (ELK/Azure Monitor) uses project tags for stream separation
   - Separate log indices or filtered views per project
   - Health-check endpoints become project-aware

---

## 3. Architecture Decisions Confirmed

| Decision | Rationale |
|---|---|
| **Modular Monolith** (not microservices) | Phase 1 scale (~800 errors/day) doesn't justify microservice overhead |
| **React SPA + FastAPI + PostgreSQL** | Standard enterprise stack, team familiarity assumed |
| **Redis** for cache/queue | Session caching, Celery broker, config caching |
| **Blob Storage** for evidence | Decoupled from DB, lifecycle policies, scalable |
| **Per-Project Log Isolation** | Prevents cross-project log contamination (new requirement) |

---

## 4. End-to-End Implementation Phases

> [!NOTE]
> The original sprint plan has been reorganized into **6 clear phases** with granular checklists. Every item is tracked. Nothing is missed.

---

### 🏗️ PHASE 0 — Foundations & Governance (Weeks 1–2)

**Goal:** Environment setup, governance sign-off, zero user-facing features.

#### Governance Tasks
- [ ] Finalize error categories and sub-categories list with QA Governance
- [ ] Finalize severity level definitions (Critical/High/Medium/Low)
- [ ] Define ownership mapping (LOB × Category → Team/Role)
- [ ] Define SLA windows per Severity × Category combination
- [ ] Define escalation matrix (levels, recipients, time thresholds per LOB)
- [ ] Confirm evidence file types, size limits, and retention duration per enterprise policy
- [ ] Get sign-off document from QA Governance on all above items

#### Infrastructure & DevOps
- [ ] Create Git repository with branch strategy (main/develop/feature branches)
- [ ] Set up CI/CD pipeline skeleton (lint → test → build → deploy stages)
- [ ] Provision Dev environment
- [ ] Provision UAT/Staging environment
- [ ] Provision Production environment (or at minimum, reserve resources)
- [ ] Provision PostgreSQL instance (Primary) for Dev
- [ ] Provision PostgreSQL Read Replica for Dev
- [ ] Provision Redis instance for Dev
- [ ] Provision Blob Storage container/bucket for Dev
- [ ] Set up infrastructure-as-code templates (Terraform/Pulumi/ARM)
- [ ] Configure Docker base images for API and Worker services
- [ ] Set up Kubernetes manifests / Helm charts for deployment
- [ ] Configure monitoring/alerting pipeline (logs → SIEM integration)

#### Backend Foundations
- [ ] Initialize FastAPI project structure with modular layout:
  ```
  backend/
  ├── app/
  │   ├── api/v1/           # Route handlers
  │   ├── core/             # Config, security, dependencies
  │   ├── models/           # SQLAlchemy models
  │   ├── schemas/          # Pydantic schemas
  │   ├── services/         # Business logic layer
  │   ├── repositories/     # Data access layer
  │   ├── workers/          # Celery tasks
  │   └── utils/            # Helpers
  ├── migrations/           # Alembic migrations
  └── tests/
  ```
- [ ] Configure Alembic for database migrations
- [ ] Create initial migration: foundational tables (`users`, `roles`, `lobs`, `categories`, `sub_categories`, `user_roles`)
- [ ] Seed the 8 fixed roles into `roles` table via migration
- [ ] Set up Pydantic v2 base schemas and error envelope format
- [ ] Configure structured JSON logging with correlation IDs
- [ ] **Set up per-project log stream tagging** (new requirement)
- [ ] Configure CORS, rate limiting middleware

#### Frontend Foundations
- [ ] Initialize React project with TypeScript
- [ ] Set up design system: color tokens, typography (Inter/Roboto), component library
- [ ] Define status badge color mapping as shared design tokens:
  - Open/Pending = blue-gray
  - Amber SLA = amber
  - Breached/Escalated = red
  - Closed-Upheld = gray
  - Closed-Overturned = green
  - Closed-Partial = teal
- [ ] Set up React Router with role-based route guards
- [ ] Create global app shell component (top bar, left nav, main content area, footer)
- [ ] Set up API client layer (axios/fetch with JWT interceptor)
- [ ] Configure i18n framework for string externalization (English only, but ready for future localization)

#### Auth Spike
- [ ] SSO/OIDC integration spike against enterprise IdP (test env)
- [ ] Document IdP configuration requirements
- [ ] Test SAML2/OIDC callback flow end-to-end in Dev

#### Phase 0 Exit Criteria
- [ ] Governance sign-off document obtained
- [ ] Dev environment fully deployable
- [ ] SSO login functional in Dev
- [ ] CI pipeline runs lint + unit test stage on scaffold
- [ ] Per-project log tagging infrastructure verified

---

### 🔐 PHASE 1 — Core Platform: Auth, RBAC, Admin & Error Logging (Weeks 3–6)

**Goal:** Users can log in, admins can configure the system, auditors can log errors.

#### Sprint 1 (Weeks 3–4): Auth, RBAC & Admin Skeleton

##### Backend — Authentication (M1)
- [ ] Implement `POST /auth/sso/callback` — SSO code exchange → JWT issuance
- [ ] Implement JIT user provisioning on first SSO login (default role: UNASSIGNED)
- [ ] Implement `POST /auth/refresh` — JWT refresh token rotation
- [ ] Implement `POST /auth/logout` — session/token invalidation
- [ ] Implement `GET /auth/me` — current user profile, roles, LOB scopes
- [ ] Implement configurable session timeout (default 30 min inactivity)
- [ ] Implement force-revocation for deactivated users (within 5 min)
- [ ] Unit tests: FR-01-001 through FR-01-005 coverage

##### Backend — RBAC (M12)
- [ ] Implement RBAC middleware/decorator for route-level permission checks
- [ ] Implement role-permission resolution (union of all assigned roles)
- [ ] Implement LOB-scope filtering on all data queries
- [ ] Implement field-level redaction (internal_notes excluded for OPS_AGT/OPS_MGR at serialization layer)
- [ ] Implement multi-role resolution rules (BR-RBAC-1 through BR-RBAC-4)
- [ ] Unit tests: FR-12-001 through FR-12-003 coverage

##### Backend — Admin Console APIs (M13 — partial)
- [ ] Implement `GET/POST/PATCH /admin/lobs` — LOB CRUD
- [ ] Implement `GET/POST/PATCH /admin/categories` — Category CRUD (nested under LOB)
- [ ] Implement `GET/POST/PATCH /admin/sub-categories` — Sub-category CRUD
- [ ] Implement `GET/PATCH /admin/users` — User list, activate/deactivate
- [ ] Implement `GET/POST/DELETE /admin/users/{user_id}/roles` — Role assignment with LOB scope
- [ ] Implement config-change-history middleware (auto-captures old/new values on all admin mutations)
- [ ] Audit logging for all role/permission assignment changes
- [ ] Unit tests for admin endpoints

##### Frontend — App Shell & Auth
- [ ] Implement login screen (SSO-only button, no password fields)
- [ ] Implement "Pending Access" screen for unassigned users
- [ ] Implement role-based navigation (RBAC-filtered left nav menu items)
- [ ] Implement JWT storage, auto-refresh, and session timeout handling
- [ ] Implement notification bell icon placeholder (UI shell only, wiring in Phase 2)

##### Frontend — Admin Console (partial)
- [ ] Implement Users & Roles management screen (search, role chips, assign/revoke modal)
- [ ] Implement LOBs management screen (table, add/edit/deactivate)
- [ ] Implement Categories management screen (tree view: LOB → Categories → Sub-categories)
- [ ] Implement role-guard: Admin screens accessible only to ADMIN role

##### Sprint 1 Exit Criteria
- [ ] Test user can SSO-login
- [ ] Admin can assign each of 8 roles
- [ ] Each role sees correctly RBAC-filtered navigation
- [ ] LOBs/Categories can be created and managed

---

#### Sprint 2 (Weeks 5–6): Config Console Completion & Error Logging

##### Backend — Admin Console APIs (M13 — remaining)
- [ ] Implement `GET/POST /admin/ownership-mapping` — versioned (new row, not in-place edit)
- [ ] Implement `GET/POST /admin/sla-rules` — versioned, per Severity × Category
- [ ] Implement `GET/POST /admin/escalation-matrix` — per LOB, multi-level
- [ ] Implement `GET/PATCH /admin/notification-templates` — edit with version increment
- [ ] Implement `GET/POST /admin/working-hours` — per-region business hours
- [ ] Implement `GET/POST /admin/holidays` — holiday calendar
- [ ] Implement evidence rules configuration API (file types, size limits, mandatory-evidence severity)
- [ ] Implement `GET /admin/config-history` — config change audit view
- [ ] FR-13-001 through FR-13-004 coverage

##### Backend — Error Logging (M2) & QA Error ID (M3)
- [ ] Implement `POST /errors` — full error creation with all fields from FSD §4.2
- [ ] Implement QA Error ID generation: `QE-{LOBCODE}-{YYYY}-{SEQ6}` format
  - [ ] Atomic sequence generation (DB sequence or advisory lock)
  - [ ] Per-LOBCODE per-year sequence reset
  - [ ] Thread-safety under concurrent submissions
- [ ] Implement all field validations:
  - [ ] Mandatory field enforcement (client + server)
  - [ ] Date of Occurrence ≤ today
  - [ ] Date of Detection ≥ Date of Occurrence
  - [ ] Description min 20 chars, max 4000 chars
  - [ ] Evidence mandatory for Critical/High severity (admin-configurable)
  - [ ] Transaction reference: alphanumeric, 3-50 chars
- [ ] Implement idempotent submission (idempotency key, FR-02-007)
- [ ] Implement Save as Draft (status `DRAFT`, visible only to creator)
- [ ] Implement `PATCH /errors/{id}/draft` — update draft
- [ ] Implement `POST /errors/{id}/submit` — transition T2 (Draft → Open)
- [ ] Implement self-flagged detection (auditor = owner, FR-02-009)
- [ ] Implement historical snapshot of LOB/Category labels (FR-02-008)
- [ ] SLA window snapshot onto error record at creation (FR-13-004)
- [ ] Initial audit trail entry on error creation
- [ ] FR-02-001 through FR-02-009, FR-03-001 through FR-03-004 coverage

##### Frontend — Admin Console (remaining)
- [ ] Implement Ownership Mapping screen (LOB × Category → Team, versioning UX)
- [ ] Implement SLA Rules screen (Severity × Category → hours, versioning UX)
- [ ] Implement Escalation Matrix screen (per-LOB ordered levels)
- [ ] Implement Notification Templates screen (edit subject/body, live token preview)
- [ ] Implement Evidence Rules screen (file types checklist, size/count config)
- [ ] Implement Working Hours & Holidays screens (per-region config)
- [ ] Implement Configuration Change History screen (read-only audit view)

##### Frontend — Error Logging Form
- [ ] Implement "Log New Error" form with all sections:
  - [ ] Section A — Classification (LOB dropdown → dependent Category → Sub-category, Severity control)
  - [ ] Section B — Transaction Details (reference ID, user picker, date pickers with validation)
  - [ ] Section C — Finding (rich text description with char counter, root cause dropdown, impact toggle, internal notes)
  - [ ] Section D — Evidence (drag-drop upload, dynamic required indicator for Critical/High)
- [ ] Implement real-time form validation (not just on submit)
- [ ] Implement Save as Draft button
- [ ] Implement Submit with inline validation summary banner
- [ ] Implement post-submit success toast with QA Error ID
- [ ] Implement auto-redirect to new error detail screen
- [ ] Implement duplicate detection warning display (non-blocking)

##### Sprint 2 Exit Criteria
- [ ] Auditor can log a complete error via UI
- [ ] Correct QA Error ID generated
- [ ] Config changes are versioned
- [ ] Config changes don't retroactively affect open records
- [ ] Draft save/resume works

---

### 🔄 PHASE 2 — Workflow Engine: Notifications, Rebuttal, Decision (Weeks 7–12)

**Goal:** Complete error lifecycle — Log → Notify → Rebut/Accept → Decide → Close → Reopen.

#### Sprint 3 (Weeks 7–8): Ownership, Notifications & Evidence

##### Backend — Ownership Resolution (M4)
- [ ] Implement ownership resolution logic:
  - [ ] Individual owner if specified at logging time
  - [ ] Team queue via Ownership Mapping Table (LOB + Category)
  - [ ] Unmapped Errors queue if no mapping exists (with notification to QA Admin)
- [ ] FR-04-001 through FR-04-003 coverage

##### Backend — Notification System (M4)
- [ ] Implement background worker (Celery) for notification dispatch
- [ ] Implement email notification via SMTP/Outlook/Exchange relay
- [ ] Implement NT-01 template rendering with token substitution
- [ ] Implement NT-02 through NT-08 template rendering
- [ ] Implement notification delivery status tracking (QUEUED → SENT → DELIVERED/FAILED/BOUNCED)
- [ ] Implement delivery failure logging + QA Lead dashboard alert
- [ ] Implement `POST /internal/webhooks/email-delivery-status` callback
- [ ] Implement in-app notification system:
  - [ ] `in_app_notifications` table write on every notification event
  - [ ] `GET /notifications` — list notifications for current user
  - [ ] `PATCH /notifications/{id}/read` — mark as read
  - [ ] `POST /notifications/mark-all-read` — mark all as read
- [ ] FR-04-004 through FR-04-006 coverage

##### Backend — Evidence Management (M7)
- [ ] Implement `POST /errors/{error_id}/evidence` — multipart upload
  - [ ] File type validation against admin config
  - [ ] File size validation (max 25 MB per file)
  - [ ] File count validation (max 10 per party)
  - [ ] SHA-256 checksum computation
  - [ ] Blob storage upload
  - [ ] Malware scan integration hook (`malware_scan_status = PENDING`)
- [ ] Implement `GET /errors/{error_id}/evidence` — list with RBAC scoping
- [ ] Implement `GET /evidence/{id}/download` — stream file / signed URL
  - [ ] Block download if `malware_scan_status != CLEAN`
  - [ ] Log VIEW/DOWNLOAD in `evidence_access_log`
- [ ] Implement `POST /evidence/{id}/supersede` — version replacement (never delete)
- [ ] Implement `POST /internal/webhooks/malware-scan-result` — scan status callback
- [ ] Explicitly: NO DELETE endpoint for evidence (intentionally absent)
- [ ] FR-07-001 through FR-07-006 coverage

##### Frontend — Notifications
- [ ] Implement notification bell dropdown with unread badge
- [ ] Implement notification list (read/unread distinction, click-through to error)
- [ ] Implement "Mark all as read" action
- [ ] Real-time badge update (polling or SSE)

##### Frontend — Evidence
- [ ] Implement Evidence tab on Error Detail screen
- [ ] Implement drag-drop file upload component
- [ ] Implement upload progress indicator
- [ ] Implement file chips (name, size, type icon, scan status spinner)
- [ ] Implement "Scanning..." disabled state for pending scans
- [ ] Implement version history (collapsed prior versions)
- [ ] Implement RBAC-scoped evidence visibility

##### Sprint 3 Exit Criteria
- [ ] Error logging triggers real email to correct owner within 60s
- [ ] Evidence upload, scan, and download flow works end-to-end
- [ ] In-app notifications mirror email notifications
- [ ] Delivery failures surface on QA Lead dashboard

---

#### Sprint 4 (Weeks 9–10): Rebuttal Workflow & SLA Engine

##### Backend — Rebuttal Workflow (M5)
- [ ] Implement `POST /errors/{id}/acknowledge` — transition T4 (idempotent)
- [ ] Implement `POST /errors/{id}/accept` — transition T5
  - [ ] RBAC: resolved owner or OPS_MGR for team
  - [ ] Status guard: only from OPEN_PENDING_ACK, OPEN_PENDING_RESPONSE, SLA_BREACHED_ESCALATED
- [ ] Implement `POST /errors/{id}/rebut` — transition T6
  - [ ] Justification validation: ≥ 20 chars, not identical to original description
  - [ ] Optional evidence attachment
  - [ ] RBAC: resolved owner only
- [ ] Implement rebuttal immutability (no edit after submit, FR-05-006)
- [ ] Implement single-active-cycle rule (FR-05-007)
- [ ] Implement `POST /errors/{id}/rebuttal-correction` — transition T17 (narrow pre-decision correction)
- [ ] FR-05-001 through FR-05-007 coverage

##### Backend — Status/SLA Engine (M8)
- [ ] Implement full status lifecycle (all 10 states from Workflow/State Machine)
- [ ] Implement status transition engine with guard conditions
- [ ] Implement illegal transition rejection at API layer (with logging)
- [ ] Implement SLA window calculation:
  - [ ] Business-hours calendar lookup per region
  - [ ] Holiday exclusion
  - [ ] Elapsed time calculation as percentage of SLA window
- [ ] Implement aging indicator computation (Green < 70%, Amber 70-99%, Red ≥ 100%)
- [ ] Implement SLA breach auto-transition (T7) via background worker:
  - [ ] Polling job every 60 seconds
  - [ ] Query errors with non-terminal status where elapsed ≥ 100% SLA
  - [ ] Auto-transition to SLA_BREACHED_ESCALATED
  - [ ] Fire NT-05 and NT-07 notifications
- [ ] FR-08-001 through FR-08-005 coverage

##### Frontend — Rebuttal Action
- [ ] Implement Accept/Rebut UI in Error Detail Tab 2
- [ ] Implement two distinct action buttons: "Accept" and "Dispute"
- [ ] Accept flow: optional comment → Confirm
- [ ] Dispute flow: mandatory justification (20-char counter) + optional evidence upload
- [ ] Implement duplicate-text pre-check (client-side warning)
- [ ] Implement confirmation modal before submission ("You won't be able to edit...")
- [ ] Implement status badge updates after action

##### Frontend — Error Detail Screen
- [ ] Implement full Error Detail screen with tabs:
  - [ ] Tab 1 — Overview (all fields, read-only, label/value pairs)
  - [ ] Tab 2 — Rebuttal & Decision (inline action forms)
  - [ ] Tab 3 — Evidence (two sections: Auditor / Rebuttal)
  - [ ] Tab 4 — History (audit trail timeline)
- [ ] Implement header band (QA Error ID, status badge, severity chip, aging indicator)
- [ ] Implement conditional action buttons based on role + status
- [ ] Implement Internal Notes redaction for Operations roles

##### Sprint 4 Exit Criteria
- [ ] Error transitions through Open → Accept/Rebut correctly
- [ ] Auto-transitions to SLA-breached on window expiry
- [ ] Business-hours/holiday calendar correctly excludes non-working time
- [ ] Aging indicators show correct color coding

---

#### Sprint 5 (Weeks 11–12): QA Decision, Escalation & Audit Trail

##### Backend — QA Decision (M6)
- [ ] Implement `POST /errors/{id}/decision` — transitions T8/T10/T11/T12
  - [ ] Decision options: UPHELD, OVERTURNED, PARTIALLY_UPHELD
  - [ ] Rationale validation: ≥ 20 chars (server-side enforced)
  - [ ] Partial breakdown required for PARTIALLY_UPHELD
  - [ ] State guard: ACCEPTED_PENDING_CLOSURE → only UPHELD allowed (T9 blocked)
  - [ ] RBAC: AUD (original logger) or QAL (team scope)
- [ ] Implement read-only lock post-decision (FR-06-004)
- [ ] Implement closure notifications (NT-06, immediate, no batch)
- [ ] Implement `POST /errors/{id}/reopen` — transition T15
  - [ ] RBAC: QAL only
  - [ ] Mandatory reason text
  - [ ] Auto-route reopened record to S4 (REBUTTAL_SUBMITTED) via T16
- [ ] FR-06-001 through FR-06-006 coverage

##### Backend — Escalation Engine (M9)
- [ ] Implement multi-level escalation execution:
  - [ ] Level 1: immediate on SLA breach
  - [ ] Level 2/3: additional time thresholds
  - [ ] Per-LOB escalation path from admin config
- [ ] Implement escalation-level increment via background worker (T14)
- [ ] Implement escalation notifications (NT-07 to next-level recipients)
- [ ] Escalation does NOT change underlying workflow requirement
- [ ] FR-09-001 through FR-09-004 coverage

##### Backend — Audit Trail Hardening (M11)
- [ ] Verify audit_log coverage for ALL events from FSD §13.1:
  - [ ] Error creation
  - [ ] Every status transition
  - [ ] Every notification sent (success/failure)
  - [ ] Every evidence upload/view/download
  - [ ] Every rebuttal submission
  - [ ] Every QA decision
  - [ ] Every reopen action (with reason)
  - [ ] Every admin config change
  - [ ] Every report export
- [ ] Implement `GET /errors/{id}/history` — chronological timeline with pagination
- [ ] Verify append-only enforcement (no update/delete at API or DB level)
- [ ] Verify Internal Notes redaction in History tab for Operations roles
- [ ] FR-11-001 through FR-11-003 coverage

##### Frontend — QA Decision UI
- [ ] Implement Decision form in Error Detail Tab 2
  - [ ] Radio cards: Upheld / Overturned / Partially Upheld
  - [ ] Disabled states with tooltips for invalid decisions (Accepted → only Upheld)
  - [ ] Rationale text area (20-char counter)
  - [ ] Partial breakdown field (conditional for Partially Upheld)
  - [ ] "Record Final Decision" button with confirmation modal
- [ ] Implement Reopen action button (QAL-only, reason modal)

##### Frontend — History Tab & Escalations
- [ ] Implement History tab (chronological timeline, plain language descriptions)
- [ ] Implement Escalations view screen (`/escalations`)
  - [ ] Table: QA Error ID, Owner, Escalation Level badge, Time Since Breach
  - [ ] Sort: highest level first, longest breach first

##### Sprint 5 Exit Criteria
- [ ] Complete lifecycle works: Log → Notify → Rebut → Decide → Close → Reopen
- [ ] All 3 decision outcomes work correctly
- [ ] Every step reflected in History tab
- [ ] Multi-level escalation fires correctly
- [ ] Audit trail is 100% complete

---

### 📊 PHASE 3 — Dashboards, Reporting & Project-Scoped Logs (Weeks 13–16)

**Goal:** All dashboards operational, reporting/export working, per-project log isolation implemented.

#### Sprint 6 (Weeks 13–14): Role-Based Dashboards

##### Backend — Dashboard APIs (M10)
- [ ] Implement `GET /dashboards/auditor` — own logged errors, aging, KPIs
- [ ] Implement `GET /dashboards/team` — QAL team view, SLA compliance, overturn rate
- [ ] Implement `GET /dashboards/operations` — OPS_MGR team trend data
- [ ] Wire dashboard queries to PostgreSQL read replica (performance isolation)
- [ ] Implement dashboard data caching strategy (Redis, invalidate on data changes)
- [ ] Ensure all dashboard data respects RBAC scope
- [ ] FR-10-001, FR-10-002, FR-10-005, FR-10-006 coverage

##### Frontend — Dashboards
- [ ] Implement Auditor Dashboard:
  - [ ] KPI stat tiles (Open, Pending Rebuttal, Pending My Decision, Closed)
  - [ ] "Awaiting My Decision" side panel/tab
  - [ ] Filterable data table with sortable columns
  - [ ] Aging indicator bars per error
  - [ ] "+ Log New Error" prominent button
  - [ ] Empty state message
- [ ] Implement QA Lead/Team Dashboard:
  - [ ] LOB selector (multi-LOB users)
  - [ ] KPI tiles: SLA Compliance %, Avg Time to Close, Open Count, Escalated Count, Overturn Rate
  - [ ] "Overturn Rate by Auditor" bar chart
  - [ ] Unmapped Errors queue table with "Route Now" action
  - [ ] Escalations table for this LOB
  - [ ] Full error table (team-scoped)
- [ ] Implement Operations Manager Dashboard:
  - [ ] KPI tiles: Open, Pending Response, Overturn Rate, Avg Response Time
  - [ ] Trend chart: error count by category over time
  - [ ] Table with quick-action buttons (Accept/Rebut in-row)

##### Sprint 6 Exit Criteria
- [ ] Each role sees correct dashboard variant with real data
- [ ] Dashboard data refreshes within near-real-time latency target (≤ 30s)
- [ ] RBAC scope correctly limits data visibility

---

#### Sprint 7 (Weeks 15–16): Leadership Dashboard, Reporting & Project-Scoped Logs

##### Backend — Leadership Dashboard & Export
- [ ] Implement `GET /dashboards/leadership` — cross-LOB aggregates with full filter set
- [ ] Implement `POST /reports/export` — PDF and Excel generation
  - [ ] Async generation for large exports (background worker)
  - [ ] Signed download URL + in-app notification on completion
  - [ ] Audit log entry for every export (who, what, when, filter params)
- [ ] FR-10-003, FR-10-004 coverage

##### Backend — Per-Project Error Log Isolation (NEW)
- [ ] Create `application_error_logs` table:
  ```sql
  CREATE TABLE application_error_logs (
      id BIGSERIAL PRIMARY KEY,
      lob_id UUID FK → lobs(id),
      log_level VARCHAR(10) NOT NULL, -- ERROR, WARN, INFO, DEBUG
      module VARCHAR(50) NOT NULL,
      error_code VARCHAR(50),
      message TEXT NOT NULL,
      stack_trace TEXT,
      correlation_id VARCHAR(100),
      user_id UUID FK → users(id) NULL,
      request_path VARCHAR(500),
      metadata JSONB,
      occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  ```
- [ ] Implement logging middleware that tags every request with `project_context` (lob_id)
- [ ] Implement `GET /admin/system-logs` — paginated, filterable system logs
- [ ] Implement `GET /admin/system-logs/{lob_id}` — project-scoped log view
- [ ] Implement project-scoped log filtering: log level, date range, module, user, error code
- [ ] Implement log export per project (CSV/JSON)
- [ ] Set up per-project log indices in log aggregation backend

##### Frontend — Leadership Dashboard
- [ ] Implement Leadership/Governance Dashboard:
  - [ ] Full filter bar (date range, LOB multi-select, category, severity, geography, client-impact toggle)
  - [ ] KPI tiles: Total Errors, SLA Compliance %, Overturn Rate, Escalation Rate, Client-Impact Count
  - [ ] Charts: Errors by LOB (bar), Trend over time (line), Category distribution (donut/treemap), Aging distribution (stacked bar)
  - [ ] "Export Report" button with format selector and progress indicator
- [ ] Implement Export flow (format selector → progress → download link)

##### Frontend — Per-Project Error Log Viewer (NEW)
- [ ] Implement Admin System Logs screen (`/admin/system-logs`)
  - [ ] Project/LOB selector (tabs or dropdown) for isolated views
  - [ ] Log level filter chips (ERROR, WARN, INFO, DEBUG)
  - [ ] Date range picker
  - [ ] Module filter dropdown
  - [ ] Searchable log entries table with expand-for-detail
  - [ ] Stack trace viewer for error entries
  - [ ] Export logs button (per-project)
- [ ] Implement per-project health status indicators
- [ ] **Crucial:** Ensure one project's errors are completely isolated from another's view

##### Sprint 7 Exit Criteria
- [ ] Leadership can filter, view, and export governance report
- [ ] PDF/Excel export matches on-screen data
- [ ] Per-project error log views are fully isolated
- [ ] System logs for "Billing" project don't appear in "Claims" project's view

---

### 🔬 PHASE 4 — AI-Readiness, Search & Hardening (Weeks 17–18)

**Goal:** Extensibility services wired, security/performance/accessibility validated.

#### Sprint 8 (Weeks 17–18): Extensibility & Hardening

##### Backend — Extensibility Service Layer (M14)
- [ ] Implement `CategorizationSuggestionService` interface + rule-based implementation
  - [ ] Keyword-to-category lookup table (admin-configurable)
  - [ ] Wire into error creation flow via `Depends()`
- [ ] Implement `DuplicateDetectionService` interface + rule-based implementation
  - [ ] Same transaction_reference + overlapping date + same LOB = flag
  - [ ] Non-blocking warning returned to client
- [ ] Implement `SummarizationService` interface + no-op passthrough
  - [ ] Returns original text as-is (placeholder for Phase 2 LLM)
- [ ] Implement `AnalyticsService` interface + SQL-based aggregate implementation
  - [ ] COUNT GROUP BY category, date_trunc('week')
  - [ ] Wire into leadership dashboard
- [ ] Verify all services are called via interface contracts (DI), not direct implementation references
- [ ] Verify zero AI/ML service dependency in Phase 1 build
- [ ] FR-14-001 through FR-14-004 coverage

##### Search (New — Gap G6)
- [ ] Implement basic search API: `GET /search?q=...`
  - [ ] Search across: QA Error IDs, transaction references, descriptions, owner names
  - [ ] PostgreSQL full-text search (tsvector/tsquery) — no external search engine needed at Phase 1 scale
  - [ ] RBAC-scoped results
- [ ] Implement global search bar in UI top bar

##### Security Hardening
- [ ] Security review / penetration test (NFR-SEC-08)
- [ ] Verify TLS 1.2+ on all connections
- [ ] Verify SSO-only auth (no local passwords)
- [ ] Verify RBAC enforcement at API layer (not just UI)
- [ ] Verify data-at-rest encryption (DB + Blob storage)
- [ ] Verify evidence malware scanning integration
- [ ] Verify sensitive field exclusion at serialization layer
- [ ] Verify append-only tables have `REVOKE DELETE` on application DB role
- [ ] Verify session tokens are secure, HttpOnly, time-bound
- [ ] Security sign-off from enterprise InfoSec

##### Performance Hardening
- [ ] Load test: 450 concurrent sessions (1.5x expected peak)
- [ ] Load test: 2,000 error records/day sustained
- [ ] Verify NFR-PERF targets:
  - [ ] Page load ≤ 2.5s at P95
  - [ ] Error submission ≤ 1.5s at P95
  - [ ] Notification dispatch ≤ 60s at P95
  - [ ] Dashboard refresh ≤ 30s
  - [ ] SLA breach detection ≤ 5 min
  - [ ] Report export ≤ 10s at P95
  - [ ] Evidence upload ≤ 8s at P95
  - [ ] API CRUD ≤ 300ms at P95
- [ ] QA Error ID concurrent generation test (N simultaneous → N unique IDs)
- [ ] Database query optimization (EXPLAIN ANALYZE on hot queries)
- [ ] Redis caching verification for config data

##### Accessibility & Usability
- [ ] WCAG 2.1 Level AA automated scan
- [ ] Manual screen-reader spot check
- [ ] Verify responsive layout at Desktop (≥1280px) and Tablet (≥768px)
- [ ] Verify minimum touch target sizes
- [ ] Verify keyboard navigability for all interactive elements
- [ ] Verify error messages are specific and actionable (NFR-UX-05)
- [ ] Verify error logging form completable in < 3 minutes

##### Test Coverage & Quality
- [ ] Verify ≥ 80% automated test coverage on core modules (M2, M3, M5, M6, M8, M9)
- [ ] DR/backup restore drill (NFR-AVAIL-04, NFR-AVAIL-06)
- [ ] Verify zero-downtime deployment strategy (blue-green/rolling)

##### Monitoring & Observability
- [ ] Implement health-check endpoints for all critical services
- [ ] Implement automated monitoring at ≤ 1-minute intervals
- [ ] Implement alerting on SLA-engine or notification-dispatcher failure (within 5 min)
- [ ] Implement ops metrics dashboard (error rate, notification success rate, API latency, escalation counts)
- [ ] **Verify per-project log isolation is working in monitoring stack**

##### Sprint 8 Exit Criteria
- [ ] Security sign-off obtained
- [ ] Load test report meets or exceeds all NFRS targets
- [ ] Accessibility scan passes with no A/AA blockers
- [ ] Test coverage ≥ 80% on core modules
- [ ] Backup restore drill successful
- [ ] All extensibility services wired and verified
- [ ] Per-project monitoring fully operational

---

### 🧪 PHASE 5 — UAT, Training & Go-Live (Weeks 19–20)

**Goal:** User acceptance testing, defect resolution, training, production deployment.

#### Sprint 9 (Weeks 19–20): UAT & Go-Live

##### User Acceptance Testing
- [ ] Prepare UAT test scripts covering all user journeys:
  - [ ] Journey 1: QA Auditor logs a new error
  - [ ] Journey 2: Operations agent accepts an error
  - [ ] Journey 3: Operations agent rebuts an error
  - [ ] Journey 4: QA Auditor upholds an error
  - [ ] Journey 5: QA Auditor overturns an error
  - [ ] Journey 6: QA Auditor partially upholds an error
  - [ ] Journey 7: SLA breach triggers escalation
  - [ ] Journey 8: QA Lead reopens a closed error
  - [ ] Journey 9: Leadership views dashboard and exports report
  - [ ] Journey 10: Admin configures LOB, categories, SLA, ownership
  - [ ] Journey 11: Admin views per-project system error logs (NEW)
- [ ] Execute UAT with QA Governance representatives
- [ ] Execute UAT with representative Operations users
- [ ] Execute UAT with representative Leadership users
- [ ] Defect triage and fix cycle (Must-priority defects resolved)

##### Documentation
- [ ] Admin configuration guide (how to manage LOBs, categories, SLA rules, etc.)
- [ ] End-user quick-start guide — QA Auditor role
- [ ] End-user quick-start guide — Operations Agent role
- [ ] End-user quick-start guide — QA Lead/Manager role
- [ ] End-user quick-start guide — Leadership/Governance role
- [ ] End-user quick-start guide — System Administrator role
- [ ] Per-project error log monitoring guide (NEW)
- [ ] Release notes for Phase 1
- [ ] API documentation (auto-generated from FastAPI/OpenAPI)

##### Training
- [ ] Conduct/record role-based training session — QA Auditors
- [ ] Conduct/record role-based training session — Operations team
- [ ] Conduct/record role-based training session — QA Leads/Managers
- [ ] Conduct/record role-based training session — Leadership
- [ ] Conduct/record role-based training session — System Administrators
- [ ] Distribute training materials

##### Go-Live Preparation
- [ ] Data migration plan (if importing legacy tracker data)
- [ ] Production environment final verification
- [ ] Go-live checklist completed
- [ ] Rollback plan documented and reviewed
- [ ] Formal Go/No-Go sign-off from:
  - [ ] QA Governance
  - [ ] InfoSec
  - [ ] Product Owner

##### Sprint 9 Exit Criteria
- [ ] UAT sign-off obtained
- [ ] All Must-priority defects resolved
- [ ] Go-live checklist complete
- [ ] Rollback plan reviewed
- [ ] Production deployment successful

---

### 🛡️ PHASE 6 — Hypercare & Stabilization (Weeks 21–22)

**Goal:** Post-launch monitoring, rapid bug fixes, KPI baseline capture.

#### Post Go-Live Tasks
- [ ] Daily monitoring of all NFR-MON metrics
- [ ] Daily monitoring of per-project error log streams (NEW)
- [ ] Daily monitoring of error rates and API latency
- [ ] Rapid-response bug-fix channel (expedited release for critical issues)
- [ ] Daily check-ins with QA Governance (Week 21)
- [ ] Weekly check-ins with QA Governance (Week 22)
- [ ] Capture KPI baselines (PRD §3.3):
  - [ ] Average time: error logged → stakeholder notified
  - [ ] Average time to rebuttal submission
  - [ ] Average time to final QA decision
  - [ ] % of errors with complete evidence
  - [ ] Leadership report preparation time
  - [ ] % of errors with full audit trail
  - [ ] Duplicate/conflicting records count
- [ ] Verify per-project log isolation is clean in production (no cross-project bleed)
- [ ] Formal handover from build team to steady-state support/maintenance team

---

## 5. Risk Register & Mitigations

| # | Risk | Likelihood | Impact | Sprint Impact | Mitigation |
|---|---|---|---|---|---|
| R1 | Governance sign-off delays | Medium | High | Blocks Phase 1 Sprint 2+ | Sprint 0 is governance-first; Sprint 1 work (RBAC/Admin shell) is independent |
| R2 | SSO/IdP integration complexity | Medium | Medium | Blocks Sprint 1 | Start IdP coordination in Phase 0 |
| R3 | Malware scanner integration delays | Low | Low | Could block Sprint 3 evidence "CLEAN" | Build against mock scanner; swap later |
| R4 | Security review surfaces major findings | Low | High | Could delay go-live | Embed security practices per sprint |
| R5 | Load test reveals bottlenecks | Medium | Medium | Sprint 8 remediation | Index optimization built throughout |
| R6 | Per-project log isolation adds complexity | Low | Medium | Sprint 7 scope | Well-defined tagging pattern, minimal schema addition |

---

## 6. Technology Stack Confirmed

| Layer | Technology |
|---|---|
| Frontend | React, TypeScript, CSS design system |
| API | Python 3.12+, FastAPI, Pydantic v2 |
| ORM | SQLAlchemy 2.x (async) |
| Database | PostgreSQL 15+ (Primary + Read Replica) |
| Cache/Queue | Redis (cache + Celery broker) |
| Background Jobs | Celery |
| Object Storage | S3-compatible / Azure Blob Storage |
| Identity | Enterprise IdP via SAML2/OIDC |
| Email | Outlook/Exchange SMTP relay |
| Containers | Docker |
| Orchestration | Kubernetes |
| Monitoring | Structured logging → ELK/Azure Monitor + per-project log streams |
| CI/CD | Automated pipeline (lint → test → build → deploy) |

---

## 8. Team Folder Structure

The repository is structured precisely to match the four team assignments.

```text
Root-Level
qems/
├── backend/
├── frontend/
├── docs/
│   ├── specs/                          # 12 original spec docs
│   └── team-assignments/               # 4 low-level task docs
├── .github/
│   └── workflows/
│       ├── backend-ci.yml
│       └── frontend-ci.yml
├── docker-compose.yml                  # Postgres + Redis for local dev
├── .gitignore
└── README.md

Backend (/backend)
backend/
├── app/
│   ├── main.py                          # SHARED — additive router registration only
│   ├── core/                            # BE-1
│   │   ├── config.py
│   │   ├── di.py
│   │   ├── exceptions.py
│   │   └── middleware.py
│   ├── contracts/                       # SHARED — owner-tagged headers, frozen interfaces
│   │   └── README.md
│   ├── db/                              # BE-1 (migrations + models)
│   │   ├── session.py
│   │   ├── base_class.py
│   │   └── models/
│   ├── auth/                            # BE-1
│   ├── rbac/                            # BE-1
│   ├── workflow/                        # BE-1
│   ├── errors/                          # BE-1
│   ├── rebuttal/                        # BE-1
│   ├── decision/                        # BE-1
│   ├── ownership/                       # BE-1
│   ├── sla_engine/                      # BE-1
│   ├── escalation_engine/               # BE-1
│   ├── admin/
│   │   ├── lobs.py                      # BE-1
│   │   ├── categories.py                # BE-1
│   │   ├── sub_categories.py            # BE-1
│   │   ├── ownership_mapping.py         # BE-1
│   │   ├── sla_rules.py                 # BE-1
│   │   ├── escalation_matrix.py         # BE-1
│   │   ├── working_hours.py             # BE-1
│   │   ├── holidays.py                  # BE-1
│   │   ├── notification_templates.py    # BE-2
│   │   ├── users.py                     # BE-2
│   │   └── config_history.py            # BE-2
│   ├── extensibility/
│   │   ├── categorization.py            # BE-1
│   │   ├── duplicate_detection.py       # BE-1
│   │   ├── analytics.py                 # BE-2
│   │   └── summarization.py             # BE-2
│   ├── notifications/                   # BE-2
│   ├── email/                           # BE-2
│   ├── evidence/                        # BE-2
│   ├── search/                          # BE-2
│   ├── dashboards/                      # BE-2
│   ├── reports/                         # BE-2
│   └── audit/                           # BE-2
├── alembic/
│   └── versions/                        # BE-1 ONLY writes migrations
├── tests/
│   ├── backend_core/
│   └── backend_services/
├── requirements.txt
├── Dockerfile
└── README.md

Frontend (/frontend)
frontend/
├── src/
│   ├── App.tsx                          # SHARED — additive routes only
│   ├── app/
│   │   └── shell/                       # FE-1 (structure)
│   ├── features/
│   │   ├── auth/                        # FE-1
│   │   ├── auditor-dashboard/            # FE-1
│   │   ├── errors/                       # FE-1
│   │   ├── admin/                        # FE-2
│   │   ├── dashboards/                   # FE-2
│   │   ├── escalations/                  # FE-2
│   │   ├── notifications-center/         # FE-2
│   │   └── reports/                      # FE-2
│   ├── lib/
│   │   └── api/
│   │       ├── authApi.ts                # FE-1
│   │       ├── errorsApi.ts              # FE-1
│   │       ├── rebuttalApi.ts            # FE-1
│   │       ├── decisionApi.ts            # FE-1
│   │       ├── evidenceApi.ts            # FE-1
│   │       ├── adminApi.ts               # FE-2
│   │       ├── dashboardsApi.ts          # FE-2
│   │       ├── reportsApi.ts             # FE-2
│   │       └── notificationsApi.ts       # FE-2
│   └── design-system/                    # SHARED — built jointly Sprint 0, then frozen
├── public/
├── package.json
└── README.md
```

---

## 9. Open Questions for User Review

> [!IMPORTANT]
> Please review and provide input on these items:

1. **Per-Project Log Isolation Scope:** Should the per-project error log view be accessible only to `ADMIN` role, or should `QAL` (QA Leads) for a specific LOB also see their own project's system logs?

2. **Search Priority:** Should basic search (QA Error IDs, descriptions, transaction references) be included in Phase 1, or deferred to Phase 1.1 as the UI spec suggests?

3. **Bulk Operations:** Should we add bulk actions (bulk close, bulk reassign) for QA Leads managing many errors, or defer to a fast-follow release?

4. **Legacy Data Import:** Is there existing Excel/SharePoint data that needs to be imported into QEMS at launch, or is this a clean start?

5. **Notification Channels:** The plan uses Email + In-App only for Phase 1. Is there any urgent need for MS Teams notifications in Phase 1, or is Phase 3 timing acceptable?

---

*This implementation plan covers **every module, every requirement, every screen, every API endpoint, and every checklist item** from the 11 specification documents, plus the new per-project error log isolation feature. Nothing is skipped.*
