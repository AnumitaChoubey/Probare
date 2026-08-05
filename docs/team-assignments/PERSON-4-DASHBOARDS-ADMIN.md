# QEMS — PERSON 4: Dashboards, Admin & Reports
### SINGLE SOURCE OF TRUTH — Low-Level Task Spec
### Depends on Person 1's error list existing — build against mock data first, swap to real once it's live.

| Field | Value |
|---|---|
| Branch | `feature/person4-dashboards-admin` |
| Base branch | `main` |
| Never touch | `person1_foundation/`, `person2_*`, `person3_*` — backend or frontend |

---

## 1. Your Mission
You own SLA rules, ownership mapping, escalation config, and every dashboard/report/admin screen that consumes error data. You never query the `errors` table directly — you always call Person 1's `GET /errors` over HTTP, the same way an outside app would.

---

## 2. Folder Structure
### ⚠️ This must match `docs/team-assignments/00-REPO-STRUCTURE-AND-GIT-WORKFLOW.md` exactly. If they ever disagree, that file wins.

```
backend/app/
├── db/models/
│   ├── ownership_mapping.py
│   ├── sla_rule.py
│   ├── escalation_matrix.py
│   ├── working_hours_calendar.py
│   ├── holiday.py
│   └── config_change_history.py
├── search/                    # advanced filter/sort layer over Person 1's /errors
├── dashboards/                # auditor/team/ops/leadership summaries
├── reports/                   # CSV export
└── admin/
    ├── ownership_mapping.py
    ├── sla_rules.py
    ├── escalation_matrix.py
    ├── working_hours.py
    ├── holidays.py
    └── config_history.py

frontend/src/features/person4_dashboards_admin/
├── admin/
│   ├── LobsCategories.tsx        # calls Person 1's /categories API — you build the screen, they own the data
│   ├── OwnershipMapping.tsx
│   ├── SlaRules.tsx
│   ├── EscalationMatrix.tsx
│   ├── WorkingHoursHolidays.tsx
│   ├── UsersRoles.tsx            # calls Person 1's user/role admin API
│   └── ConfigHistory.tsx
├── dashboards/
│   ├── TeamDashboard.tsx
│   ├── OpsDashboard.tsx
│   └── LeadershipDashboard.tsx
├── escalations/
│   └── EscalationsView.tsx
├── reports/
│   └── ReportsExport.tsx
└── VersionedConfigTable.tsx       # shared pattern across the 3 config screens above

Migrations: alembic/versions/p4_000X_<description>.py — only you write these.
Tests: backend/tests/person4_dashboards_admin/
```

---

## 3. Database Tables You Own — Exact Columns

### `sla_rules`
`id` (UUID PK) · `lob_id` · `category_id` (nullable — null means "applies to whole LOB by default") · `severity` · `rebuttal_window_hours` · `decision_window_hours` · `effective_from` · `effective_to` (nullable — null means "currently active")

**Versioned, never edited in place.** "Edit" = insert a new row with a new `effective_from` and close out the old row's `effective_to`. Already-open errors keep the SLA window they were originally snapshotted with by Person 1 — your changes only affect new errors going forward.

### `ownership_mapping`
`id` (UUID PK) · `lob_id` · `category_id` · `default_owner_user_id` (nullable) · `default_owner_team_ref` (nullable) · `default_owner_manager_user_id` (nullable) · `effective_from` · `effective_to` (nullable)

Same versioning rule as `sla_rules` — never overwrite a row, always insert new + close old.

### `escalation_matrix`
`id` (UUID PK) · `lob_id` · `escalation_level` (int, unique per `lob_id` while active) · `threshold_hours_after_breach` · `recipient_role_id` (nullable) · `recipient_user_id` (nullable — exactly one of these two should be set)

### `working_hours` / `holidays` (simplified — can be one config table or two)
`region_code` · `business_start_time` · `business_end_time` · `business_days_of_week` (array) — plus a `holidays` table: `region_code`, `date`, `label`.

### `config_change_history`
`id` (bigserial) · `config_entity` (e.g. `SLA_RULE`, `OWNERSHIP_MAPPING`) · `entity_id` · `old_value` (JSONB) · `new_value` (JSONB) · `changed_by_user_id` · `changed_at`

