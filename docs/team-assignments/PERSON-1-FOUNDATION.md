# QEMS — PERSON 1: Foundation (Login, Error Logging, Error Lifecycle, Error Detail)
### SINGLE SOURCE OF TRUTH — Low-Level Task Spec
### Start first. Everyone else is blocked until your Sprint 1 API exists.

| Field | Value |
|---|---|
| Branch | `feature/person1-foundation` |
| Base branch | `main` |
| Never touch | any folder under `person2_*`, `person3_*`, `person4_*` (backend or frontend) |
| Merge owner | whoever your team designates as lead |

---

## 1. Your Mission
You own **users, auth, the errors table, and the entire error lifecycle state machine** — from creation through SLA aging and escalation. Every other person's feature refers to an error by its ID and calls your API to read or advance it. Nobody else ever writes to `errors` or `error_status_history` directly.

---

## 2. Folder Structure
### ⚠️ This must match `docs/team-assignments/00-REPO-STRUCTURE-AND-GIT-WORKFLOW.md` exactly. If they ever disagree, that file wins.

```
backend/app/
├── main.py                   # SHARED — you scaffold it Sprint 0, others only add router-include lines
├── core/                     # config.py, di.py, exceptions.py, middleware.py
├── db/
│   ├── session.py
│   ├── base_class.py
│   └── models/
│       ├── user.py, role.py, user_role.py
│       ├── lob.py, category.py, sub_category.py
│       └── error.py, error_status_history.py
├── auth/                     # login, JWT/session
├── rbac/                     # role-check helper
├── workflow/                 # the status state machine, PATCH /errors/:id/status
├── errors/                   # /errors, /categories routes, ID generator lives here too
├── ownership/                # owner resolution at creation (calls P4's API over HTTP)
├── sla_engine/                # SLA snapshot, aging calc, breach + escalation background job
└── admin/
    ├── lobs.py, categories.py, sub_categories.py
    └── users.py               # user/role admin endpoints

frontend/src/
├── App.tsx                    # SHARED — you scaffold it, others only add route lines
├── app/shell/                 # AppShell, TopBar (with empty NotificationBellSlot for P3), LeftNav, Footer, navItems.ts
└── features/person1_foundation/
    ├── LoginPage.tsx
    ├── AuditorDashboard.tsx
    ├── LogNewErrorForm/
    ├── ErrorDetail/            # ⚠️ SHARED SHELL — Section 9
    ├── OverviewTab.tsx
    ├── HistoryTab.tsx
    └── useAuth.ts              # SHARED contract, you own + freeze it

Migrations: alembic/versions/p1_000X_<description>.py — only you write these.
Tests: backend/tests/person1_foundation/
```

**Rule:** nobody outside these paths edits these files. If Person 2/3/4 think they need a new column on your tables, they message you — you add it, you write the migration.

---

## 3. Database Tables You Own — Exact Columns

### `users`
`id` (UUID PK) · `username` (unique, not null) · `password_hash` (not null) · `full_name` · `email` (unique) · `is_active` (bool, default true) · `created_at` · `updated_at` · `last_login_at` (nullable)

### `roles`
`id` (UUID PK) · `code` (unique, e.g. `AUD`, `QAL`, `OPS_AGT`, `OPS_MGR`, `ADMIN`) · `name`
Seed at least: `AUD` (Auditor), `QAL` (QA Lead), `OPS_AGT` (Operations Agent), `OPS_MGR` (Operations Manager), `ADMIN`.

### `user_roles`
`id` (UUID PK) · `user_id` (FK users) · `role_id` (FK roles) · `assigned_at`

### `lobs` (Line of Business)
`id` (UUID PK) · `code` (unique) · `name` · `is_active` (default true)

### `categories`
`id` (UUID PK) · `lob_id` (FK lobs) · `name` · `is_active` (default true) · `requires_evidence_at_severity` (array of strings, default `['CRITICAL','HIGH']`) — drives Section 8's evidence rule. Unique on `(lob_id, name)`.

### `sub_categories`
`id` (UUID PK) · `category_id` (FK categories) · `name` · `is_active` (default true). Unique on `(category_id, name)`.

