# Non-Functional Requirements Specification (NFRS)
## QEMS — Quality Error Management System

| Field | Value |
|---|---|
| Document Version | 1.0 |
| Status | Draft for Review |
| Depends On | PRD v1.0, FSD v1.0, FRS v1.0 |

---

## 1. Scale Baseline (Documented Assumption)

All numeric targets below are calibrated against this assumed Phase 1 production scale. **Revise this section first if actual figures differ** — every downstream number traces back to it.

| Parameter | Assumed Value |
|---|---|
| QA Auditors | 80–150 concurrent-capable users |
| Operations / stakeholder users | 800–2,000 |
| Total registered users (incl. leadership, admin) | ~2,500 |
| Quality errors logged per day | 300–800 |
| Peak concurrent active sessions | ~300 (assume 15% of total users active simultaneously at peak shift-overlap hours) |
| Evidence files per error (avg) | 1.5 |
| Average evidence file size | 2–5 MB (screenshots/short recordings); occasional large files up to configured 25 MB cap |
| Sites/geographies | Multiple (multi-time-zone) |
| Data retention horizon | 3 years minimum (pending enterprise policy confirmation — Open Item from PRD) |

---

## 2. Performance

| ID | Requirement | Target |
|---|---|---|
| NFR-PERF-01 | Page load time (initial dashboard render) | ≤ 2.5 seconds at P95, on standard corporate network |
| NFR-PERF-02 | Error logging form submission (server processing incl. ID generation, ownership resolution, initial audit entry) | ≤ 1.5 seconds at P95 |
| NFR-PERF-03 | Notification dispatch latency (event → email/in-app sent) | ≤ 60 seconds at P95; ≤ 5 minutes at P99 |
| NFR-PERF-04 | Dashboard data refresh latency (underlying data change → visible on dashboard) | ≤ 30 seconds ("near-real-time," not nightly batch, per FSD §12.5 BR-10.1) |
| NFR-PERF-05 | SLA breach detection and auto-escalation trigger latency | ≤ 5 minutes from the exact SLA threshold crossing |
| NFR-PERF-06 | Report export generation (PDF/Excel, filtered dataset up to 10,000 rows) | ≤ 10 seconds at P95 |
| NFR-PERF-07 | Evidence file upload processing (per file, up to 25 MB) | ≤ 8 seconds at P95 on standard corporate network |
| NFR-PERF-08 | API response time for standard CRUD operations | ≤ 300 ms at P95, ≤ 800 ms at P99 (server-side processing, excluding client network) |

---

## 3. Scalability

| ID | Requirement | Target |
|---|---|---|
| NFR-SCALE-01 | System shall support at least 300 concurrent active sessions without performance degradation beyond targets in Section 2 | Load-tested at 1.5x expected peak (450 concurrent) |
| NFR-SCALE-02 | System shall support at least 1,000 new error records/day sustained, with burst capacity to 2,000/day | Verified via load test simulating 2x expected daily volume |
| NFR-SCALE-03 | System architecture shall scale horizontally at the application tier (stateless API layer) to accommodate growth without re-architecture | Application services deployable as multiple replicas behind a load balancer; no in-memory session state that prevents horizontal scaling |
| NFR-SCALE-04 | Database shall be designed to support at least 5 years of historical data (≈1,000,000+ error records at upper-bound volume) without requiring schema redesign | Verified via schema review and capacity projection in DB Schema document |
| NFR-SCALE-05 | Evidence storage shall scale independently of the application/database tier (object/blob storage, not co-located with relational DB) | Evidence stored in blob storage (e.g., Azure Blob/S3-compatible), referenced by URI/key from the relational DB |

---

## 4. Availability & Reliability

| ID | Requirement | Target |
|---|---|---|
| NFR-AVAIL-01 | System uptime (business hours, all supported time zones) | ≥ 99.5% monthly |
| NFR-AVAIL-02 | Planned maintenance windows | Outside core business hours for the majority of covered geographies, communicated ≥ 5 business days in advance |
| NFR-AVAIL-03 | Recovery Time Objective (RTO) — full service restoration after a major outage | ≤ 4 hours |
| NFR-AVAIL-04 | Recovery Point Objective (RPO) — maximum acceptable data loss | ≤ 15 minutes (via transaction log backup / continuous replication) |
| NFR-AVAIL-05 | Notification subsystem failure shall not block core workflow (logging, rebuttal, decision) | Core actions succeed and are recorded even if email dispatch is degraded/delayed; failures are queued/retried and surfaced per FR-04-005 |
| NFR-AVAIL-06 | Database and evidence storage shall have automated daily backups with tested restore procedure | Backup verified via quarterly restore drill |

