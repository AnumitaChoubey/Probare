# Backend Implementation Plan & Phasing

This document outlines the step-by-step executable plan for building the QEMS Enterprise Backend in FastAPI and replacing the mock data in the React frontend.

## Conflicts & Missing Information Flagged
Before proceeding with Phase 1, note the following conflicts between the frontend baseline and the Master Specification:
1. **Existing Express Backend:** An existing Node.js Express backend (`server.ts`) handles AI and static serving. *Resolution:* We will completely replace `server.ts` with the new Python FastAPI backend.
2. **Missing Project Concept in UI:** The Master Specification requires strict `Tenant` and `Project` isolation. However, the current React frontend has NO visual concept of a "Project Selector" or "Tenant". *Resolution:* We will implement the backend with full multi-tenancy/multi-project support. For the frontend integration, we will implicitly assign the user to a default `Project` and inject `project_id` under the hood to satisfy the backend, avoiding any UI redesign.
3. **User Preferences:** Frontend state like `AppTheme` and `AppDensity` are currently stored in `localStorage`. *Resolution:* We will keep these in local storage or add a lightweight `UserPreferences` JSON field to the `User` model, but no UI change is required.

---

## Executable Phases

### Phase 1: Infrastructure & Database Foundation
- **Goal:** Set up Docker, FastAPI, and SQLAlchemy models.
- **Dependencies:** None.
- **Tasks:**
  - Create `docker-compose.yml` (PostgreSQL, Redis, MinIO).
  - Initialize `backend/` FastAPI structure.
  - Implement SQLAlchemy entities mapped in `DATA_MODEL_MAP.md`.
  - Create Alembic migrations.
  - Implement base CRUD repositories.
- **Acceptance Criteria:** `docker compose up` starts DB and API. Alembic runs successfully.

### Phase 2: Core Workflows & Business Logic (Services)
- **Goal:** Implement the strict state machine and SLA policies in Python.
- **Dependencies:** Phase 1.
- **Tasks:**
  - `QualityEventService`: Transitions, validations, ID generation (QEMS-2026-XXXX).
  - `SLAService`: Target calculation.
  - `AuditService`: Immutable history tracking.
- **Acceptance Criteria:** Unit tests verify invalid state transitions are blocked.

### Phase 3: REST API Layer & Security
- **Goal:** Expose business logic via `/api/v1` routes with authorization.
- **Dependencies:** Phase 2.
- **Tasks:**
  - Implement Routers (`projects`, `quality_events`, `evidence`, `rebuttals`, `rca`, `capa`).
  - Implement Pydantic input/output schemas.
  - Implement RBAC Dependency injection (Tenant/Project/Role checking).
- **Acceptance Criteria:** Integration tests pass API endpoints simulating different user roles.

### Phase 4: Integrations (Storage & AI)
- **Goal:** Replace `server.ts` AI logic with Python and implement file storage.
- **Dependencies:** Phase 3.
- **Tasks:**
  - `StorageAdapter`: S3/MinIO upload/download mechanisms.
  - `AIAdapter`: Provider-agnostic Gemini integration porting logic from `server.ts`.
- **Acceptance Criteria:** Can upload/download evidence. AI routes return structured insights.

### Phase 5: Microsoft 365 & Background Workers
- **Goal:** Two-way communication and SLA automation.
- **Dependencies:** Phase 3.
- **Tasks:**
  - Configure `APScheduler` for SLA monitoring and notifications.
  - Implement Entra ID OAuth validation.
  - Implement Microsoft Graph API adapter for Teams/Outlook notifications.
- **Acceptance Criteria:** Background jobs run every minute to identify SLA breaches.

### Phase 6: Frontend API Integration
- **Goal:** Connect the React UI to FastAPI.
- **Dependencies:** Phase 1-5.
- **Tasks:**
  - Create `src/services/api/` in TypeScript.
  - Modify `QEMSContext.tsx` to replace `events`, `calibrations`, `notifications` with API queries.
  - Replace `generateInitialEvents` with a backend DB Seeder script (`scripts/seed.py`).
- **Acceptance Criteria:** The desktop app looks exactly the same but data persists in PostgreSQL.
