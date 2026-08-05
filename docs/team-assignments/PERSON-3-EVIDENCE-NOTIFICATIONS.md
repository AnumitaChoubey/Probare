# QEMS — PERSON 3: Evidence & Notifications
### SINGLE SOURCE OF TRUTH — Low-Level Task Spec
### Depends on an `error_id` existing — build against mock data first, swap to real once Person 1's API is live.

| Field | Value |
|---|---|
| Branch | `feature/person3-evidence-notifications` |
| Base branch | `main` |
| Never touch | `person1_foundation/`, `person2_*`, `person4_*` — backend or frontend |

---

## 1. Your Mission
You own file-upload evidence for errors and the in-app notification system (bell icon + dropdown), including the email dispatch that backs it.

---

## 2. Folder Structure
### ⚠️ This must match `docs/team-assignments/00-REPO-STRUCTURE-AND-GIT-WORKFLOW.md` exactly. If they ever disagree, that file wins.

```
backend/app/
├── db/models/
│   ├── evidence_file.py
│   ├── evidence_access_log.py
│   ├── notification_template.py
│   ├── notifications_log.py
│   └── in_app_notification.py
├── evidence/                  # upload/list/download/supersede
├── notifications/             # worker + in-app notification endpoints
├── email/                     # SMTP client
└── admin/
    └── notification_templates.py

frontend/src/features/person3_evidence_notifications/
├── EvidenceTab.tsx             # imported into Person 1's ErrorDetail shell
├── EvidenceUploadWidget.tsx    # ⚠️ Person 2's RebuttalAction imports this directly — see Section 3 of the repo-structure doc. Never change its prop signature after Sprint 2 without telling Person 2.
└── NotificationBell.tsx        # imported into Person 1's shared TopBar slot

Migrations: alembic/versions/p3_000X_<description>.py — only you write these.
Tests: backend/tests/person3_evidence_notifications/
Local dev file storage: backend/app/evidence/uploads/ (gitignored)
```

---

## 3. Database Tables You Own — Exact Columns

### `evidence_files`
`id` (UUID PK) · `error_id` (FK — reference by ID only, no cross-schema FK constraint required) · `uploaded_by_user_id` · `stage` (CHECK IN `ORIGINAL_LOGGING,REBUTTAL,DECISION`) · `file_name` · `file_type` · `file_size_bytes` · `storage_uri` · `checksum_sha256` · `malware_scan_status` (CHECK IN `PENDING,CLEAN,INFECTED,FAILED`, default `PENDING`) · `is_current_version` (bool, default true) · `supersedes_evidence_id` (nullable FK to another `evidence_files` row) · `uploaded_at`

**No DELETE endpoint exists anywhere for evidence.** A corrected file is a *new* row referencing the old one via `supersedes_evidence_id`; the old row's `is_current_version` flips to `false` but is never removed.

### `evidence_access_log`
`id` (bigserial) · `evidence_id` (FK) · `accessed_by_user_id` · `action` (CHECK IN `VIEW,DOWNLOAD`) · `accessed_at`

### `notification_templates`
`code` (PK, e.g. `NT-01`..`NT-08`) · `subject_template` · `body_template` (with `{Token}` placeholders like `{QAErrorID}`, `{OwnerName}`, `{Severity}`, `{DueDate}`) · `version` (int, incremented on edit) · `is_active`

### `notifications_log` (email/outbound channel)
`id` (bigserial) · `error_id` · `template_code` (FK notification_templates) · `channel` (default `EMAIL`) · `recipient_user_id` · `status` (CHECK IN `QUEUED,SENT,DELIVERED,BOUNCED,FAILED`) · `failure_reason` (nullable) · `dispatched_at` (nullable) · `created_at`

### `in_app_notifications`
`id` (bigserial) · `user_id` · `error_id` · `template_code` · `message` (rendered text) · `is_read` (bool, default false) · `created_at`

---

## 4. Task Sequence — Complete In This Order

**Before every session:** `git checkout main && git pull origin main && git checkout feature/person3-evidence-notifications && git merge main`

