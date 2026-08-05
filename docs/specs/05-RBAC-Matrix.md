# RBAC Matrix — Roles & Permissions
## QEMS — Quality Error Management System

| Field | Value |
|---|---|
| Document Version | 1.0 |
| Depends On | PRD v1.0, FSD v1.0, FRS v1.0 |
| Assumption Locked | One Ownership Mapping per (LOB, Category) — no multi-team split queues in Phase 1 |

---

## 1. Role Definitions

| Role Code | Role Name | Description |
|---|---|---|
| `AUD` | QA Auditor | Logs errors, reviews rebuttals, records final decisions for errors they own/logged or that are assigned to their team |
| `QAL` | QA Lead / QA Manager | Supervises a team of auditors within one or more LOBs; can reassign, reopen, escalate, view team dashboards |
| `OPS_AGT` | Operations Agent | The individual/team flagged by an error; can view own errors, accept/rebut |
| `OPS_MGR` | Operations Manager | Manages a team of Operations Agents; can rebut on behalf of team, views team-level trend dashboards |
| `QA_GOV` | QA Leadership / Governance | Cross-LOB executive visibility; dashboards and exports only, no operational edit actions |
| `ADMIN` | System Administrator | Manages all configuration entities; user/role management; no error-content edit actions |
| `AUDITOR_RO` | Compliance / Audit Reviewer (Phase 1: read-only) | Full historical read access + export, across all LOBs, no edit actions |
| `UNASSIGNED` | Unassigned (default JIT-provisioned) | No module access beyond "Pending Access" screen |

**Scoping dimension:** every role except `QA_GOV`, `ADMIN`, and `AUDITOR_RO` is scoped to one or more specific LOB/team assignments. A user's effective visible data = union of all LOB/team scopes across all their assigned roles.

---

## 2. Permission Matrix — Error Lifecycle Actions

Legend: **F** = Full access, **O** = Own/assigned-scope only, **T** = Team-scope only, **X** = No access, **R** = Read-only

| Action | AUD | QAL | OPS_AGT | OPS_MGR | QA_GOV | ADMIN | AUDITOR_RO |
|---|---|---|---|---|---|---|---|
| Log new error | O (create) | O (create) | X | X | X | X | X |
| Save error as draft | O | O | X | X | X | X | X |
| View error — own LOB/team | F | T | O (as named owner) | T | X | X | X |
| View error — cross-LOB | X | X | X | X | F | F | F |
| Edit error record pre-submission (draft) | O | X | X | X | X | X | X |
| Edit error record post-submission | X | X | X | X | X | X | X |
| Accept error (owner action) | X | X | O | T (on behalf of agent) | X | X | X |
| Submit rebuttal | X | X | O | T (on behalf of agent) | X | X | X |
| Reopen rebuttal window (correction) | O (if original logger) | T | X | X | X | X | X |
| Record final decision (Upheld/Overturned/Partial) | O (if original logger) | T | X | X | X | X | X |
| Reopen closed/decided record | X | T | X | X | X | X | X |
| View evidence (own party) | F | T | O | T | X | X | X |
| View evidence (cross-LOB) | X | X | X | X | R | R | R |
| Upload evidence | O (as logger) | T | O (as owner) | T | X | X | X |
| Download evidence | O | T | O | T | R | R | R |
| Delete/edit evidence | X | X | X | X | X | X | X |
| View Internal Notes (QA-only field) | O | T | X | X | R | R | R |
| View audit trail / History tab | O | T | O (redacted, no Internal Notes) | T (redacted) | R | R | R |
| Reassign error ownership | X | T | X | X | X | F | X |
| View Unmapped Errors queue | X | T | X | X | X | F | X |

---

## 3. Permission Matrix — Dashboards & Reporting