### `errors` — the core entity
`id` (UUID PK) · `qa_error_id` (unique, e.g. `QE-BILL-2026-000481`) · `lob_id` (FK) · `category_id` (FK) · `sub_category_id` (FK, nullable) · `severity` (CHECK IN `CRITICAL,HIGH,MEDIUM,LOW`) · `status` (string) · `transaction_reference` · `logged_by_user_id` (FK users) · `owner_user_id` (FK users, nullable) · `date_of_occurrence` (date, CHECK <= today) · `date_of_detection` (date) · `description` (text, CHECK length >= 20) · `initial_root_cause` (nullable) · `internal_notes` (text, nullable — visible only to Auditor/QA roles, never Operations) · `client_impact_flag` (bool, default false) · `sla_rebuttal_window_hours_snapshot` (int) · `sla_decision_window_hours_snapshot` (int) · `sla_clock_started_at` (timestamp, nullable) · `current_escalation_level` (int, default 0) · `idempotency_key` (unique, nullable) · `is_draft` (bool, default false) · `created_at` · `updated_at` · `submitted_at` (nullable) · `closed_at` (nullable)

Indexes: `idx_errors_status`, `idx_errors_lob_category`, `idx_errors_owner_user_id`, `idx_errors_created_at`.

### `error_status_history`
`id` (bigserial) · `error_id` (FK) · `from_status` (nullable) · `to_status` (not null) · `performed_by_user_id` (nullable) · `performed_by_system` (bool, default false) · `reason` (nullable) · `occurred_at`

**No update/delete allowed on this table by anyone, including you** — it's an append-only audit trail. Never write a PATCH/DELETE against it.

---

## 4. Status Values (the state machine everyone codes against)

```
DRAFT → OPEN_PENDING_ACK → OPEN_PENDING_RESPONSE
  → SLA_BREACHED_ESCALATED (if breached before response)
  → ACCEPTED_PENDING_CLOSURE (owner accepted)
  → REBUTTAL_SUBMITTED_PENDING_QA_REVIEW (owner disputed)
  → CLOSED_UPHELD / CLOSED_OVERTURNED / CLOSED_PARTIAL (QA decision)
  → REOPENED (QA reopens a closed error) → back into REBUTTAL_SUBMITTED_PENDING_QA_REVIEW
```
Person 2's endpoints move an error between these statuses by calling **your** `PATCH /errors/:id/status` — they never set status directly.

---

## 5. Task Sequence — Complete In This Order

**Before every session:** `git checkout main && git pull origin main && git checkout feature/person1-foundation && git merge main`

| # | Task | Depends on | Unblocks |
|---|---|---|---|
| 1 | AUTH-1 `POST /login` | Sprint 0 skeleton merged | AUTH-2 |
| 2 | AUTH-2 `GET /me` | Task 1 | CAT-1; everyone's RBAC checks |
| 3 | CAT-1 `GET /categories` | Task 2 | ERR-1 (evidence rule lookup); everyone's dropdowns |
| 4 | ERR-1 `POST /errors` | Task 3, + ID-1/OWN-1/SLA-1 stubs (can mock P4 calls at first) | ERR-2, ERR-3; **publish JSON shape now — this unblocks P2/P3/P4 to start against mock data** |
| 5 | ERR-2 `GET /errors` | Task 4 | P4's dashboards |
| 6 | ERR-3 `GET /errors/:id` | Task 4 | Everyone — this is the most depended-on endpoint in the project |
| 7 | ERR-4 draft PATCH, ERR-5 submit | Task 4 | Frontend LOGFORM-1 |
| 8 | STATUS-1 `PATCH /errors/:id/status` | Task 6 | **P2 cannot build REB-2/REB-3/DEC-1 against your real API until this is merged to `main`** |
| 9 | ID-1 QA Error ID generator | none (parallel-safe with 4–8) | Task 4's real (non-mock) behavior |
| 10 | ERR-6 `GET /errors/:id/history` | Task 8 | Frontend HistoryTab |
| 11 | OWN-1 owner resolution | **P4's `GET /admin/ownership-mapping` merged to `main`** (until then, hardcode a stub) | Task 4's real (non-mock) behavior |
| 12 | SLA-1 SLA window snapshot | **P4's `GET /admin/sla-rules` merged to `main`** (stub until then) | SLA-2 |
| 13 | SLA-2 aging calculation | Task 12 | SLA-3; P4's dashboards' aging display |
| 14 | SLA-3 background breach/escalation job | Task 13, **P4's `GET /admin/escalation-matrix` merged**, **P3's notification-trigger endpoint merged** | Full end-to-end SLA flow |
| 15 | Frontend LOGIN-1 → AUDDASH-1 → LOGFORM-1 → DETAIL-1 (in that order) | Matching backend task above merged | P2/P3's tab components have a real shell to slot into |
| 16 | Shell Section 7 — 4 empty slots in `ErrorDetail`, `NotificationBellSlot` in `TopBar` | Task 15 | **P2 and P3 cannot slot their tabs in until this specific commit is merged — tell them the moment it's on `main`** |