---

## 5. Security

| ID | Requirement | Target/Standard |
|---|---|---|
| NFR-SEC-01 | Authentication via enterprise SSO (SAML2/OIDC); no locally-stored application passwords in Phase 1 | 100% of user logins via SSO |
| NFR-SEC-02 | All data in transit encrypted via TLS 1.2+ | Enforced at load balancer/API gateway; no plaintext HTTP endpoint reachable |
| NFR-SEC-03 | All data at rest encrypted (database and blob storage) | AES-256 or platform-equivalent, per enterprise standard |
| NFR-SEC-04 | Role-based access control enforced at API layer, not merely UI layer | Direct API calls bypassing UI are still subject to full RBAC checks (verified via penetration/API security testing) |
| NFR-SEC-05 | Evidence files scanned for malware on upload | Integration with enterprise antivirus/malware-scanning service before file is marked available |
| NFR-SEC-06 | System shall log all authentication events (success/failure) and administrative actions for security monitoring | Logs retained per enterprise SIEM ingestion requirements |
| NFR-SEC-07 | Session tokens shall be secure, HttpOnly, and time-bound | No sensitive token accessible via client-side script; expires per NFR governing session timeout |
| NFR-SEC-08 | System shall undergo a security review / penetration test prior to production go-live | Sign-off from enterprise InfoSec required before Phase 1 launch |
| NFR-SEC-09 | Principle of least privilege enforced in RBAC design | No default role grants access beyond what is explicitly required (verified against RBAC Matrix document) |
| NFR-SEC-10 | Sensitive fields (e.g., Internal Notes) shall be access-controlled at the data layer, not only hidden in UI | API response for Operations-role callers excludes Internal Notes field entirely, not merely hidden client-side |

---

## 6. Auditability & Compliance

| ID | Requirement | Target |
|---|---|---|
| NFR-AUD-01 | Every state-changing action shall be captured in an immutable audit log per FSD §13 | 100% coverage of listed event types, verified via test |
| NFR-AUD-02 | Audit logs shall be tamper-evident (append-only storage, no update/delete exposed through any interface) | Verified via architecture review and negative testing (attempted direct DB/API mutation of audit records is blocked or requires break-glass procedure with its own separate logging) |
| NFR-AUD-03 | Audit log retention shall match or exceed the evidence/error record retention policy | Aligned to enterprise data governance policy (assumed 3 years minimum pending confirmation) |
| NFR-AUD-04 | System shall support data export for compliance/internal audit review without requiring engineering involvement | Read-only Compliance/Audit Reviewer role can self-serve export within RBAC-permitted scope |

---

## 7. Usability & Accessibility

| ID | Requirement | Target |
|---|---|---|
| NFR-UX-01 | Error logging form shall be completable by a trained QA auditor in under 3 minutes for a standard (non-complex) error | Validated via UAT timing observation |
| NFR-UX-02 | UI shall meet WCAG 2.1 Level AA accessibility standards | Verified via automated accessibility scan + manual screen-reader spot check |
| NFR-UX-03 | System shall be fully responsive for desktop and tablet viewports (Phase 1 does not require native mobile app, per PRD out-of-scope) | Verified across target viewport breakpoints defined in UI/UX Wireframes document |
| NFR-UX-04 | System shall support modern evergreen browsers | Chrome, Edge, Firefox (latest 2 major versions each); Safari latest version |
| NFR-UX-05 | Error messages shall be specific and actionable, not generic | Validation errors identify the exact field and the exact rule violated (e.g., "Description must be at least 20 characters," not "Invalid input") |

---

## 8. Maintainability & Extensibility

