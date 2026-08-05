# Sprint-Wise Implementation Plan
## QEMS — Quality Error Management System (Phase 1)

| Field | Value |
|---|---|
| Document Version | 1.0 |
| Depends On | All prior documents |
| Sprint Length | 2 weeks |
| Assumed Team Composition | 1 Product Owner/BA, 1 Tech Lead/Architect, 3 Backend Engineers (Python/FastAPI), 2 Frontend Engineers (React), 1 QA/Test Engineer, 1 part-time DevOps Engineer, 1 part-time UX Designer (Sprints 0–2 heavy, tapering) |
| Total Duration (Phase 1) | Sprint 0 + Sprints 1–9 (≈20 weeks) + 2-week Hypercare |

*(Team size/duration are planning assumptions — adjust proportionally if actual team composition differs; relative sequencing and dependency order should hold regardless of team size.)*

---

## 1. Guiding Principles for Sequencing

1. **Foundational config before workflow:** RBAC, LOB/Category/Ownership/SLA config must exist before the error-logging and rebuttal workflows can be meaningfully tested end-to-end.
2. **Core lifecycle before peripheral features:** the full Log → Notify → Rebut → Decide → Close loop is the walking skeleton; dashboards, exports, and admin polish follow once that loop is solid.
3. **AI-readiness is structural, not a feature to schedule separately:** the Extensibility Service Layer interfaces (M14) are built alongside the modules that call them (M2, M5, M10) rather than as a standalone late sprint, so the "seams" are correct from the start — only the Phase 2 AI implementations are deferred, not the interface design.
4. **Non-functional requirements are continuous, not a single "hardening sprint":** security, performance, and accessibility work is embedded per sprint against the features built that sprint, with a dedicated final hardening/validation pass before UAT — not saved entirely until the end.

---

## 2. Sprint 0 — Foundations & Governance (2 weeks)

**Goal:** Resolve all open governance items, establish technical foundations, no user-facing features yet.

| Workstream | Deliverables |
|---|---|
| Governance | Finalize error categories/sub-categories, severity definitions, ownership mapping (initial set), SLA windows per category/severity, escalation matrix — sign-off from QA Governance (resolves PRD §11 Open Items 1–5) |
| Architecture | Repository setup, CI/CD pipeline skeleton, Dev/UAT/Prod environment provisioning, PostgreSQL instance provisioning, Redis provisioning, Blob storage container setup |
| Data | Initial schema migration scripts for foundational tables (`users`, `roles`, `lobs`, `categories`, `sub_categories`, `user_roles`) |
| Auth | SSO/OIDC integration spike and configuration against enterprise IdP (test environment) |
| Design | Finalize design tokens/system (colors, typography, component library baseline) referencing UI/UX Wireframe Spec §15 |

**Exit criteria:** Governance sign-off document; Dev environment deployable; SSO login functional in Dev; CI pipeline runs lint + unit test stage successfully on an empty scaffold.

---

## 3. Sprint 1 — Auth, RBAC & Admin Console Skeleton

**Modules:** M1 (Auth), M12 (RBAC), M13 (Admin — partial)

| Deliverable | FRS Reference |
|---|---|
| SSO login flow, JIT user provisioning, session management | FR-01-001 to FR-01-005 |
| Role/permission model implementation (8 fixed roles) | RBAC Matrix §1–2 |
| Admin Console: Users & Roles screen (assign/revoke role + LOB scope) | FR-12-001 to FR-12-003 |
| Admin Console: LOBs, Categories, Sub-Categories CRUD | FR-13-001 (partial) |
| Global app shell (nav, top bar, RBAC-filtered menu) | UI/UX Wireframe Spec §1 |

**Exit criteria:** A test user can SSO-login, be assigned each of the 8 roles by an Admin test account, and see correctly RBAC-filtered navigation for each role.

---

## 4. Sprint 2 — Config Console Completion & Error Logging (Core)

**Modules:** M13 (remaining config), M2 (Error Logging), M3 (QA Error ID Generation)

| Deliverable | FRS Reference |
|---|---|
| Admin Console: Ownership Mapping, SLA Rules, Escalation Matrix, Evidence Rules, Working Hours/Holidays screens (with versioning UX) | FR-13-001, FR-13-002, FR-13-004 |
| Error Logging form (all fields, validations, conditional logic) | FR-02-001 to FR-02-009 |
| QA Error ID generation (atomic, per-LOB-per-year sequence) | FR-03-001 to FR-03-004 |
| Draft save/resume | FR-02-006 |
| Idempotent submission handling | FR-02-007 |

**Exit criteria:** An Auditor can log a complete error via the UI, receive a correctly formatted unique QA Error ID, and see it persist correctly; config changes in Admin Console are versioned and do not affect already-created records retroactively.

