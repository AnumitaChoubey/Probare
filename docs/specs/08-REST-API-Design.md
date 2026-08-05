# REST API Design
## QEMS — Quality Error Management System (FastAPI / Python)

| Field | Value |
|---|---|
| Document Version | 1.0 |
| Framework | FastAPI (Python 3.12+), Pydantic v2 for schema validation |
| Base URL (example) | `https://qems.internal.company.com/api/v1` |
| Auth | Bearer JWT (issued post-SSO exchange), validated on every request |
| Depends On | FSD, FRS, RBAC Matrix, Workflow/State Machine, Database Schema |

---

## 1. Conventions

- All endpoints prefixed `/api/v1`. Versioning via URL path; breaking changes require `/api/v2`.
- All responses JSON. Timestamps ISO-8601 UTC (`2026-07-30T10:15:00Z`).
- Pagination: `?page=1&page_size=50` (default 50, max 200), response includes `{ "items": [...], "page": 1, "page_size": 50, "total_count": 483 }`.
- Filtering: query params per resource (documented per endpoint below).
- Standard error envelope:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Description field must be at least 20 characters.",
    "field": "description",
    "request_id": "b3f1-..."
  }
}
```
- HTTP status codes used: `200` OK, `201` Created, `204` No Content, `400` Validation error, `401` Unauthenticated, `403` Forbidden (RBAC), `404` Not Found, `409` Conflict (e.g., illegal state transition), `422` Unprocessable (semantic validation), `429` Rate limited, `500` Server error.
- Every mutating endpoint enforces RBAC server-side per the RBAC Matrix — **never** relies on UI-layer restriction alone (NFR-SEC-04).
- Idempotency: mutating POST endpoints that create a resource accept an optional `Idempotency-Key` header; duplicate keys within a 24-hour window return the original response rather than creating a duplicate (FR-02-007).

---

## 2. Authentication

| Endpoint | Method | Description |
|---|---|---|
| `/auth/sso/callback` | POST | Exchanges IdP authorization code for a QEMS session JWT; auto-provisions user record (JIT) on first login |
| `/auth/refresh` | POST | Refreshes an expiring JWT using a refresh token |
| `/auth/logout` | POST | Invalidates current session/refresh token |
| `/auth/me` | GET | Returns current user profile, active roles, and LOB scopes |

**`GET /auth/me` — response:**
```json
{
  "user_id": "uuid",
  "full_name": "Jane Doe",
  "email": "jane.doe@company.com",
  "roles": [
    { "code": "AUD", "lob_id": "uuid-billing", "lob_name": "Billing" },
    { "code": "QAL", "lob_id": "uuid-billing", "lob_name": "Billing" }
  ]
}
```

---

## 3. Error Records (`/errors`)

### 3.1 `POST /errors`
Creates a new error record (or draft).

**Request:**
```json
{
  "is_draft": false,
  "lob_id": "uuid",
  "category_id": "uuid",
  "sub_category_id": "uuid",
  "severity": "HIGH",
  "transaction_reference": "TXN-88213",
  "owner_user_id": "uuid",
  "date_of_occurrence": "2026-07-20",
  "date_of_detection": "2026-07-22",
  "description": "Agent applied incorrect discount code during billing adjustment...",
  "initial_root_cause": "Process gap",
  "internal_notes": "Flag for calibration session",
  "client_impact_flag": true,
  "evidence_file_ids": ["uuid-of-pre-uploaded-evidence"]
}
```
- Guard: RBAC role must include `AUD` (create permission) with `lob_id` in caller's scope.
- Validation: per FRS FR-02-001 to FR-02-009 (mandatory fields, date logic, evidence-required-if-severity rule).
- On success: generates `qa_error_id` (M3), resolves ownership (M4), sets status `OPEN_PENDING_ACK` (or `DRAFT` if `is_draft=true`), triggers NT-01 notification asynchronously.
- **Response `201`:**
```json
{
  "id": "uuid",
  "qa_error_id": "QE-BILL-2026-000481",
  "status": "OPEN_PENDING_ACK",
  "created_at": "2026-07-30T10:15:00Z"
}
```
- **Error cases:** `400` (validation), `403` (RBAC/scope), `409` (unmapped LOB+Category with no ownership mapping → still creates the record but returns a `warnings` array, does not hard-fail per FR-04-003).

### 3.2 `GET /errors`
List/search error records, scoped by caller's RBAC.

**Query params:** `status`, `lob_id`, `category_id`, `severity`, `owner_user_id`, `logged_by_user_id`, `date_from`, `date_to`, `client_impact_flag`, `sla_state` (`green`/`amber`/`red`), `page`, `page_size`, `sort` (default `-created_at`).

**Response `200`:**
```json
{
  "items": [
    {
      "id": "uuid",
      "qa_error_id": "QE-BILL-2026-000481",
      "status": "REBUTTAL_SUBMITTED_PENDING_QA_REVIEW",
      "severity": "HIGH",
      "lob_name": "Billing",
      "category_name": "Incorrect Discount Application",
      "owner_name": "John Smith",
      "sla_state": "amber",
      "created_at": "2026-07-22T09:00:00Z"
    }
  ],
  "page": 1, "page_size": 50, "total_count": 483
}
```

### 3.3 `GET /errors/{error_id}`
Full record detail, including nested rebuttal/decision/evidence summaries and current SLA aging %. `internal_notes` field omitted entirely from the JSON payload (not merely null) if the caller's role is `OPS_AGT`/`OPS_MGR` (NFR-SEC-10).

### 3.4 `PATCH /errors/{error_id}/draft`
Updates a `DRAFT` record (only its own creator, only while `is_draft=true`). `409` if record is no longer a draft.

### 3.5 `POST /errors/{error_id}/submit`
Submits a draft (transition T2). Same validation as `POST /errors`.

### 3.6 `GET /errors/{error_id}/history`
Returns the full `error_status_history` timeline for the record (redacted per viewer role).

---

## 4. Rebuttal & Decision Actions

### 4.1 `POST /errors/{error_id}/acknowledge`
Marks transition T4 (owner opened record) — called automatically by the frontend on first detail-view load by the owner; idempotent (repeated calls are no-ops after the first).

### 4.2 `POST /errors/{error_id}/accept`
Transition T5. RBAC: caller must be the resolved `owner_user_id` or hold `OPS_MGR` scoped to the owner's team.
```json
{ "acknowledgement_comment": "Confirmed, error was ours." }
```
`409` if current status is not `OPEN_PENDING_ACK`, `OPEN_PENDING_RESPONSE`, or `SLA_BREACHED_ESCALATED`.

### 4.3 `POST /errors/{error_id}/rebut`
Transition T6.
```json
{
  "justification": "The discount code applied was per policy update effective the prior week...",
  "evidence_file_ids": ["uuid"]
}
```
- Validation: `justification` ≥ 20 chars, not identical to original `description` (FR-05-002/003).
- `403` if caller is not the resolved owner. `409` if status ineligible.

### 4.4 `POST /errors/{error_id}/decision`
Transition T8/T10/T11/T12. RBAC: `AUD` (if original logger) or `QAL` (team scope).
```json
{
  "decision": "PARTIALLY_UPHELD",
  "rationale": "Discount policy update applied correctly, but the amount calculation was still off by $4.20.",
  "partial_breakdown": "Policy application: not an error. Calculation amount: error, corrected in follow-up."
}
```
- `422` if `decision = OVERTURNED` or `PARTIALLY_UPHELD` while status is `ACCEPTED_PENDING_CLOSURE` (T9 guard, FR-06-003) — error code `INVALID_DECISION_FOR_STATE`.
- `400` if `rationale` < 20 chars, or `partial_breakdown` missing when `decision = PARTIALLY_UPHELD`.

### 4.5 `POST /errors/{error_id}/reopen`
Transition T15. RBAC: `QAL` only.
```json
{ "reason": "New evidence surfaced after closure requiring re-review." }
```

### 4.6 `POST /errors/{error_id}/rebuttal-correction`
Transition T17 (narrow pre-decision correction). RBAC: `AUD`/`QAL`.
```json
{ "reason": "Owner submitted rebuttal against wrong transaction reference; allowing resubmission." }
```

---

## 5. Evidence (`/errors/{error_id}/evidence`)

### 5.1 `POST /errors/{error_id}/evidence`
Multipart upload. RBAC: caller must be a named party to the record (logger, owner) or QA/Admin scope.
- Server validates file type/size against Admin config (FR-07-001/002), computes SHA-256 checksum, submits to malware scan (async), stores in blob storage, persists `evidence_files` row with `malware_scan_status = PENDING`.
- **Response `201`:**
```json
{ "id": "uuid", "file_name": "screenshot.png", "malware_scan_status": "PENDING" }
```
- A webhook/callback from the malware scanner updates `malware_scan_status`; files remain `PENDING` (not downloadable) until `CLEAN`.

### 5.2 `GET /errors/{error_id}/evidence`
Lists evidence, scoped by RBAC field-level rules (§5 of RBAC Matrix).

### 5.3 `GET /evidence/{evidence_id}/download`
Streams file content (or returns a short-lived signed blob URL). Logs a `DOWNLOAD` entry in `evidence_access_log` (FR-07-006). `403` if `malware_scan_status != CLEAN`.

### 5.4 `POST /evidence/{evidence_id}/supersede`
Uploads a corrected replacement; original remains queryable via `supersedes_evidence_id` chain (FR-07-004). No `DELETE` endpoint exists for evidence — intentionally absent from the API surface.

---

## 6. Dashboards & Reporting

### 6.1 `GET /dashboards/auditor`
Returns the current user's own logged errors summary + aging breakdown (M10.1).

### 6.2 `GET /dashboards/team`
RBAC: `QAL`. Query params: `lob_id` (must be in caller's scope). Returns team-level SLA compliance %, overturn rate by auditor, escalation counts.

### 6.3 `GET /dashboards/operations`
RBAC: `OPS_MGR`. Team-level error trend for the caller's team.

### 6.4 `GET /dashboards/leadership`
RBAC: `QA_GOV`. Cross-LOB aggregate metrics with full filter set (date range, LOB, category, severity, geography).

### 6.5 `POST /reports/export`
```json
{ "dashboard": "leadership", "filters": { "date_from": "2026-04-01", "date_to": "2026-06-30", "lob_id": null }, "format": "pdf" }
```
Generates and returns a signed download URL; logs the export action (entity_type=`REPORT_EXPORT`) in `audit_log` (FR-10-004).

---

## 7. Admin Configuration (`/admin/*`) — all endpoints RBAC `ADMIN` only

| Endpoint | Method(s) | Purpose |
|---|---|---|
| `/admin/lobs` | GET, POST, PATCH | Manage LOBs |
| `/admin/categories` | GET, POST, PATCH | Manage categories (nested under LOB) |
| `/admin/sub-categories` | GET, POST, PATCH | Manage sub-categories |
| `/admin/ownership-mapping` | GET, POST | Create new version (never PATCH in place — new row with new `effective_from`, prior row's `effective_to` set) |
| `/admin/sla-rules` | GET, POST | Same versioning pattern as ownership mapping |
| `/admin/escalation-matrix` | GET, POST | Same versioning pattern |
| `/admin/notification-templates` | GET, PATCH | Edit template subject/body; version-incremented |
| `/admin/users` | GET, PATCH | View users, deactivate/reactivate |
| `/admin/users/{user_id}/roles` | GET, POST, DELETE (soft-revoke) | Assign/revoke role+LOB scope |
| `/admin/config-history` | GET | Query `config_change_history` |
| `/admin/working-hours` | GET, POST | Manage regional calendars |
| `/admin/holidays` | GET, POST | Manage holiday dates |

All POST/PATCH calls here write a corresponding `config_change_history` row (old_value/new_value JSONB) automatically at the service layer — this is implemented as a shared decorator/middleware applied to all admin-mutation endpoints, not re-implemented per endpoint (maintainability, NFR-MAINT-02).

---

## 8. Internal Extensibility Service Contracts (M14 — AI-readiness)

These are **internal** service interfaces (not necessarily public HTTP endpoints — may be in-process Python interfaces in Phase 1, but documented with request/response contracts as if they were services, so that a Phase 2 swap to an external AI microservice requires no contract change).

### 8.1 Categorization Suggestion Service
```
interface CategorizationSuggestionService:
    suggest(lob_id: UUID, description: str) -> List[CategorySuggestion]

CategorySuggestion:
    category_id: UUID
    confidence: float   # Phase 1 rule-based: always 1.0 or omitted; Phase 2 AI: model confidence score
    reason: str          # Phase 1: "keyword match: 'discount'"; Phase 2: model explanation
```
Phase 1 implementation: simple keyword-to-category lookup table (admin-configurable), or returns empty list (auditor selects manually — this call is advisory only, never blocking, per FSD §16).

### 8.2 Duplicate Detection Service
```
interface DuplicateDetectionService:
    check(lob_id: UUID, transaction_reference: str, date_of_occurrence: date) -> List[PossibleDuplicate]

PossibleDuplicate:
    error_id: UUID
    qa_error_id: str
    match_reason: str   # Phase 1: "same transaction_reference + overlapping date range"; Phase 2: "87% semantic similarity"
```
Phase 1 implementation: exact/overlapping-range SQL query per FR-14-004; non-blocking warning returned to the client.

### 8.3 Summarization Service
```
interface SummarizationService:
    summarize(text: str, max_length: int) -> str
```
Phase 1 implementation: no-op passthrough (returns original text, or a simple truncation) — no model call.

### 8.4 Recurring Pattern / Analytics Service
```
interface AnalyticsService:
    get_recurring_patterns(lob_id: UUID, date_from: date, date_to: date) -> List[PatternInsight]

PatternInsight:
    category_id: UUID
    occurrence_count: int
    trend_direction: str   # Phase 1: simple period-over-period delta; Phase 2: anomaly-detection flag
```
Phase 1 implementation: standard aggregate SQL grouping (`COUNT(*) GROUP BY category_id, date_trunc('week', created_at)`), exposed via `/dashboards/leadership`.

**Contract stability requirement (FR-14-003, NFR-MAINT-01):** calling modules (error creation flow, rebuttal flow, dashboard flow) depend only on the interface signatures above, injected via a service-locator/dependency-injection pattern (FastAPI's `Depends()`). Swapping the concrete implementation class from `RuleBasedCategorization` to `AICategorizationClient` in Phase 2 requires zero changes to the calling route handlers.

---

## 9. Rate Limiting & Abuse Protection

| Endpoint class | Limit |
|---|---|
| Authenticated standard endpoints | 120 requests/minute/user |
| `POST /errors`, `POST /errors/{id}/evidence` | 30 requests/minute/user (burst allowance for legitimate high-volume auditors, still bounded) |
| `POST /reports/export` | 10 requests/minute/user (export generation is resource-intensive) |

Exceeding a limit returns `429` with a `Retry-After` header.

---

## 10. Webhooks / Async Callbacks

| Callback | Source | Purpose |
|---|---|---|
| `/internal/webhooks/malware-scan-result` | Enterprise malware scanning service | Updates `evidence_files.malware_scan_status` |
| `/internal/webhooks/email-delivery-status` | Email/Outlook delivery provider | Updates `notifications_log.status` (SENT/DELIVERED/BOUNCED/FAILED) |

Both are internal-network-only endpoints, authenticated via shared-secret HMAC signature validation (not part of the public API surface).

---

*End of REST API Design document. Next document: System Architecture.*
