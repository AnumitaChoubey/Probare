# QEMS Frontend Architecture Map

This document outlines the current state of the existing QEMS React + TypeScript + Electron application. It serves as the baseline for the Phase 0 backend integration mapping.

## 1. Application Structure
- **Framework:** React 19, TypeScript, Vite, Tailwind CSS.
- **Desktop Shell:** Electron (configured with `preload.cjs`, `main.cjs`, `nodeIntegration: false`, `contextIsolation: true`).
- **Entry Points:** `src/main.tsx`, `src/App.tsx`.

## 2. Navigation & Screens (Rendered via `AppContent`)
The application currently uses a state-based router managed by `QEMSContext` (`activeSection`).

1. **COMMAND CENTER:** Dashboard/Landing page (`CommandCenter.tsx`).
2. **MY WORK:** User-specific tasks and queues (`MyWork.tsx`).
3. **QUALITY EVENTS:** Main data grid (`QualityEventsTable.tsx`). Navigates to `ErrorDetailWorkspace.tsx` when an event is selected.
4. **NEW ERROR:** Dual view with a fast-entry modal launcher (`NewErrorModal.tsx`) and underlying table.
5. **DISPUTE CENTER:** Rebuttal management (`DisputeCenter.tsx`).
6. **EVIDENCE:** Global evidence gallery (`EvidenceGallery.tsx`).
7. **ROOT CAUSE:** RCA management (renders `ErrorDetailWorkspace.tsx` or `QualityEventsTable.tsx`).
8. **CORRECTIVE ACTIONS:** CAPA Hub (`CorrectiveActionsHub.tsx`).
9. **CALIBRATION:** QA Calibration sessions (`CalibrationCenter.tsx`).
10. **QUALITY INTELLIGENCE:** AI-assisted Analytics (`QualityIntelligence.tsx`).
11. **REPORTS:** Audit and reporting tools (`ReportsAudits.tsx`).
12. **ADMINISTRATION:** Settings and access management (`Administration.tsx`).

## 3. Global Overlays & Modals
- **AiAssistantDrawer:** Right-side slide-out for AI Copilot (`AiAssistantDrawer.tsx`).
- **CommandPalette:** Global search and quick actions triggered by `Ctrl+K` (`CommandPalette.tsx`).
- **NewErrorModal:** Fast 60-second entry modal for logging events.
- **ToastContainer:** Unified notification toaster.

## 4. State Management & Data
- **Store:** `src/context/QEMSContext.tsx` holds the entire application state.
- **Data Source:** `src/data/mockData.ts` provides deterministic, hardcoded seed data (`generateInitialEvents`, `INITIAL_CALIBRATION_SESSIONS`, `INITIAL_NOTIFICATIONS`).
- **Persistence:** Currently, `QEMSContext.tsx` syncs its state arrays (`events`, `calibrations`, `notifications`) to browser `localStorage`.
- **Role-Based Access Control (RBAC):** Mocked via `ROLE_PERMISSIONS` and `ROLE_USER_PROFILES` mapped to a selectable `currentRole`.

## 5. Existing Backend (Express API)
An existing Express server (`server.ts`) handles AI generation and static file serving.
- **`/api/health`**: Telemetry and status.
- **`/api/ai/classify` & `/api/ai/classify-error`**: Uses Gemini (or rule-based heuristics) to classify quality defects.
- **`/api/ai/rca` & `/api/ai/rca-assist`**: Suggests 5 Whys and Fishbone root causes.
- **`/api/ai/quality-copilot`**: Conversational copilot responses.
- **`/api/ai/insights`**: Executive quality intelligence summaries.

## 6. Desktop Capabilities (Electron)
- **`window.qems.files.open()`**: Opens the native OS file picker (used in `NewErrorModal.tsx` for Evidence).
- **`window.qems.clipboard.readImage()`**: Reads images from the OS clipboard.
- **`window.qems.notifications.show()`**: Triggers OS-level native notifications (hooked into `addToast` in `QEMSContext.tsx`).

## Summary of Refactoring Target
To make this a production application without altering the UI:
1. `QEMSContext.tsx` must be stripped of its large `useState` arrays and `localStorage` sync logic.
2. The mutation functions inside `QEMSContext.tsx` (e.g., `addQualityEvent`, `submitRebuttal`, `resolveRebuttal`) must be rewritten to invoke asynchronous REST API calls.
3. The component data fetching must be migrated to a data-fetching library (like React Query or `useEffect` + fetch) calling the new FastAPI backend.
