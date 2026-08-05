# UI/UX Screen-by-Screen Wireframe Specification
## QEMS — Quality Error Management System

| Field | Value |
|---|---|
| Document Version | 1.0 |
| Format | Annotated layout specs (markdown) — component list, layout regions, states, and interactions per screen |
| Depends On | FSD, FRS, RBAC Matrix, Workflow/State Machine, REST API Design |
| Target Viewports | Desktop (≥1280px), Tablet (≥768px) — responsive; native mobile app out of scope Phase 1 (NFR-UX-03) |

---

## 1. Global Layout Shell

**Applies to every authenticated screen.**

| Region | Contents |
|---|---|
| Top bar | QEMS logo/name (left), global search (optional Phase 1.1), notification bell icon with unread badge (center-right), user avatar/menu with role indicator + logout (right) |
| Left navigation (collapsible) | Role-driven menu items: Dashboard, Log New Error (Auditor only), My Errors, Team View (QAL/OPS_MGR), Leadership View (QA_GOV), Admin Console (ADMIN), Escalations |
| Main content area | Screen-specific content (detailed below) |
| Footer (minimal) | Build/version tag, link to help/feedback |

**Global interaction rules:**
- Notification bell opens a dropdown panel listing unread/recent `in_app_notifications`, each linking directly to the relevant error record.
- Left nav items are RBAC-filtered — a user only ever sees entries for actions they're permitted to take (RBAC Matrix §2–4).
- Any screen showing error data respects field-level redaction (Internal Notes hidden from Operations roles) at render time, driven by what the API actually returns (never client-side hiding of data the API shouldn't have sent).

---

## 2. Screen: Login / Pending Access

**Route:** `/login`, `/pending-access`

- Login screen: single "Sign in with [Company SSO]" button; no username/password fields (SSO-only, per NFR-SEC-01).
- On successful SSO with no assigned role: redirect to Pending Access screen — centered message: "Your account is set up but no role has been assigned yet. Contact your QA Administrator." No navigation available.

---

## 3. Screen: Auditor Dashboard

**Route:** `/dashboard` (default landing for `AUD` role)
**RBAC:** `AUD`

**Layout regions:**
1. **Header strip:** "My Logged Errors" count summary — Open / Pending Rebuttal / Pending My Decision / Closed (this period), each as a clickable stat tile that pre-filters the table below.
2. **Primary action:** prominent "+ Log New Error" button, top-right of content area.
3. **Filter bar:** Status (multi-select), Category, Severity, Date range, SLA state (Green/Amber/Red chips).
4. **Data table** columns: QA Error ID (linked), Category, Severity (color chip), Owner, Status (badge), Aging indicator (color bar + %), Created Date. Sortable columns, pagination controls (matches API `page`/`page_size`).
5. **"Awaiting My Decision" side panel/tab:** errors in `REBUTTAL_SUBMITTED_PENDING_QA_REVIEW` or `ACCEPTED_PENDING_CLOSURE` where this auditor is the original logger — surfaced distinctly since it requires *my* action, not just monitoring.

**Empty state:** "No errors logged yet — click '+ Log New Error' to get started."

---

## 4. Screen: Log New Error (Form)

**Route:** `/errors/new`
**RBAC:** `AUD`

**Layout:** single-column form, grouped into collapsible sections for readability on a long form:

**Section A — Classification**
- LOB / Process Area (dropdown, required)
- Error Category (dependent dropdown, required, disabled until LOB selected)
- Error Sub-Category (dependent dropdown, conditional)
- Severity (segmented control: Critical / High / Medium / Low, required)

**Section B — Transaction Details**
- Transaction/Interaction Reference ID (text, required)
- Agent/Owner Identified (searchable user-picker, optional — placeholder: "Leave blank to route to team queue")
- Date of Occurrence (date picker, required, max=today)
- Date of Audit/Detection (date picker, required, default=today, min=Date of Occurrence)

**Section C — Finding**
- Error Description (rich text, required, live character counter showing 20-char minimum)
- Initial Root Cause (dropdown + "Other" free text, optional)
- Client/Contractual Impact (toggle switch, optional)
- Internal Notes (text area, optional, labeled clearly "Not visible to Operations")

**Section D — Evidence**
- Drag-and-drop / browse file upload zone
- Dynamic required-indicator: turns from "optional" to "required" label automatically when Severity is set to Critical or High (mirrors FR-02-005 in real time, not just on submit)
- Uploaded file chips with filename, size, remove-before-submit action, scan-status spinner

**Footer actions:** "Save as Draft" (secondary), "Submit" (primary). Submit button disabled until all mandatory fields + conditional evidence rule are satisfied — with an inline validation summary banner if the user attempts submit prematurely (never a silent disabled button with no explanation).

**Post-submit:** success toast showing the generated QA Error ID, auto-redirect to the new record's detail screen.

---

## 5. Screen: Error Detail (Universal Record View)

**Route:** `/errors/{qa_error_id}`
**RBAC:** visibility per RBAC Matrix §2 field-level rules; actions rendered conditionally by role + current status.

**Layout regions (tabbed):**

**Header band (always visible above tabs):**
- QA Error ID, Status badge (color-coded per status), Severity chip, Aging indicator with countdown ("2d 4h remaining" or "Breached — Escalated Level 2" in red).
- Action buttons — rendered conditionally: Accept / Rebut (owner, eligible status) · Record Decision (QA, eligible status) · Reopen (QAL, closed status) · Reassign Owner (Admin).

**Tab 1 — Overview**
- All Section A/B/C fields from the logging form, read-only, cleanly laid out as label/value pairs.
- Internal Notes shown only if viewer role permits (redacted entirely, not blurred, for Operations roles).

**Tab 2 — Rebuttal & Decision**
- If rebuttal exists: justification text, submitted-by, submitted-at, associated evidence.
- If decision exists: decision outcome (color-coded: Upheld=neutral, Overturned=green-ish, Partially Upheld=amber), rationale, decided-by, decided-at.
- If status is eligible for action, the relevant action form appears inline here (Accept/Rebut form for owner; Decision form for QA) rather than a separate route — reduces navigation friction.

**Tab 3 — Evidence**
- Two clearly separated sub-sections: "Auditor Evidence" and "Rebuttal Evidence," each listing files with uploader, timestamp, file type icon, and Download action (disabled with a "Scanning..." label if `malware_scan_status != CLEAN`).
- Superseded evidence versions shown collapsed under "Version History" per file, not deleted from view.

**Tab 4 — History (Audit Trail)**
- Chronological timeline (most recent first) of every status transition, notification sent, evidence action, and decision — matches `error_status_history` + relevant `audit_log`/`notifications_log` entries for this record, rendered in plain language ("SLA breached — escalated to Level 1" rather than raw codes), with raw transition code available on hover/tooltip for power users.
- Internal Notes-adjacent entries redacted for Operations viewers per FSD §13.2.

---

## 6. Screen: Rebuttal Action (Owner-Facing, embedded in Error Detail Tab 2)

**RBAC:** resolved `owner_user_id` or `OPS_MGR` for the owner's team.

- Two large, clearly differentiated buttons: **"Accept — I agree this is a valid finding"** and **"Dispute — I want to rebut this finding."**
- Selecting Accept: reveals optional comment field + Confirm button.
- Selecting Dispute: reveals mandatory justification text area (20-char minimum, live counter) + optional evidence upload zone + Submit button. Submit disabled until minimum length met; inline warning if text is flagged as identical to the original description (client-side pre-check mirroring FR-05-003, with server-side as source of truth).
- Confirmation modal before final submission ("You won't be able to edit this rebuttal after submitting — a QA reviewer will need to reopen it for corrections.") — sets clear expectations per BR-5.4/FR-05-006.

---

## 7. Screen: QA Decision Action (embedded in Error Detail Tab 2)

**RBAC:** `AUD` (if original logger) or `QAL` (team scope).

- Decision selector: three clearly labeled options — Upheld / Overturned / Partially Upheld — rendered as radio cards, each with a one-line description of what it means.
- If current status is `ACCEPTED_PENDING_CLOSURE`: only "Upheld" is selectable; the other two are visibly present but disabled with a tooltip: "Not available — owner accepted this finding. Reopen first if this needs to change."
- Rationale text area (20-char minimum, required, live counter).
- If "Partially Upheld" selected: an additional "Breakdown" text area appears, required.
- Submit button labeled "Record Final Decision" with a confirmation modal (decision moves the record to read-only).

---

## 8. Screen: QA Lead / Team Dashboard

**Route:** `/team-dashboard`
**RBAC:** `QAL`

- LOB selector (if scoped to multiple LOBs).
- KPI tiles: SLA Compliance %, Avg. Time to Close, Open Count, Escalated Count, Overturn Rate.
- "Overturn Rate by Auditor" bar chart — supports coaching/calibration conversations.
- "Unmapped Errors" queue table (if any exist) with a "Route Now" quick action linking to a lightweight reassignment modal.
- Escalations table filtered to this LOB, with escalation level badge.
- Full error table (same component as Auditor Dashboard's table, scoped to team).

---

## 9. Screen: Operations Manager Dashboard

**Route:** `/ops-dashboard`
**RBAC:** `OPS_MGR`

- KPI tiles: Open errors assigned to my team, Pending my team's response, Overturn rate (how often my team's rebuttals succeed), Average response time.
- Trend chart: error count by category over time, for this team only — helps identify recurring process gaps.
- Table of errors requiring team action (Accept/Rebut pending), with quick-action buttons directly in the row.

---

## 10. Screen: Leadership / Governance Dashboard

**Route:** `/leadership-dashboard`
**RBAC:** `QA_GOV` (read), `ADMIN`/`AUDITOR_RO` (read)

- Full filter bar: Date range, LOB (multi-select), Category, Severity, Geography/Site, Client-Impact-Flagged toggle.
- KPI tiles: Total Errors (period), SLA Compliance %, Overturn Rate, Escalation Rate, Client-Impact-Flagged Count.
- Charts: Errors by LOB (bar), Trend over time (line), Category distribution (donut/treemap), Aging distribution (stacked bar: Green/Amber/Red).
- "Export Report" button → format selector (PDF/Excel) → generates via `/reports/export`, shows progress indicator for large exports, delivers download link + in-app notification on completion.

---

## 11. Screen: Escalations View

**Route:** `/escalations`
**RBAC:** `QAL` (team scope), `QA_GOV` (all)

- Table of all currently `SLA_BREACHED_ESCALATED` records: QA Error ID, Owner, Escalation Level (badge), Time Since Breach, Next Escalation Threshold countdown.
- Sort default: highest escalation level first, then longest time since breach.

---

## 12. Admin Console Screens

**Route root:** `/admin`
**RBAC:** `ADMIN` only

### 12.1 LOBs & Categories
- Tree/table view: LOB → Categories → Sub-Categories, with inline add/edit/deactivate. Deactivate, never hard-delete (preserves historical integrity per FR-02-008).

### 12.2 Ownership Mapping
- Table: LOB, Category, Default Owner Team/Role, Default Owner Manager. "Edit" creates a new versioned row (per DB design) rather than mutating in place — UI communicates this: "Saving will apply to new errors only; already-open errors keep their original mapping."

### 12.3 SLA Rules
- Table: LOB, Category (or "All Categories"), Severity, Rebuttal Window (hrs), Decision Window (hrs). Same versioning UX pattern as Ownership Mapping.

### 12.4 Escalation Matrix
- Per-LOB configuration: ordered list of escalation levels, each with threshold hours and recipient (role or specific user).

### 12.5 Notification Templates
- List of NT-01 through NT-08, each editable (subject + body) with a live token-preview pane showing `{QAErrorID}`-style placeholders rendered against sample data.

### 12.6 Evidence Rules
- Allowed file types (checklist), max file size, max file count, per-severity mandatory-evidence toggle.

### 12.7 Working Hours & Holidays
- Per-region business hours configuration; holiday calendar table with add/import.

### 12.8 Users & Roles
- Searchable user table: name, email, active/inactive toggle, assigned roles (chips, with LOB scope shown per chip), "Manage Roles" action opening a role-assignment modal.

### 12.9 Configuration Change History
- Read-only audit view: entity, old value → new value, changed by, changed at — filterable by entity type and date range.

---

## 13. Notification Center (Panel, not a full screen)

- Bell-icon dropdown: list of recent notifications (read/unread visual distinction), each row: icon (by NT type), one-line summary, timestamp, click-through to the error record.
- "Mark all as read" action.
- Does not replace email — this is the always-available in-app mirror per FSD §6.2/FR-04-006.

---

## 14. Responsive Behavior Notes

- **Desktop (≥1280px):** left nav fully expanded, multi-column KPI tiles, side-by-side form sections.
- **Tablet (≥768px, <1280px):** left nav collapses to icon-only with flyout labels; KPI tiles reflow to 2-column grid; form sections stack but remain single-column within each section (no horizontal scrolling required at any point, per NFR-UX-03).
- All interactive controls (buttons, form fields) maintain minimum touch target size and keyboard navigability per WCAG 2.1 AA (NFR-UX-02).

---

## 15. Design System Notes (for Frontend Implementation)

- Status badges use a **consistent color language** across every screen: Open/Pending = neutral blue-gray, Amber SLA = amber, Breached/Escalated = red, Closed-Upheld = neutral gray, Closed-Overturned = green, Closed-Partial = teal/blue — this mapping must be defined once as shared design tokens and reused everywhere (dashboards, tables, detail header, history timeline), never redefined ad hoc per screen.
- All dates displayed in the viewer's local timezone with an on-hover tooltip showing the original UTC/server timestamp — important given the multi-geography user base (PRD §7.3 assumption).
- Every mandatory-field indicator, character-minimum counter, and conditional-requirement label (e.g., evidence becoming mandatory at Critical/High severity) must update live as the user fills the form — never only validated at submit time, to reduce end-of-form validation frustration (supports NFR-UX-01's 3-minute completion target).

---

*End of UI/UX Wireframe Specification. Next document: Sprint-Wise Implementation Plan.*