| # | Task | Depends on | Unblocks |
|---|---|---|---|
| 1 | Design Evidence/Notification UI against **mock** error data | Person 1's Task 4 (shape published) | Nothing blocks on this |
| 2 | EVID-1 upload + mock malware-scanner stub | **Person 1's `ERR-1`/`ERR-4` merged** (need a real or draft `error_id` to attach to) | EVID-2, EVID-3 |
| 3 | EVID-2 scan callback webhook | Task 2 | EVID-4 |
| 4 | EVID-3 `GET /errors/:id/evidence` | Task 2 | Frontend EvidenceTab |
| 5 | EVID-4 `GET /evidence/:id/download` | Task 3 | — |
| 6 | EVID-5 `POST /evidence/:id/supersede` | Task 5 | — |
| 7 | Frontend EVIDENCEUPLOAD-1 (`EvidenceUploadWidget`) | Task 2 | **Person 2 is blocked on this merging to `main` before they can finish RebuttalAction (Task 8 in their doc) — tell them the moment it's live** |
| 8 | Frontend EVIDENCETAB-1 | Task 4 | Slotting task below |
| 9 | NOTIF-1 background worker + EMAIL-1 SMTP client | **Freeze the notification-trigger contract with Person 1 first** (Sprint 1 conversation, not a code dependency) | NOTIF-2; **Person 1's `SLA-3` task is blocked on this endpoint existing** |
| 10 | NOTIF-2 in-app notification endpoints | Task 9 | Frontend NotificationBell |
| 11 | Frontend NOTIFBELL-1 | Task 10 | Slotting task below |
| 12 | SLOT-1 — add `EvidenceTab` import into Person 1's `ErrorDetail` shell, add `NotificationBell` import into Person 1's `TopBar` slot | **Person 1's Task 16 (shell + slots) merged to `main`** — confirm with Person 1 it's live before you touch either file | Full end-to-end Evidence/Notification UI |

**After each numbered task:** commit + push + open a small PR into `main` — don't batch tasks into one PR.

---

## 5. Backend Endpoints You Build

### TASK EVID-1: `POST /errors/:id/evidence` (upload)
- RBAC: caller must be a named party to the record (logger or owner) or hold QA/Admin — check via Person 1's `GET /errors/:id`.
- **Steps:**
  1. Validate file type against your configured allowed types (see TASK ADMIN-EVID-1).
  2. Validate size <= configured max (default 25MB) and file count <= configured max.
  3. Compute a SHA-256 checksum of the file content.
  4. Store the file (local disk for dev, swap for S3/Blob later), get back a `storage_uri`.
  5. Insert an `evidence_files` row with `malware_scan_status='PENDING'`, `stage` passed by the caller (Person 1's Log New Error form sends `ORIGINAL_LOGGING`, Person 2's rebuttal form sends `REBUTTAL`).
  6. (Optional, stretch goal) submit the file to a malware scanner — for MVP, use a mock stub that auto-marks files `CLEAN` after a short delay so upload isn't blocked on real integration.
  7. Return `201`: `{ "id": "uuid", "file_name": "screenshot.png", "malware_scan_status": "PENDING" }`.
- **Handling uploads before an error has an ID (new-error form):** support an upload path that doesn't require a committed `error_id` yet — accept the file and return an `id`, and let Person 1's create-error request pass those returned IDs in as `evidence_file_ids`. Agree the exact contract with Person 1 in Sprint 1.

### TASK EVID-2: Mock/real malware scan callback
- **Endpoint:** `POST /internal/webhooks/malware-scan-result` (internal-only). Updates `evidence_files.malware_scan_status` to `CLEAN`/`INFECTED`/`FAILED`.
- Files stay non-downloadable (any status except `CLEAN`) until scanned clean.

### TASK EVID-3: `GET /errors/:id/evidence`
- Query param: `stage` (optional filter). Scope: Operations roles only see evidence for errors where they're a named party (check via Person 1's API).
- Group/return separately by `stage` so the frontend can show "Auditor Evidence" vs "Rebuttal Evidence" sections.

### TASK EVID-4: `GET /evidence/:id/download`
- Streams the file or returns a short-lived signed URL.
- **`403` if `malware_scan_status != 'CLEAN'`** — hard block, no exceptions.
- Every view/download inserts an `evidence_access_log` row.

### TASK EVID-5: `POST /evidence/:id/supersede`
- Uploads a corrected replacement: new `evidence_files` row with `supersedes_evidence_id` = old file's ID, `is_current_version=true`; flips old row's `is_current_version=false`. Never deletes the old row.

### TASK NOTIF-1: Background notification worker
- **Files:** `notification_worker.py`
- Consumes an internal trigger (called by Person 1 after status changes, breaches, and escalations, and internally by your own accept/rebut/decision listeners if you choose to hook directly instead — agree the trigger mechanism with Person 1 in Sprint 1: either they call your `POST /notifications/trigger` endpoint, or you poll their `error_status_history` table via `GET /errors/:id/history` — **recommended: Person 1 calls your endpoint directly, simplest for MVP**).
- For each trigger: look up the matching `notification_templates` row, render `{Token}` placeholders using values from the payload.
- Insert a `notifications_log` row with `status='QUEUED'` **before** attempting to send.
- Call `email_client.send()` to actually send. On success → `status='SENT'`. On failure → `status='FAILED'`, store `failure_reason`.
- **Independent of email outcome, also insert an `in_app_notifications` row** — this must happen even if the email send throws; put it in its own try/except block, not nested inside the email-send try/except.

### TASK EMAIL-1: SMTP integration
- Simple SMTP relay client wrapped behind a small interface (`send(to, subject, body)`) so a different channel (Teams/Slack) could be swapped in later without touching the worker.