Every admin-mutation endpoint you build should insert one of these rows — build it as a shared decorator/middleware you apply to each admin route, not copy-pasted per endpoint.

---

## 4. Task Sequence — Complete In This Order

**Before every session:** `git checkout main && git pull origin main && git checkout feature/person4-dashboards-admin && git merge main`

| # | Task | Depends on | Unblocks |
|---|---|---|---|
| 1 | Design dashboard/admin UI against **mock** `GET /errors` matching Person 1's published shape | Person 1's Task 4/5 (shapes published) | Nothing blocks on this |
| 2 | ADMIN-SLA-1 `GET/POST /admin/sla-rules` | Sprint 0 skeleton | **Person 1's `SLA-1` task is blocked on this merging to `main`** — prioritize it early |
| 3 | ADMIN-OWN-1 `GET/POST /admin/ownership-mapping` | Sprint 0 skeleton | **Person 1's `OWN-1` task is blocked on this merging to `main`** — prioritize it early, same sprint as Task 2 |
| 4 | ADMIN-ESC-1 `GET/POST /admin/escalation-matrix` | Task 2 or 3 done (same pattern) | **Person 1's `SLA-3` job is blocked on this** |
| 5 | ADMIN-WH-1 working hours/holidays | none | Nice-to-have for MVP — can slip to Sprint 5 if time is tight |
| 6 | ADMIN-CFG-1 `GET /admin/config-history` | Tasks 2–4 (needs the versioning writes already happening) | Frontend ConfigHistory screen |
| 7 | Frontend `VersionedConfigTable` + AdminSlaRules + AdminOwnershipMapping + AdminEscalationMatrix screens | Tasks 2–4 merged | Nothing blocks on this, but do it right after so Person 1 can demo real (non-mock) creation flow |
| 8 | DASH-1 auditor, DASH-2 team, DASH-3 ops summaries | **Person 1's `ERR-2` (`GET /errors`) merged to `main`** | Frontend dashboard screens |
| 9 | DASH-4 leadership summary + SEARCH-1 advanced filters | Task 8 | Frontend LeadershipDashboard |
| 10 | REPORT-1 CSV export | Task 9; **Person 3's notification-trigger endpoint merged** (for async export-ready alerts) | Frontend ReportsExport |
| 11 | Frontend TeamDashboard, OpsDashboard, LeadershipDashboard, EscalationsView, ReportsExport | Matching backend task merged | — |
| 12 | Frontend AdminLobsCategories, AdminUsersRoles | **Person 1's `/categories` and user/role admin endpoints merged** | — |

**After each numbered task:** commit + push + open a small PR into `main` — don't batch tasks into one PR. **Tasks 2–4 are the highest priority in Sprint 1–2** since Person 1's core lifecycle logic is blocked on them.

---

## 5. Backend Endpoints You Build

### TASK ADMIN-SLA-1: `GET/POST /admin/sla-rules`
- `GET` supports filters `lob_id`, `category_id`, `severity` — used directly by Person 1's TASK SLA-1 to fetch the applicable window at error creation.
- `POST` never updates in place — always inserts a new row and closes the previous one's `effective_to`.

### TASK ADMIN-OWN-1: `GET/POST /admin/ownership-mapping`
- `GET` supports `lob_id`, `category_id` — used by Person 1's TASK OWN-1 at error creation.
- `POST` same versioning rule as above.

### TASK ADMIN-ESC-1: `GET/POST /admin/escalation-matrix`
- `GET` supports `lob_id` — used by Person 1's SLA breach/escalation background job.
- `POST` enforces `escalation_level` uniqueness per `lob_id` (reject `409` if it collides), and exactly one of `recipient_role_id`/`recipient_user_id` set.

### TASK ADMIN-WH-1: `GET/POST /admin/working-hours`, `GET/POST /admin/holidays`
- Simple CRUD, `region_code`-scoped.

### TASK ADMIN-CFG-1: `GET /admin/config-history`
- Query `config_change_history`, filterable by `config_entity` and date range. RBAC: `ADMIN` full, others read-only.

