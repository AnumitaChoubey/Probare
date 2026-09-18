# Data Model Map

This document maps the TypeScript interfaces defined in `src/types/index.ts` to their corresponding PostgreSQL database entities required by the Backend Engineering Master Specification.

## 1. Core Tenant & Access Control (New Entities)
The frontend currently uses mocked string literals for users and teams. The backend will require formal relational structures.
- **Tenant**: `id`, `name`, `created_at`
- **Project**: `id`, `tenant_id`, `name`, `created_at`
- **User**: `id`, `tenant_id`, `email`, `name`, `entra_id_sub`
- **ProjectMember**: `project_id`, `user_id`, `role`
- **Team**: `id`, `tenant_id`, `name`

## 2. Taxonomy & Metadata (New Entities)
Frontend hardcodes these in `mockData.ts` (`PROCESS_TAXONOMY`).
- **Process**: `id`, `tenant_id`, `name`
- **SubProcess**: `id`, `process_id`, `name`
- **ErrorType**: `id`, `sub_process_id`, `name`
- **SOP**: `id`, `tenant_id`, `title`, `document_url`

## 3. Quality Event (`QualityEvent`)
Maps directly to `quality_events` table.
- `id` (UUID PK)
- `project_id` (FK to Project)
- `event_number` (String, e.g. "QEMS-2026-000001")
- `title`, `description`
- `employee_id` (FK User), `team_id` (FK Team)
- `process_id`, `sub_process_id`, `error_type_id`, `sop_id` (FKs)
- `severity` (Enum: CRITICAL, HIGH, MEDIUM, LOW)
- `status` (Enum: Draft, Logged, Under Review, Rebuttal Pending, QA Review, etc.)
- `owner_id`, `created_by` (FKs User)
- `customer_impact`, `financial_impact`, `compliance_impact`
- `expected_outcome`, `actual_outcome`
- `sla_due_at`, `closed_at`, `created_at`, `updated_at`, `version`

## 4. Evidence (`EvidenceItem`)
Maps to `evidence` table.
- `id` (UUID PK)
- `project_id`, `quality_event_id` (FKs)
- `title`, `file_name`, `file_size`, `mime_type`
- `storage_path` (S3 Key)
- `uploaded_by` (FK User)
- `description`, `duration`, `highlight_timestamp`
- `uploaded_at`

## 5. Rebuttal & Discussions (`RebuttalRecord`, `DiscussionThread`)
Maps to `rebuttals` and `rebuttal_discussions`.
- **Rebuttal**: `id`, `event_id`, `category` (Enum), `explanation`, `submitted_by`, `status` (Enum), `qa_assessed_by`, `qa_decision`, `qa_rationale`, `sla_deadline`, `submitted_at`
- **DiscussionThread**: `id`, `rebuttal_id`, `author_id`, `message`, `timestamp`

## 6. Root Cause Analysis (`RootCauseAnalysis`, `FiveWhysStep`)
Maps to `root_causes` and JSONB/relations.
- **RootCause**: `id`, `event_id`, `problem_statement`, `primary_category`, `contributing_factors` (Array/JSONB), `confidence`, `completed_by`
- **FiveWhys**: Can be stored as JSONB `five_whys` in `root_causes` or as a separate `five_whys_steps` table.
- **Fishbone**: JSONB field in `root_causes`.

## 7. Corrective Actions (`CorrectiveAction`)
Maps to `corrective_actions`.
- `id`, `event_id`, `title`, `description`, `owner_id`, `priority`, `due_date`, `status` (Enum), `completion_notes`, `completed_at`

## 8. Effectiveness Review (`EffectivenessReview`)
Maps to `effectiveness_reviews`.
- `id`, `event_id`, `reviewed_by`, `error_rate_before`, `error_rate_after`, `recurrence_rate`, `comparison_period`, `decision` (Enum), `rationale`

## 9. Calibration (`CalibrationSession`, `CalibrationParticipant`)
Maps to `calibration_sessions` and `calibration_participants`.
- **CalibrationSession**: `id`, `project_id`, `title`, `scheduled_date`, `process_id`, `status`, `sample_case_id`, `score_variance`, `final_calibrated_score`, `decision_rationale`
- **CalibrationParticipant**: `id`, `session_id`, `user_id`, `score`, `submitted`, `notes`

## 10. Audit & SLA (`AuditEvent`, `SLAPolicy`)
- **AuditEvent**: `id`, `tenant_id`, `project_id`, `entity_type`, `entity_id`, `action`, `old_value` (JSONB), `new_value` (JSONB), `actor_id`, `reason`, `timestamp`
- **SLAPolicy**: `id`, `tenant_id`, `name`, `process_id`, `severity`, `resolution_target_hours`, `rebuttal_window_hours`, `warning_threshold_percent`

## 11. AI Insights (New from Spec)
- **AIInsight**: `id`, `project_id`, `event_id`, `type`, `summary`, `recommendation`, `confidence`, `model_provider`, `created_at`