### TASK NOTIF-2: In-app Notification Center endpoints
- `GET /notifications?unread_only=true` — list for the logged-in user, paginated, most recent first.
- `POST /notifications/mark-all-read` — bulk mark all as read for the current user.
- `POST /notifications/:id/read` — mark one as read (fired on click-through).
- Each response item includes enough to render an icon (mapped from `template_code`), a one-line `message`, and a `timestamp`.

### TASK ADMIN-EVID-1: Evidence Rules config (simplified admin)
- Store allowed file types, max file size, max file count as simple config rows you own (or a single config row/table).
- The **per-severity mandatory-evidence toggle** actually lives on Person 1's `categories.requires_evidence_at_severity` — you don't own that field, just read it when validating uploads if needed.

---

## 6. Frontend Components You Build

### TASK EVIDENCETAB-1: `EvidenceTab.jsx`
- Two sections: "Auditor Evidence" (`stage=ORIGINAL_LOGGING`) and "Rebuttal Evidence" (`stage=REBUTTAL`).
- Each file: uploader, timestamp, file type icon, Download action — **disabled with a "Scanning..." label** if `malware_scan_status != 'CLEAN'`.
- Superseded versions shown collapsed under "Version History" per file (via `supersedes_evidence_id` chain), never removed from view.

### TASK EVIDENCEUPLOAD-1: `EvidenceUploadWidget.jsx`
- Drag-and-drop / browse zone, reused by both the Log New Error form (Person 1) and the Rebuttal action (Person 2) — build it as a standalone, reusable component that accepts a `stage` prop.
- File chips: filename, size, remove-before-submit action, scan-status spinner.
- Calls `POST /errors/:id/evidence` (or the pre-error-ID upload path for the new-error form — see TASK EVID-1 note).

### TASK NOTIFBELL-1: `NotificationBell.jsx`
- Bell icon with unread-count badge — poll `GET /notifications?unread_only=true` count every 30–60 seconds.
- Dropdown panel: list of recent notifications, read/unread visual distinction, each row shows icon, one-line message, timestamp, click-through to `/errors/{qa_error_id}` (a route owned by Person 1 — just navigate to it).
- "Mark all as read" → `POST /notifications/mark-all-read`.
- Individual click → `POST /notifications/:id/read` then navigate.

### TASK SLOT-1: Slotting in
Once ready, **you** add the import lines yourself:
```jsx
// inside Person 1's ErrorDetail.jsx
import EvidenceTab from '../person3_evidence_notifications/EvidenceTab';

// inside the shared TopBar/Layout component
import NotificationBell from '../person3_evidence_notifications/NotificationBell';
```
If there's no shared top bar slot yet, ask Person 1 to add an empty placeholder there (same pattern as `ErrorDetail.jsx`'s tab slots) rather than building a second nav bar yourself.

---

## 7. What You Call From Others
- `GET /errors/:id` (Person 1) — to check who's a named party to an error, and to display which error an evidence file or notification belongs to
- `GET /me` (Person 1) — to know the logged-in user, for filtering notifications

## What Others Call From You
- Person 1 calls your notification-trigger endpoint after status changes, SLA breaches, and escalations
- Person 2's Rebuttal form calls your `POST /errors/:id/evidence` (via the shared upload widget) and `GET /errors/:id/evidence?stage=REBUTTAL`

---

## 8. Do's
✅ Design your evidence upload and notification UI against mock error data in Sprint 1.
✅ Build the mock malware-scanner stub first (auto-`CLEAN` after a delay) so evidence upload isn't blocked on a real integration.
✅ Insert the `in_app_notifications` row independently of email send/fail — never let an email failure silently drop the in-app alert.
✅ Agree the exact notification-trigger contract with Person 1 in Sprint 1 and freeze it.

## 9. Don'ts
🚫 Don't import Person 1's, 2's, or 4's backend modules directly — call their API URLs with `fetch()`.
🚫 Don't touch `errors`, `rebuttals`, or `decisions` tables.
🚫 Don't build a second top navigation bar — reuse the shared one via a placeholder slot.
🚫 Don't allow any DELETE endpoint on `evidence_files` — superseding is the only correction path, ever.
🚫 Don't let a failed email block or roll back the workflow action that triggered it — your worker must never throw back into another person's request path.

---

## 10. Suggested Sprint Plan

| Sprint | Task |
|---|---|
| 1 | Design evidence upload + notification UI against mock error data; freeze notification-trigger contract with Person 1 |
| 2 | Build evidence upload/list/download endpoints against a mock scanner stub |
| 3 | Build notification worker, email client, in-app notification endpoints |
| 4 | Slot `EvidenceTab` into Person 1's `ErrorDetail.jsx`, slot `NotificationBell` into shared top bar |
| 5 | Integration testing across all 4 people's features |