---

## 5. Sprint 3 — Ownership Resolution, Notification & Evidence

**Modules:** M4 (Ownership & Notification), M7 (Evidence Management — core)

| Deliverable | FRS Reference |
|---|---|
| Ownership resolution logic (individual/team/unmapped queue) | FR-04-001 to FR-04-003 |
| Email notification dispatch (NT-01) via background worker + Outlook/Exchange integration | FR-04-004 |
| Delivery failure logging + QA Lead alert surfacing | FR-04-005 |
| In-app notification center (bell icon, mirrors email) | FR-04-006 |
| Evidence upload (type/size validation, checksum, malware-scan integration hook) | FR-07-001 to FR-07-003 |
| Evidence versioning (supersede, never delete) | FR-07-004 |
| Evidence RBAC scoping | FR-07-005 |

**Exit criteria:** Logging an error triggers a real email to the correct owner within the NFR-PERF-03 latency target; evidence can be uploaded, scanned, and only becomes downloadable once `CLEAN`.

---

## 6. Sprint 4 — Rebuttal Workflow & SLA Engine

**Modules:** M5 (Rebuttal), M8 (Status/Aging/SLA Engine — core)

| Deliverable | FRS Reference |
|---|---|
| Accept/Rebut actions with validation | FR-05-001 to FR-05-004 |
| Rebuttal immutability + single-active-cycle rule | FR-05-006, FR-05-007 |
| Full status lifecycle implementation (all 10 states) per Workflow/State Machine doc | FR-08-001 |
| SLA window calculation using business-hours/holiday calendar | FR-08-002, FR-08-003 |
| Aging indicator calculation + color-coded thresholds | FR-08-004 |
| SLA breach auto-transition (T7) via background worker polling | FR-05-005, FR-08-005 |

**Exit criteria:** A logged error correctly transitions through Open → Accept/Rebut based on owner action, and auto-transitions to SLA-breached if no action occurs within the configured (test-shortened, for verification) SLA window.

---

## 7. Sprint 5 — QA Decision Workflow, Escalation Engine & Audit Trail Hardening

**Modules:** M6 (QA Decision), M9 (Escalation), M11 (Audit Trail — full coverage)

| Deliverable | FRS Reference |
|---|---|
| Decision recording (Upheld/Overturned/Partially Upheld) with rationale enforcement | FR-06-001, FR-06-002 |
| State-guard enforcement (Accepted → Upheld only) | FR-06-003 |
| Read-only lock post-decision | FR-06-004 |
| Closure notifications | FR-06-005 |
| Reopen action (QAL-only, reason-mandatory) + re-routing to renegotiation | FR-06-006 |
| Multi-level escalation matrix execution | FR-09-001, FR-09-002 |
| Escalations dashboard view | FR-09-004 |
| Full audit_log coverage across all modules built so far; History tab UI | FR-11-001 to FR-11-003 |

**Exit criteria:** The complete Log → Notify → Rebut → Decide → Close → (optional) Reopen loop works end-to-end for all three decision outcomes, with every step reflected in the record's History tab.

---

## 8. Sprint 6 — Dashboards (Auditor, Team, Operations)

**Modules:** M10 (Dashboards — partial)

| Deliverable | FRS Reference |
|---|---|
| Auditor Dashboard (KPI tiles, filterable table, "Awaiting My Decision" panel) | FR-10-001, FR-10-002, FR-10-006 |
| QA Lead/Team Dashboard (SLA compliance, overturn rate by auditor, unmapped queue, escalations) | FR-10-001, FR-10-002 |
| Operations Manager Dashboard | FR-10-001, FR-10-002 |
| Read replica wiring for dashboard queries (performance isolation) | NFR-PERF-04, System Architecture §3.5 |

**Exit criteria:** Each role sees their correct dashboard variant with real data, refreshing within the near-real-time latency target.

---

## 9. Sprint 7 — Leadership Dashboard, Reporting/Export & Admin Console Completion

**Modules:** M10 (Leadership view), M13 (Notification Templates, remaining config screens)

| Deliverable | FRS Reference |
|---|---|
| Leadership/Governance Dashboard (cross-LOB, full filters, charts) | FR-10-001, FR-10-002 |
| PDF/Excel export with audit logging of export action | FR-10-003, FR-10-004 |
| Notification Template management screen with live token preview | FSD §17, FR-13-001 |
| Configuration Change History screen | FR-13-002 |

**Exit criteria:** Leadership user can filter, view, and export a governance report matching agreed QBR/BRM format from PRD §11 Open Item 6.

---

## 10. Sprint 8 — Extensibility Service Layer, Security & Performance Hardening