### TASK DASH-1: `GET /dashboards/auditor`
- Calls Person 1's `GET /errors` (scoped to `logged_by_user_id=current_user`), returns counts: Open / Pending Rebuttal / Pending My Decision / Closed (this period), plus the "Awaiting My Decision" set.

### TASK DASH-2: `GET /dashboards/team`
- Calls Person 1's `GET /errors` filtered by `lob_id`, computes: SLA compliance % (closed-within-SLA / total closed), overturn rate by auditor, escalation counts, and the "Unmapped Errors" queue (errors where `owner_user_id IS NULL` — you can get this via a filter param on Person 1's `GET /errors`, e.g. `?owner_user_id=null`, agree the exact query param with Person 1).

### TASK DASH-3: `GET /dashboards/operations`
- Calls Person 1's `GET /errors` filtered to the caller's team (via `owner_manager_user_id` matching, resolved through your own `ownership_mapping` data), returns trend data: error count by category over time.

### TASK DASH-4: `GET /dashboards/leadership`
- Full filter set: date range, LOB (multi-select), category, severity, client-impact-flag — passed through to Person 1's `GET /errors`.
- KPI tiles: Total Errors, SLA Compliance %, Overturn Rate, Escalation Rate, Client-Impact-Flagged Count.
- Chart data pre-aggregated server-side (don't make the frontend aggregate): Errors by LOB, Trend over time, Category distribution, Aging distribution (Green/Amber/Red — use Person 1's `calculate_sla_state` output, don't recompute the aging math yourself).

### TASK SEARCH-1: Advanced filter/sort on top of `GET /errors`
- If Person 1's basic `GET /errors` filters aren't enough for your dashboards (e.g. combined multi-select LOB + date range + SLA state), build your own query-parameter layer here that calls Person 1's API multiple times or requests an extended filter set from them — coordinate with Person 1 on which query params their endpoint needs to support natively versus what you can post-process client-side after fetching a page.

### TASK REPORT-1: `POST /reports/export`
- Request: `{ "dashboard": "leadership", "filters": {...}, "format": "csv" }`.
- Re-run the same filtered query as the matching dashboard endpoint (reuse the same functions, don't duplicate filter logic) against Person 1's `GET /errors`, up to a reasonable row cap for MVP (e.g. 10,000 rows).
- Small/fast exports: generate synchronously, return a download link. Large exports: generate in the background and use Person 3's in-app notification when ready (call their notification-trigger endpoint).

---

## 6. Frontend Pages You Build

### TASK ADMIN-1: LOBs & Categories screen
- Tree/table view: LOB → Categories → Sub-Categories, inline add/edit/deactivate.
- **Deactivate, never hard-delete** — only an active/inactive toggle, with a confirm modal: *"Deactivating this category will not affect already-logged errors referencing it."*
- Calls Person 1's `GET/POST/PATCH /categories` (Person 1 owns this table and endpoint — you build the admin screen on top of their API).
- Category edit form exposes `requires_evidence_at_severity` as a multi-select (Critical/High/Medium/Low checkboxes) — this field lives on Person 1's `categories` table.

### TASK ADMIN-2: Ownership Mapping screen
- Table: LOB, Category, Default Owner Team/Role, Default Owner Manager. "Edit" opens a form that always `POST`s a new version, with the versioning warning message shown above the save button.
- Build/reuse `VersionedConfigTable.jsx` — a single shared component for this screen, SLA Rules, and Escalation Matrix, so you don't build the same versioning UX three times.

### TASK ADMIN-3: SLA Rules screen
- Table: LOB, Category ("All Categories" when null), Severity, Rebuttal Window (hrs), Decision Window (hrs). Same versioning pattern via `VersionedConfigTable`.

### TASK ADMIN-4: Escalation Matrix screen
- Per-LOB ordered list of escalation levels, each with threshold hours and recipient (role-or-user radio choice). Client-side enforce unique `escalation_level` per LOB before submit; surface the server's `409` clearly if it slips through.

### TASK ADMIN-5: Working Hours & Holidays screen
- Per-region business hours (start/end time, business-day checkboxes) + a holiday calendar table with manual add.

### TASK ADMIN-6: Users & Roles screen
- Searchable user table (name, email, active/inactive, roles+scope chips). "Manage Roles" opens a modal to add/revoke role assignments.
- This screen calls **Person 1's** user/role endpoints (`GET/PATCH /admin/users`, `GET/POST/DELETE /admin/users/:id/roles`) since Person 1 owns the `users`/`roles` tables — you're just building the admin UI on top of their API. Only `ADMIN` role can access this screen.

### TASK ADMIN-7: Configuration Change History screen
- Read-only audit view: entity type, old value → new value (simple key-by-key diff of the JSONB is enough for MVP), changed by, changed at. Filterable by entity type and date range.

### TASK DASH-TEAM-1: Team Dashboard
- LOB selector (only if the user is scoped to multiple LOBs). KPI tiles: SLA Compliance %, Avg Time to Close, Open Count, Escalated Count, Overturn Rate. "Overturn Rate by Auditor" chart. "Unmapped Errors" queue table with a "Route Now" quick action (opens a small modal that calls Person 1's ownership-reassignment endpoint, if you build one, or your own ownership-mapping POST as a one-off override).

### TASK DASH-OPS-1: Ops Dashboard
- KPI tiles: Open errors assigned to my team, Pending my team's response, Overturn rate, Average response time. Trend chart: error count by category over time. Table of errors requiring team action with inline quick-action buttons (these call **Person 2's** accept/rebut endpoints directly, since that's their API — you just trigger the call from your row).

### TASK DASH-LEAD-1: Leadership Dashboard
- Full filter bar + KPI tiles + charts (Errors by LOB, Trend, Category distribution, Aging distribution). "Export Report" button → format selector → `POST /reports/export`, shows progress for async exports, relies on Person 3's Notification Center firing when ready.

### TASK ESC-1: Escalations view
- Table of all currently `SLA_BREACHED_ESCALATED` errors: QA Error ID, Owner, Escalation Level (badge), Time Since Breach, Next Threshold countdown. Default sort: highest escalation level first, then longest time since breach. Pull from Person 1's `GET /errors?status=SLA_BREACHED_ESCALATED`.

### TASK REPORTS-1: Reports/Export screen
- Simple format selector (CSV to start) + filter reuse from the Leadership Dashboard + "Export" button → `POST /reports/export`.

---

## 7. What You Call From Others
- `GET /errors` and `GET /categories` (Person 1) — for every dashboard, admin screen, and export
- `GET/PATCH /admin/users`, role-assignment endpoints (Person 1) — for the Users & Roles admin screen
- Person 2's accept/rebut endpoints — for inline quick actions on the Ops Dashboard
- Person 3's notification-trigger endpoint — for async export "ready" alerts

## What Others Call From You
- Person 1's error-creation flow calls your `GET /admin/ownership-mapping` and `GET /admin/sla-rules`
- Person 1's SLA breach/escalation job calls your `GET /admin/escalation-matrix`

---

## 8. Do's
✅ Design your dashboard/admin UI against mock `GET /errors` data in Sprint 1.
✅ Compute all stats server-side from data fetched via Person 1's API — never ask for direct DB access to `errors`.
✅ Version every config change (SLA rules, ownership mapping, escalation matrix) — never edit a row in place.
✅ Reuse `calculate_sla_state`/aging data from Person 1 rather than recomputing the business-hours math yourself.

## 9. Don'ts
🚫 Don't import Person 1's, 2's, or 3's backend modules directly — call their API URLs with `fetch()`.
🚫 Don't query `errors`, `rebuttals`, or `evidence_files` tables directly from your database connection.
🚫 Don't edit the shared top bar/layout beyond adding your own nav-link import, if needed.
🚫 Don't let the admin "Edit" button on any versioned config screen overwrite a row — always insert a new version.

---

## 10. Suggested Sprint Plan

| Sprint | Task |
|---|---|
| 1 | Design dashboard/admin UI against mock error data |
| 2 | Build `sla_rules`, `ownership_mapping`, `escalation_matrix` tables + admin CRUD, `VersionedConfigTable` component |
| 3 | Wire Person 1's error-creation flow to your real SLA/ownership APIs; build Users & Roles + Config History screens |
| 4 | Build dashboards (auditor/team/ops), wire to Person 1's real `GET /errors` |
| 5 | Leadership dashboard, Escalations view, CSV export |
| 6 | Integration testing across all 4 people's features |
