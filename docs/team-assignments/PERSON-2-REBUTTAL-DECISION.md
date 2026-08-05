# QEMS — PERSON 2: Rebuttal & Decision Workflow
### SINGLE SOURCE OF TRUTH — Low-Level Task Spec
### Depends on Person 1's `/errors/:id` and `/errors/:id/status` — build against mock data first, swap to real once live.

| Field | Value |
|---|---|
| Branch | `feature/person2-rebuttal-decision` |
| Base branch | `main` |
| Never touch | `person1_foundation/`, `person3_*`, `person4_*` — backend or frontend |

---

## 1. Your Mission
You own the Accept/Dispute flow and the QA decision (Upheld / Overturned / Partially Upheld), including Reopen and rebuttal-correction. You never write to `errors` or `error_status_history` — every status change goes through Person 1's `PATCH /errors/:id/status`.

---

## 2. Folder Structure
### ⚠️ This must match `docs/team-assignments/00-REPO-STRUCTURE-AND-GIT-WORKFLOW.md` exactly. If they ever disagree, that file wins.

```
backend/app/
├── db/models/
│   ├── rebuttal.py
│   └── decision.py
├── rebuttal/                 # accept/rebut/reopen/rebuttal-correction
└── decision/                 # decision + reopen-decision logic

frontend/src/features/person2_rebuttal_decision/
├── RespondTab.tsx             # imported into Person 1's ErrorDetail shell
├── DecisionTab.tsx            # imported into Person 1's ErrorDetail shell
├── RebuttalAction.tsx         # Accept/Dispute buttons + forms — imports EvidenceUploadWidget from person3_evidence_notifications/ (the one allowed cross-import, see Section 3 of the repo-structure doc)
└── DecisionAction.tsx         # decision radio + rationale form

Migrations: alembic/versions/p2_000X_<description>.py — only you write these.
Tests: backend/tests/person2_rebuttal_decision/
```

---

## 3. Database Tables You Own — Exact Columns

