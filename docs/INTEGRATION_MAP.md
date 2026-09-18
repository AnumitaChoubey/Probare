# Integration Map

This document outlines the external integrations required by the QEMS Master Specification and how they interface with the existing frontend.

## 1. Microsoft 365 Enterprise Integration
The Master Spec mandates a massive integration surface with Microsoft 365, which is currently non-existent in the frontend.

### A. Microsoft Entra ID (Identity & Auth)
- **Requirement:** Users must log in via Microsoft Entra ID.
- **Frontend Impact:** The current hardcoded Role selector in `QEMSContext` will be replaced by an OAuth2 PKCE login flow. The Electron shell will manage the OAuth popup safely.
- **Backend Role:** Validates JWTs, provisions local users on first login, maps Entra groups to QEMS Roles.

### B. Microsoft Teams & Outlook (Two-Way Communication)
- **Requirement:** QEMS sends notifications/actionable messages to Teams and Outlook, and can receive responses via Webhooks.
- **Frontend Impact:** None visually. The Notifications dropdown in the Header will sync with the Backend Notification engine, which in turn broadcasts to Teams/Outlook.
- **Backend Role:** Uses Microsoft Graph API to send messages. Exposes webhook endpoints (`POST /api/v1/integrations/microsoft/webhooks`) to receive replies.

### C. SharePoint / OneDrive (Evidence Storage)
- **Requirement:** Ability to link or ingest evidence from Microsoft storage.
- **Frontend Impact:** The `EvidenceGallery` and native file picker (`window.qems.files.open`) might be augmented with an "Import from OneDrive" API call.

## 2. Provider-Agnostic AI Integration
The existing backend (`server.ts`) tightly couples to Google GenAI. The Master Spec requires a provider-agnostic abstraction.

- **Current Implementation:** `server.ts` has hardcoded prompts for Gemini targeting `/api/ai/classify`, `/api/ai/rca`, `/api/ai/quality-copilot`, and `/api/ai/insights`.
- **Target Implementation:**
  - `backend/app/integrations/ai/` will define an abstract base class.
  - Generative responses must be strictly typed via Pydantic output parsers.
  - Auditing: All AI usage must be logged to the `AIInsight` and `AIUsageRecord` tables for cost control and accountability.
  - Human Oversight: AI output must be returned to the frontend forms as "suggestions" allowing the user to `Accept`, `Reject`, or `Edit` before committing to the Postgres database.

## 3. Desktop Application Capabilities (Electron)
The frontend is already wrapped in Electron. The backend API must respect the security model of the desktop environment.

- **Storage:** Large file uploads (Evidence) will go from Electron -> FastAPI -> Object Storage (S3/MinIO). The backend must support streaming uploads or return Pre-Signed URLs for direct-to-S3 uploads to prevent memory bloat in FastAPI.
- **Local Network:** The Electron app will communicate with the FastAPI backend over HTTPS. The production backend will not be bundled inside Electron.
- **Clipboard/Files:** Handled securely via `preload.cjs` as implemented in Phase 0 of the UI. No backend changes needed for OS interaction.