| ID | Requirement | Target |
|---|---|---|
| NFR-MAINT-01 | Codebase shall follow a modular service-boundary architecture per FSD §16 (M14) to support Phase 2 AI plug-in without core rework | Verified via architecture review; service contracts documented in API Design doc |
| NFR-MAINT-02 | All configuration (categories, SLA, ownership, escalation, templates) shall be externalized from code, editable via Admin console | Zero hardcoded business-rule values requiring a code deployment to change (verified via code review) |
| NFR-MAINT-03 | System shall include automated test coverage for all Must-priority (M) FRS requirements | ≥ 80% automated test coverage on core workflow modules (M2, M3, M5, M6, M8, M9) prior to go-live |
| NFR-MAINT-04 | System shall provide structured application logging (not just audit-trail business logging) for operational troubleshooting | Centralized log aggregation (e.g., ELK/Azure Monitor/equivalent) with correlation IDs across services |
| NFR-MAINT-05 | Database schema changes shall be managed via versioned migrations | No manual/ad-hoc schema changes in production; all changes via migration scripts under version control |

---

## 9. Monitoring & Observability

| ID | Requirement | Target |
|---|---|---|
| NFR-MON-01 | System shall expose health-check endpoints for all critical services (API, notification dispatcher, escalation engine) | Automated monitoring polls health endpoints at ≤ 1-minute intervals |
| NFR-MON-02 | System shall alert operations/support team on SLA-engine or notification-dispatcher failure within 5 minutes of detection | Alert delivered via enterprise monitoring/alerting channel (e.g., email/Teams/PagerDuty-equivalent) |
| NFR-MON-03 | System shall track and expose key operational metrics (error logging rate, notification success rate, average API latency, escalation counts) on an internal ops dashboard | Metrics available to platform support team, distinct from the business-facing Leadership Dashboard |

---

## 10. Data Governance & Retention

| ID | Requirement | Target |
|---|---|---|
| NFR-DATA-01 | Evidence and error records shall be retained per enterprise data governance policy (assumed 3-year minimum, pending confirmation) | Configurable retention period in Admin console; automated archival/purge process post-retention (with legal-hold override capability) |
| NFR-DATA-02 | Personally identifiable information (PII) within error/evidence records shall be handled per applicable data protection regulation for each covered geography | Data classification review completed before go-live; access controls per NFR-SEC-04/09 |
| NFR-DATA-03 | System shall support a legal-hold flag on individual error records to prevent auto-purge regardless of retention timer | Flagged records are excluded from any automated purge job |

---

## 11. Deployment & Environment

| ID | Requirement | Target |
|---|---|---|
| NFR-ENV-01 | System shall support at least three environments: Development, UAT/Staging, Production | Fully isolated data and configuration per environment |
| NFR-ENV-02 | Deployment shall support zero/near-zero-downtime releases | Blue-green or rolling deployment strategy; deployments do not require an announced outage for routine releases |
| NFR-ENV-03 | Infrastructure shall be defined as code where feasible | Verified via repository review (IaC templates for provisioned infrastructure) |

---

## 12. Localization Readiness (Not Implemented in Phase 1, Must Not Be Precluded)

| ID | Requirement | Target |
|---|---|---|
| NFR-LOC-01 | UI text shall be externalized into resource files rather than hardcoded strings, even though only English is delivered in Phase 1 | Verified via code review; adding a language in a future phase requires no UI code restructuring |
| NFR-LOC-02 | Date/time and number formatting shall be locale-aware at the framework level | Uses standard i18n libraries rather than manual string formatting |

---

## 13. NFR Traceability to Business Goals

| Business Goal (PRD §3.1) | Related NFRs |
|---|---|
| Reduce manual tracking, faster communication | NFR-PERF-03, NFR-PERF-04, NFR-AVAIL-05 |
| Single source of truth, real-time visibility | NFR-PERF-04, NFR-SCALE-01/02 |
| Defensible audit trail | NFR-AUD-01 to 04, NFR-SEC-06 |
| Production-grade reliability | NFR-AVAIL-01 to 06, NFR-MON-01 to 03 |
| AI-readiness without Phase 1 dependency | NFR-MAINT-01 |
| Data protection / compliance | NFR-SEC-01 to 10, NFR-DATA-01 to 03 |

---

*End of NFRS. This completes Phase 1 documentation set (PRD, FSD, FRS, NFRS). Next phase: RBAC Matrix, Workflow/State Machine, Database Schema, REST API Design, System Architecture — followed by UI/UX Wireframes and Sprint Plan.*