**After each numbered task:** commit + push + open a small PR into `main` (see Section 7 of the repo-structure doc) — don't batch multiple tasks into one PR.

---

## 6. Backend Endpoints You Build

### TASK AUTH-1: `POST /login`
- Request: `{ "username": "...", "password": "..." }`
- Look up `users` by username, verify password hash, check `is_active` (401 if false).
- Issue a JWT / session token containing `user_id` and role codes.
- Update `last_login_at`.

### TASK AUTH-2: `GET /me`
- Response:
```json
{ "user_id": "uuid", "full_name": "Jane Doe", "roles": ["AUD"] }
```
This exact shape is what everyone's frontend `useAuth()`-style hook depends on — don't change it without telling all 3 teammates.

### TASK CAT-1: `GET /categories`
- Returns the full LOB → Category → Sub-category tree, including `requires_evidence_at_severity` on each category (needed by the Log New Error form's dynamic evidence rule).
- Open to any authenticated user (not just Admin) — everyone needs it for dropdowns.

### TASK ERR-1: `POST /errors` (create / submit / draft)
- Request:
```json
{
  "is_draft": false,
  "lob_id": "uuid", "category_id": "uuid", "sub_category_id": "uuid",
  "severity": "HIGH", "transaction_reference": "TXN-88213",
  "owner_user_id": "uuid",
  "date_of_occurrence": "2026-07-20", "date_of_detection": "2026-07-22",
  "description": "...", "initial_root_cause": "Process gap",
  "internal_notes": "Flag for calibration session",
  "client_impact_flag": true, "evidence_file_ids": ["uuid"]
}
```
- **Validation order, fail fast, name the exact field in the error message:**
  1. Mandatory fields present: `lob_id`, `category_id`, `severity`, `transaction_reference`, `date_of_occurrence`, `date_of_detection`, `description`.
  2. `date_of_occurrence <= today`.
  3. `date_of_detection >= date_of_occurrence`.
  4. `description` length >= 20 characters.
  5. **Evidence-required rule:** look up `categories.requires_evidence_at_severity` for the submitted category; if `severity` is in that array and `evidence_file_ids` is empty → `400` on field `evidence_file_ids`.
  6. **Idempotency:** if an `Idempotency-Key` header is present and an error with that key already exists (within 24h), return the original `201` response instead of creating a duplicate.
- **On success:**
  - `is_draft = true` → insert with `status = 'DRAFT'`, no QA Error ID generated yet.
  - `is_draft = false` → generate QA Error ID (TASK ID-1), resolve owner (TASK OWN-1), snapshot SLA windows (TASK SLA-1), set `status = 'OPEN_PENDING_ACK'`, `sla_clock_started_at = now()`, insert one `error_status_history` row (`to_status='OPEN_PENDING_ACK'`).
- Response `201`:
```json
{ "id": "uuid", "qa_error_id": "QE-BILL-2026-000481", "status": "OPEN_PENDING_ACK", "created_at": "..." }
```

### TASK ERR-2: `GET /errors` (list)
- Query params: `status`, `severity`, `lob_id`, `category_id`, `owner_user_id`, `page`, `page_size` (default 50).
- Response: `{ "items": [...], "page":.., "page_size":.., "total_count":.. }`, each item includes `id, qa_error_id, status, severity, owner_name, category_name, created_at`.

### TASK ERR-3: `GET /errors/:id`
- Full detail. **Omit the `internal_notes` key entirely** (not `null`) for callers whose role is `OPS_AGT`/`OPS_MGR`.

### TASK ERR-4: `PATCH /errors/:id/draft`
- Only the creating user, only while `is_draft = true`. Updates any field from the create schema. `409` if no longer a draft.

### TASK ERR-5: `POST /errors/:id/submit`
- Converts a draft into a real, tracked error: re-runs TASK ERR-1's validation, then generates ID, resolves owner, snapshots SLA, sets status.

### TASK ERR-6: `GET /errors/:id/history`
- Returns `error_status_history` rows for the error, ordered by `occurred_at DESC`. Redact history entries that reference internal notes for Operations viewers.

### TASK STATUS-1: `PATCH /errors/:id/status` — **the only way anyone else changes status**
- Request: `{ "to_status": "...", "reason": "..." }`, called exclusively by Person 2's rebuttal/decision endpoints (and your own SLA/escalation job internally).
- Validates the transition is legal per Section 4's state machine (reject with `409` if not), inserts one `error_status_history` row, updates `errors.status`, updates `closed_at` if moving into a closed status.

### TASK ID-1: QA Error ID Generator
- Format: `QE-{LOBCODE}-{YYYY}-{SEQ6}` (e.g. `QE-BILL-2026-000481`).
- Must be collision-safe under concurrent submissions for the same LOB+year — use a DB sequence or a `SELECT ... FOR UPDATE` counter row per `(lob_code, year)`.
- Resets to `000001` on Jan 1 for each LOB.
- No endpoint anywhere accepts `qa_error_id` as an editable field.

### TASK OWN-1: Owner Resolution at Creation
- If `owner_user_id` is provided on the create request → use it directly, done.
- Else → call Person 4's `GET /admin/ownership-mapping?lob_id=X&category_id=Y` **over HTTP** to get the default owner for this LOB/Category (Person 4 owns that table — you never query it directly from your database).
- If a mapping is found → snapshot it onto the error (`owner_user_id` or `owner_team_ref`).
- If no mapping is found → **do not fail the request.** Create the error anyway with `owner_user_id = NULL`, and include a `warnings` array in the `201` response body: `"warnings": ["No ownership mapping found — this error is unassigned."]`.

### TASK SLA-1: SLA Window Snapshot
- At creation/submit time, call Person 4's `GET /admin/sla-rules?lob_id=X&category_id=Y&severity=Z` over HTTP to get the applicable rebuttal/decision window in hours.
- Copy those hours onto `errors.sla_rebuttal_window_hours_snapshot` / `sla_decision_window_hours_snapshot`. **This snapshot is permanent** — later changes to Person 4's SLA rules never retroactively change already-open errors.

### TASK SLA-2: Aging Calculation
- Expose a function `calculate_sla_state(error) -> {elapsed_pct, state: "green"|"amber"|"red"}` using simple elapsed-time-since-`sla_clock_started_at` divided by the snapshot window (business-hours-awareness is a stretch goal — a flat elapsed-hours calculation is fine for MVP).
- Thresholds: Green < 70%, Amber 70–99%, Red >= 100%.
- This is the **single source of truth** for aging — Person 4's dashboards import/call your API for this value, never recompute it themselves.

### TASK SLA-3: Background Breach + Escalation Job
- A scheduled job (runs every ~1 minute) that:
  1. Finds all non-closed errors where `calculate_sla_state(error).elapsed_pct >= 100` and status is `OPEN_PENDING_ACK`/`OPEN_PENDING_RESPONSE` → transition to `SLA_BREACHED_ESCALATED` via your own internal status-update logic (same function `PATCH /errors/:id/status` uses internally, `performed_by_system = true`).
  2. For errors already in `SLA_BREACHED_ESCALATED`, calls Person 4's `GET /admin/escalation-matrix?lob_id=X` to get threshold hours per level, and increments `errors.current_escalation_level` when the next threshold is crossed (status stays the same — this doesn't change status, just the level).
  3. After any breach/escalation change, calls Person 3's `POST /notifications` (or your agreed notification-trigger endpoint) to alert the right person — coordinate the exact payload shape with Person 3 in Sprint 1.