**Modules:** M14 (Extensibility Service Layer), cross-cutting NFR validation

| Deliverable | Reference |
|---|---|
| Categorization Suggestion, Duplicate Detection, Summarization, Analytics services implemented per rule-based Phase 1 contracts, wired via dependency injection into M2/M5/M10 | FR-14-001 to FR-14-004 |
| Verification that zero AI/ML dependency exists in Phase 1 build | FR-14-002 |
| Security review / penetration test | NFR-SEC-08 |
| Load testing against NFR-SCALE-01/02 and NFR-PERF targets | NFRS §2–3 |
| Accessibility audit (WCAG 2.1 AA) | NFR-UX-02 |
| Automated test coverage review (≥80% on core modules) | NFR-MAINT-03 |
| DR/backup restore drill | NFR-AVAIL-04, NFR-AVAIL-06 |

**Exit criteria:** Security sign-off obtained; load test report meets or exceeds targets; accessibility scan passes with no Level A/AA blockers; test coverage threshold met.

---

## 11. Sprint 9 — UAT Support, Fixes & Go-Live Readiness

| Workstream | Deliverables |
|---|---|
| UAT | QA Governance and representative Operations/Leadership users execute UAT scripts across full workflow; defect triage and fix cycle |
| Documentation | Admin configuration guide, end-user quick-start guides per role, release notes |
| Training | Short role-based walkthrough sessions/recordings for Auditors, Operations, QA Leads, Leadership, Admins |
| Cutover Planning | Data migration plan (if any legacy tracker data is to be seeded/referenced), go-live checklist, rollback plan |
| Go/No-Go | Formal sign-off from QA Governance, InfoSec, and Product Owner |

**Exit criteria:** UAT sign-off obtained; all Must-priority (M) defects resolved; go-live checklist complete; rollback plan documented and reviewed.

---

## 12. Hypercare (Weeks 21–22, Post Go-Live)

- Daily monitoring of NFR-MON metrics and error rates.
- Rapid-response bug-fix channel with expedited release process for critical issues.
- Daily/weekly check-ins with QA Governance to confirm adoption is on track against PRD §3.3 KPIs (baseline capture begins here).
- Formal handover from build team to steady-state support/maintenance team at the end of hypercare.

---

## 13. High-Level Timeline Summary

| Sprint | Weeks | Focus |
|---|---|---|
| Sprint 0 | 1–2 | Governance sign-off, environment & architecture foundations |
| Sprint 1 | 3–4 | Auth, RBAC, Admin skeleton |
| Sprint 2 | 5–6 | Config console completion, Error Logging, QA Error ID |
| Sprint 3 | 7–8 | Ownership resolution, Notifications, Evidence |
| Sprint 4 | 9–10 | Rebuttal workflow, SLA engine |
| Sprint 5 | 11–12 | QA Decision workflow, Escalation engine, Audit trail |
| Sprint 6 | 13–14 | Auditor/Team/Ops dashboards |
| Sprint 7 | 15–16 | Leadership dashboard, Reporting/Export, Admin completion |
| Sprint 8 | 17–18 | AI-readiness services, Security/Performance/Accessibility hardening |
| Sprint 9 | 19–20 | UAT, fixes, training, go-live readiness |
| Hypercare | 21–22 | Stabilization, KPI baseline capture, handover |

---

## 14. Risk Buffer & Dependencies Called Out

| Risk | Sprint Impact | Mitigation |
|---|---|---|
| Governance sign-off (categories/SLA/ownership/escalation) slips past Sprint 0 | Blocks Sprint 2 onward | Sprint 0 explicitly scoped as governance-first; Sprint 1 has no hard dependency on final category list (RBAC/Admin skeleton work is independent), buying one sprint of slack |
| SSO/IdP integration complexity with enterprise identity team | Blocks Sprint 1 exit criteria | Start IdP coordination in Sprint 0 as a parallel workstream, not Sprint 1 |
| Malware-scanning service integration delays (external enterprise dependency) | Could block Sprint 3 evidence "CLEAN" gating | Build evidence upload against a mock/stub scanner interface first; swap to real integration when available — does not block core workflow development |
| Security review (Sprint 8) surfaces significant findings | Could delay Sprint 9/go-live | Continuous security practices embedded per sprint (not first-time review at Sprint 8) reduce likelihood of large late findings; Sprint 8 review is a validation gate, not the first security touchpoint |

---

*End of Sprint-Wise Implementation Plan. This completes the full QEMS documentation set: PRD, FSD, FRS, NFRS, RBAC Matrix, Workflow/State Machine, Database Schema, REST API Design, System Architecture, UI/UX Wireframe Specification, and Sprint-Wise Implementation Plan.*
