# UI to API Mapping

This document maps the existing UI capabilities and user actions to the required backend REST API endpoints that must be built in Phase 1.

## 1. Authentication & Session
- **Current UI:** `QEMSContext.tsx` hardcodes `currentRole` and `currentUser`.
- **Backend API:** 
  - `GET /api/v1/auth/me` -> Returns User, Roles, Projects, Preferences.
  - `POST /api/v1/auth/login` (or Entra ID OAuth redirect endpoint).

## 2. Quality Events
- **Current UI:** `QualityEventsTable.tsx`, `ErrorDetailWorkspace.tsx`.
- **User Actions & API Mapping:**
  - View list/Filter: `GET /api/v1/projects/{project_id}/quality-events?limit=50&status=Open&severity=HIGH...`
  - View details: `GET /api/v1/projects/{project_id}/quality-events/{event_id}`
  - Create (NewErrorModal): `POST /api/v1/projects/{project_id}/quality-events`
  - Update status: `PATCH /api/v1/projects/{project_id}/quality-events/{event_id}/status`
  - Assign/Update details: `PATCH /api/v1/projects/{project_id}/quality-events/{event_id}`

## 3. Evidence
- **Current UI:** `EvidenceGallery.tsx`, Evidence section in `ErrorDetailWorkspace.tsx`.
- **User Actions & API Mapping:**
  - View event evidence: `GET /api/v1/projects/{project_id}/quality-events/{event_id}/evidence`
  - View all evidence (Gallery): `GET /api/v1/projects/{project_id}/evidence`
  - Upload file/image: `POST /api/v1/projects/{project_id}/quality-events/{event_id}/evidence` (Multipart form data).

## 4. Rebuttals & Decisions
- **Current UI:** `DisputeCenter.tsx`, Dispute tabs.
- **User Actions & API Mapping:**
  - List rebuttals: `GET /api/v1/projects/{project_id}/rebuttals`
  - Submit Rebuttal: `POST /api/v1/projects/{project_id}/quality-events/{event_id}/rebuttal`
  - Review/Decide Rebuttal: `POST /api/v1/projects/{project_id}/quality-events/{event_id}/rebuttal/decision`
  - Add Discussion Message: `POST /api/v1/projects/{project_id}/rebuttals/{rebuttal_id}/discussions`

## 5. Root Cause Analysis (RCA)
- **Current UI:** `ErrorDetailWorkspace.tsx` RCA tab.
- **User Actions & API Mapping:**
  - Save RCA (5 Whys / Fishbone): `POST /api/v1/projects/{project_id}/quality-events/{event_id}/rca` or `PUT`.
  - Fetch RCA: `GET /api/v1/projects/{project_id}/quality-events/{event_id}/rca`

## 6. Corrective Actions (CAPA)
- **Current UI:** `CorrectiveActionsHub.tsx`, CAPA lists.
- **User Actions & API Mapping:**
  - List CAPAs: `GET /api/v1/projects/{project_id}/corrective-actions`
  - Create CAPA: `POST /api/v1/projects/{project_id}/quality-events/{event_id}/corrective-actions`
  - Update CAPA status: `PATCH /api/v1/projects/{project_id}/corrective-actions/{action_id}`

## 7. Effectiveness Review
- **Current UI:** Embedded in CAPA or Quality Event workflow.
- **User Actions & API Mapping:**
  - Submit Review: `POST /api/v1/projects/{project_id}/quality-events/{event_id}/effectiveness-review`

## 8. Calibration
- **Current UI:** `CalibrationCenter.tsx`.
- **User Actions & API Mapping:**
  - List sessions: `GET /api/v1/projects/{project_id}/calibrations`
  - View session: `GET /api/v1/projects/{project_id}/calibrations/{session_id}`
  - Submit evaluation: `POST /api/v1/projects/{project_id}/calibrations/{session_id}/participants/{user_id}/score`

## 9. Analytics & Dashboard
- **Current UI:** `QualityIntelligence.tsx`, `CommandCenter.tsx`.
- **User Actions & API Mapping:**
  - Overview stats: `GET /api/v1/projects/{project_id}/analytics/overview`
  - Trends: `GET /api/v1/projects/{project_id}/analytics/trends`
  - Root Cause Distribution: `GET /api/v1/projects/{project_id}/analytics/root-causes`

## 10. Notifications & Global State
- **Current UI:** `Header.tsx` bell icon, `ToastContainer.tsx`.
- **User Actions & API Mapping:**
  - Get notifications: `GET /api/v1/notifications`
  - Mark read: `PATCH /api/v1/notifications/{id}/read`
  - Mark all read: `POST /api/v1/notifications/read-all`
  - Global Search (Command Palette): `GET /api/v1/projects/{project_id}/search?q={query}`