---

## 7. Frontend Pages You Build

### TASK LOGIN-1: Login Page
- Simple username/password form → `POST /login` → store token → redirect to dashboard.

### TASK AUDDASH-1: Auditor Dashboard
- Header stat tiles: Open / Pending Rebuttal / Pending My Decision / Closed (this period) — computed from `GET /errors` filtered by status.
- "+ Log New Error" button → `/errors/new`.
- Filter bar: status, category, severity, date range, SLA state (green/amber/red chips).
- Data table: QA Error ID (linked), Category, Severity (color chip), Owner, Status (badge), Aging indicator, Created Date.
- Empty state: *"No errors logged yet — click '+ Log New Error' to get started."*

### TASK LOGFORM-1: Log New Error Form
- **Section A — Classification:** LOB dropdown (required) → Category dropdown (required, disabled until LOB chosen) → Sub-Category dropdown (conditional, only if the category has sub-categories) → Severity segmented control (Critical/High/Medium/Low, required).
- **Section B — Transaction Details:** Transaction Reference (required text) · Owner picker (optional, placeholder *"Leave blank to route to team queue"*) · Date of Occurrence (date picker, max = today) · Date of Detection (date picker, min = Date of Occurrence, default = today).
- **Section C — Finding:** Description (required, live character counter, 20-char minimum) · Initial Root Cause (dropdown + "Other" free text, optional) · Client Impact toggle (optional) · Internal Notes (optional, labeled *"Not visible to Operations"*).
- **Section D — Evidence:** upload zone. The "required/optional" label on this section must **flip live** the instant Severity becomes Critical/High, based on the selected category's `requires_evidence_at_severity` (from `GET /categories`). File chips show name, size, remove action, scan-status spinner (poll Person 3's evidence status).
- **Footer:** "Save as Draft" → `POST /errors` with `is_draft: true`. "Submit" → `POST /errors` with `is_draft: false`, disabled until validation passes, but if attempted anyway, show an inline banner naming every failing field.
- On success: toast with the generated `qa_error_id`, redirect to `/errors/{qa_error_id}`.
- Generate a client-side idempotency key once per form load, reuse it if the user double-clicks Submit.