| Action | AUD | QAL | OPS_AGT | OPS_MGR | QA_GOV | ADMIN | AUDITOR_RO |
|---|---|---|---|---|---|---|---|
| Auditor Dashboard (own logged errors) | F | R (own team's auditors) | X | X | X | X | X |
| QA Lead / Team Dashboard | X | F (own team/LOB) | X | X | R (all LOBs) | X | R |
| Operations Manager Dashboard | X | X | X | F (own team) | R (all LOBs) | X | R |
| Leadership / Governance Dashboard | X | X | X | X | F | X | R |
| SLA/Aging views | O | T | O | T | F | X | R |
| Escalations view | X | T | X | T (own team) | F | X | R |
| Export PDF/Excel | O-scope | T-scope | X | T-scope | F-scope | X | F-scope |

---

## 4. Permission Matrix — Administration

| Action | AUD | QAL | OPS_AGT | OPS_MGR | QA_GOV | ADMIN | AUDITOR_RO |
|---|---|---|---|---|---|---|---|
| Manage LOBs / Categories / Sub-categories | X | X | X | X | X | F | X |
| Manage Ownership Mapping | X | X | X | X | X | F | X |
| Manage SLA windows | X | X | X | X | X | F | X |
| Manage Escalation Matrix | X | X | X | X | X | F | X |
| Manage Notification Templates | X | X | X | X | X | F | X |
| Manage Evidence Rules (file types/size) | X | X | X | X | X | F | X |
| Manage Working-Hours/Holiday Calendar | X | X | X | X | X | F | X |
| Manage Users & Role Assignments | X | X | X | X | X | F | X |
| View Configuration Change History | X | X | X | X | R | F | R |
| Access System Health / Ops Metrics | X | X | X | X | X | F | X |

---

## 5. Field-Level Sensitivity Rules

| Field | Visible To | Hidden From |
|---|---|---|
| Internal Notes (QA-only) | AUD (own/team), QAL (team), QA_GOV, ADMIN, AUDITOR_RO | OPS_AGT, OPS_MGR |
| Rebuttal Justification | All parties to the record + QA/Leadership/Admin/Audit | Unrelated LOB users |
| Evidence Files | Named parties + QA/Leadership/Admin/Audit within RBAC scope | Any user outside the record's LOB/team scope, unless QA_GOV/ADMIN/AUDITOR_RO |
| Auditor identity on a logged error | All parties, QA/Leadership | — (not restricted; transparency is intentional per governance requirements) |
| Configuration change history (old/new values, actor) | ADMIN (full), QA_GOV (read) | AUD, QAL, OPS_AGT, OPS_MGR |

---

## 6. Multi-Role Resolution Rules

- BR-RBAC-1: Effective permission for a multi-role user = union (not intersection) of all assigned roles' permissions.
- BR-RBAC-2: Effective data scope = union of all LOB/team scopes assigned across roles.
- BR-RBAC-3: If a conflict exists between a permissive and restrictive rule from two different roles (e.g., one role grants edit, none deny it), the permissive rule wins — QEMS does not implement explicit "deny" overrides in Phase 1; access is purely additive. (Sensitive field redaction in Section 5 is enforced at the role level, e.g., a user holding only `OPS_AGT` never sees Internal Notes even if they also incidentally have some other grant — redaction rules are absolute per role, not overridden by union logic.)
- BR-RBAC-4: A user's role/scope assignment change takes effect on next page load / token refresh, not requiring full re-login (subject to caching strategy defined in the Architecture doc).

---

## 7. Role Assignment Governance

- Only `ADMIN` can assign/revoke roles.
- Role assignment changes are captured in the Audit Trail (FR-12-003).
- Recommended (not system-enforced) governance: role assignment requests for `QAL`, `QA_GOV`, and `ADMIN` should require a secondary approval outside the system (e.g., manager sign-off via existing enterprise access-request process) — this is a process control, not a technical one, and is noted here for completeness.

---

*End of RBAC Matrix. Next document: Workflow / State Machine.*