### `rebuttals`
`id` (UUID PK) · `error_id` (FK errors) · `cycle_number` (int — increments each time an error is reopened and re-rebutted) · `justification` (text, CHECK length >= 20) · `evidence_file_ids` (array of UUIDs, references Person 3's `evidence_files`, no FK enforced across the boundary — just store the IDs) · `submitted_by_user_id` · `submitted_at`

**No update/delete endpoint ever exists on this table.** A rebuttal is immutable once submitted — the only way to "change" it is a full Reopen (new cycle) or the narrow rebuttal-correction path (Section 6).

### `decisions`
`id` (UUID PK) · `error_id` (FK errors) · `cycle_number` (int) · `decision` (CHECK IN `UPHELD,OVERTURNED,PARTIALLY_UPHELD`) · `rationale` (text, CHECK length >= 20) · `partial_breakdown` (text, nullable — required only when `decision = PARTIALLY_UPHELD`) · `decided_by_user_id` · `decided_at`

Never delete a `decisions` row, even after a Reopen — old decisions stay visible in history forever.

---

## 4. Task Sequence — Complete In This Order

**Before every session:** `git checkout main && git pull origin main && git checkout feature/person2-rebuttal-decision && git merge main`

| # | Task | Depends on | Unblocks |
|---|---|---|---|
| 1 | Design RespondTab/DecisionTab UI against **mock** `GET /errors/:id` matching Person 1's published Sprint 1 JSON shape | Person 1's Task 4 (shape published — doesn't need to be merged, just documented) | Nothing blocks on this — pure UI groundwork |
| 2 | REB-1 `POST /errors/:id/acknowledge` | **Person 1's `STATUS-1` merged to `main`** | REB-2 |
| 3 | REB-2 `POST /errors/:id/accept` | Task 2 | DEC-1 |
| 4 | REB-3 `POST /errors/:id/rebut` | Task 2 | DEC-1; frontend RebuttalAction |
| 5 | DEC-1 `POST /errors/:id/decision` | Tasks 3–4 | REB-4 |
| 6 | REB-4 `POST /errors/:id/reopen` | Task 5 | REB-5 |
| 7 | REB-5 `POST /errors/:id/rebuttal-correction` | Task 6 | — |
| 8 | Frontend RESPONDTAB-1 + REBUTTALACTION-1 | Tasks 3–4 merged; **Person 3's `EvidenceUploadWidget` merged to `main`** (you import it directly) | Slotting task below |
| 9 | Frontend DECISIONTAB-1 + DECISIONACTION-1 | Task 5 merged | Slotting task below |
| 10 | SLOT-1 — add your two import lines into Person 1's `ErrorDetail` shell | **Person 1's Task 16 (shell + 4 empty slots) merged to `main`** — tell Person 1 the moment you're ready so they can confirm the shell is live | Full end-to-end Respond/Decision UI |

**After each numbered task:** commit + push + open a small PR into `main` — don't batch tasks into one PR.

---

## 5. Backend Endpoints You Build

### TASK REB-1: `POST /errors/:id/acknowledge`
- Called automatically by the frontend the first time the owner opens the Error Detail page.
- **Idempotent** — only transitions once. RBAC: caller must be the resolved owner (or their manager acting on their behalf).
- On first call: call Person 1's `PATCH /errors/:id/status` with `to_status: "OPEN_PENDING_RESPONSE"`.
- Does **not** reset or pause the SLA clock.

### TASK REB-2: `POST /errors/:id/accept`
- RBAC: resolved owner only.
- Guard: current status must be `OPEN_PENDING_ACK`, `OPEN_PENDING_RESPONSE`, or `SLA_BREACHED_ESCALATED` — else `409`.
- Request: `{ "acknowledgement_comment": "..." }` (optional).
- On success: call Person 1's `PATCH /errors/:id/status` with `to_status: "ACCEPTED_PENDING_CLOSURE"`. No local table insert for a plain accept — it's just a status change (you may optionally log the comment as a `decisions`-adjacent note if you want a record of it, but it's not required for MVP).

### TASK REB-3: `POST /errors/:id/rebut`
- RBAC: resolved owner only.
- Guard: same statuses as TASK REB-2.
- Request: `{ "justification": "...", "evidence_file_ids": ["uuid"] }`.
- **Validation:**
  - `justification` length >= 20 characters.
  - `justification` must NOT be an exact match (after trimming whitespace) to the error's `description` — call Person 1's `GET /errors/:id` to fetch `description` for comparison. `400` if identical.
  - Caller must be the resolved owner — `403` otherwise.
  - Check no existing rebuttal already exists for this error at the current `cycle_number` — `409` if a rebuttal was already submitted this cycle.
- On success: insert a `rebuttals` row (`cycle_number` = current max for this error + 1, or 1 if first), call Person 1's `PATCH /errors/:id/status` with `to_status: "REBUTTAL_SUBMITTED_PENDING_QA_REVIEW"`. Evidence IDs passed through get tagged `stage='REBUTTAL'` — that tagging happens on Person 3's side when they store the file, you just pass the IDs along.

### TASK DEC-1: `POST /errors/:id/decision`
- RBAC: original logger (`AUD` who logged this specific error) OR a QA Lead (`QAL`) scoped to the error's LOB — check via Person 1's `GET /errors/:id` (`logged_by_user_id`).
- **Critical guard:** if current status is `ACCEPTED_PENDING_CLOSURE`, **only** `decision: "UPHELD"` is valid. Attempting `OVERTURNED` or `PARTIALLY_UPHELD` from this state must return `422` with a clear error code like `INVALID_DECISION_FOR_STATE`. This is a hard server-side rule — never rely on the UI graying out the option.
- If current status is `REBUTTAL_SUBMITTED_PENDING_QA_REVIEW`, all three decision values are valid.
- Request:
```json
{ "decision": "PARTIALLY_UPHELD", "rationale": "...", "partial_breakdown": "..." }
```
- **Validation:** `rationale` >= 20 chars; `partial_breakdown` required (non-empty) if `decision == PARTIALLY_UPHELD`, otherwise ignored.
- On success: insert a `decisions` row, call Person 1's `PATCH /errors/:id/status` with `to_status` = `CLOSED_UPHELD` / `CLOSED_OVERTURNED` / `CLOSED_PARTIAL` matching the decision value.
- **After this call, the record becomes read-only** for every mutating endpoint you own except Reopen — enforce this: at the top of `accept`, `rebut`, and `decision`, check if current status is one of the three closed states and return `409` immediately if so.

### TASK REB-4: `POST /errors/:id/reopen`
- RBAC: `QAL` only.
- Guard: current status must be `CLOSED_UPHELD`, `CLOSED_OVERTURNED`, or `CLOSED_PARTIAL`.
- Request: `{ "reason": "..." }` — mandatory, non-empty.
- On success: call Person 1's `PATCH /errors/:id/status` with `to_status: "REOPENED"` and `reason`, then immediately call it again with `to_status: "REBUTTAL_SUBMITTED_PENDING_QA_REVIEW"` (system-driven auto-route). This effectively starts a new cycle — the next rebuttal/decision inserted should use `cycle_number` + 1.
- Original `decisions`/`rebuttals` rows from the prior cycle **must remain visible** — never delete or overwrite them.

### TASK REB-5: `POST /errors/:id/rebuttal-correction`
- RBAC: `AUD` or `QAL`.
- Guard: current status must be `OPEN_PENDING_ACK` or `OPEN_PENDING_RESPONSE` (a narrower, pre-decision correction path — not the same as Reopen).
- Request: `{ "reason": "..." }`.
- On success: unlock a one-time re-edit window for the owner (implementation: a transient flag, or move status back a step if it had advanced). Log the action; no notification required.

---

## 6. Frontend Components You Build

### TASK RESPONDTAB-1: `RespondTab.jsx`
- If a rebuttal exists: show justification text, submitted-by, submitted-at, and its evidence (fetch via Person 3's `GET /errors/:id/evidence?stage=REBUTTAL`).
- If eligible for action, render `RebuttalAction.jsx` inline in this tab (not a separate route).

### TASK REBUTTALACTION-1: `RebuttalAction.jsx`
- Two large, clearly differentiated buttons: **"Accept — I agree this is a valid finding"** and **"Dispute — I want to rebut this finding."**
- **Accept path:** reveals optional comment field + Confirm → `POST /errors/:id/accept`.
- **Dispute path:** reveals mandatory justification textarea (20-char live counter) + optional evidence upload (tag `stage=REBUTTAL`, reuse Person 3's upload widget) + Submit.
  - Submit disabled until 20 chars met.
  - Inline warning if the text is an exact match to the original description (client-side pre-check purely for UX — server is the real enforcement).
  - Confirmation modal before submit: *"You won't be able to edit this rebuttal after submitting — a QA reviewer will need to reopen it for corrections."*
- On submit success: call `POST /errors/:id/rebut`, then refresh the Error Detail view.

### TASK DECISIONTAB-1: `DecisionTab.jsx`
- If a decision exists: show outcome (color-coded — Upheld=neutral, Overturned=green, Partially Upheld=amber), rationale, decided-by, decided-at.
- If eligible, render `DecisionAction.jsx` inline.

### TASK DECISIONACTION-1: `DecisionAction.jsx`
- Three radio cards: Upheld / Overturned / Partially Upheld, each with a one-line description.
- **State-guard rendering:** if current status is `ACCEPTED_PENDING_CLOSURE`, show "Overturned" and "Partially Upheld" as visibly present but **disabled**, with tooltip: *"Not available — owner accepted this finding. Reopen first if this needs to change."* Never simply hide them.
- Rationale textarea (20-char minimum, live counter, required).
- If "Partially Upheld" selected → an additional required "Breakdown" textarea appears.
- Submit button labeled "Record Final Decision" with a confirmation modal (decision moves the record to read-only) → `POST /errors/:id/decision`.
- If the server still returns `422 INVALID_DECISION_FOR_STATE` despite client-side disabling (e.g. stale UI state), surface that exact message rather than a generic error toast.

### TASK SLOT-1: Slotting into Person 1's shell
Once your components are ready, **you** add the import line into `ErrorDetail.jsx` yourself:
```jsx
import RespondTab from '../person2_rebuttal_decision/RespondTab';
import DecisionTab from '../person2_rebuttal_decision/DecisionTab';
```
This is the only edit you ever make to a file outside your own folder — one import line, nothing else.

---

## 7. What You Call From Others
- `GET /errors/:id` (Person 1) — current status, `logged_by_user_id`, `description` (for the identical-text check)
- `PATCH /errors/:id/status` (Person 1) — the only way you advance the workflow
- `GET /errors/:id/evidence?stage=REBUTTAL` (Person 3) — to display rebuttal-linked files

## What Others Call From You
- Nobody calls your API directly at MVP. Person 3 may listen for your status changes (e.g., to fire a "rebuttal submitted" notification) — Person 1's SLA/notification trigger step (in their status-update logic) handles alerting Person 3, so you don't need a direct integration with Person 3.

---

## 8. Do's
✅ Build your UI against mock `GET /errors/:id` data in Sprint 1, matching the exact JSON shape Person 1 publishes.
✅ Always call `PATCH /errors/:id/status` after your own actions — the frontend changing local state is not enough.
✅ Enforce the `ACCEPTED_PENDING_CLOSURE` → only-UPHELD rule on the server, not just in the UI.
✅ Add your own import lines into `ErrorDetail.jsx` yourself when ready — don't wait for Person 1.

## 9. Don'ts
🚫 Don't write to `errors` or `error_status_history` — only Person 1's code touches those tables.
🚫 Don't import Person 1's, 3's, or 4's backend modules directly — call their API URLs with `fetch()`.
🚫 Don't rewrite `ErrorDetail.jsx` beyond your two import lines and rendering your tabs.
🚫 Don't allow any PATCH/PUT endpoint on `rebuttals` or `decisions` — they're insert-only, full stop.

---

## 10. Suggested Sprint Plan

| Sprint | Task |
|---|---|
| 1 | Design Respond/Decision UI against mock error data |
| 2 | Build `rebuttal_decision_api.py` (accept/rebut/decision), wire to Person 1's real API once live |
| 3 | Reopen + rebuttal-correction endpoints, slot `RespondTab`/`DecisionTab` into Person 1's shell |
| 4 | Polish, edge cases (stale UI state, race conditions on double-submit) |
| 5 | Integration testing across all 4 people's features |