### TASK DETAIL-1: Error Detail — Header + Overview + History
- Header: QA Error ID, status badge, severity chip, aging indicator (e.g. "2d 4h remaining" or "Breached — Escalated Level 2" in red, computed from `elapsed_pct`/`state`).
- **Overview tab:** all Section A/B/C fields read-only. Render `internal_notes` only if the key exists in the API response (server already hides it for unauthorized roles — don't add a second client-side check).
- **History tab:** timeline of `GET /errors/:id/history`, most recent first, in plain language (e.g. "SLA breached — escalated to Level 1") rather than raw codes.

---

## 8. Section — The Shared Shell (`ErrorDetail.jsx`)
You build the page shell with 4 placeholder slots:

```jsx
<InfoTab />        {/* you build this — Overview */}
<RespondTab />     {/* Person 2 imports their own file here */}
<EvidenceTab />     {/* Person 3 imports their own file here */}
<HistoryTab />      {/* you build this */}
```
You own `InfoTab`/`HistoryTab` fully. `RespondTab`/`EvidenceTab` are empty placeholders — Person 2 and Person 3 each add **one import line** to this file when their component is ready. This is the only shared frontend file in the project; treat every edit to it as a one-line addition, never a rewrite.

If Person 3 needs a slot in a shared top bar/nav for the notification bell, add an empty `<NotificationBellSlot />` placeholder there too, same pattern.

---

## 9. What Others Call From You
- `GET /errors/:id`, `GET /errors`, `GET /categories`, `GET /me` — used by everyone
- `PATCH /errors/:id/status` — used exclusively by Person 2
- `calculate_sla_state(error)` logic — Person 4's dashboards read the `sla_state` field you return on `GET /errors`, never recompute it

## What You Call From Others
- Person 4's `GET /admin/ownership-mapping` and `GET /admin/sla-rules` — at error creation time
- Person 4's `GET /admin/escalation-matrix` — in your SLA breach/escalation job
- Person 3's notification-trigger endpoint — after status changes, breaches, and escalations

---

## 10. Do's
✅ Finish `POST /errors`, `GET /errors`, `GET /errors/:id`, `PATCH /errors/:id/status` in Sprint 1 — publish the exact JSON shape immediately, even before every field works, so others can build against it.
✅ Keep `PATCH /errors/:id/status` generic — validate the transition, don't hardcode "only Person 2 can call this" in code (enforce via the state machine rules, not caller identity).
✅ Call Person 4's config APIs (ownership mapping, SLA rules, escalation matrix) over HTTP — never assume their table structure or query it directly.
✅ Pull `main` and merge into your branch every couple of days.

## 11. Don'ts
🚫 Don't import any file from `person2_*`, `person3_*`, `person4_*` folders — backend or frontend.
🚫 Don't let anyone else write to `users`, `errors`, or `error_status_history`.
🚫 Don't change the response shape of `GET /errors/:id`, `GET /me`, or `GET /errors` after Sprint 2 without telling all 3 teammates.
🚫 Don't build the Ownership Mapping or SLA Rules admin screens yourself — you only consume those APIs; Person 4 owns the config.

---

## 12. Suggested Sprint Plan

| Sprint | Task |
|---|---|
| 1 | DB setup, login, `users`/`categories`/`errors` tables + API, publish exact JSON shapes |
| 2 | Log New Error form, error list, `PATCH /errors/:id/status`, `ErrorDetail.jsx` shell with 4 empty slots |
| 3 | ID generator load-testing, ownership resolution + SLA snapshot wired to Person 4's real API, History tab |
| 4 | SLA aging/breach/escalation background job, wire notification triggers to Person 3 |
| 5 | Polish, bug fixes, support teammates plugging into the shell |
| 6 | Integration testing across all 4 people's features |
