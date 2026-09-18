# Workflow Map

This document outlines the business workflows explicitly and implicitly represented in the QEMS frontend UI and Context, identifying where backend enforcement is strictly required.

## 1. Quality Event Lifecycle (State Machine)
The core of QEMS is the lifecycle of a Quality Event. The frontend dictates these statuses, but the backend must enforce the transition graph.

**Valid Transition Graph:**
- `Draft` -> `Logged`
- `Logged` -> `Under Review`
- `Under Review` -> `Rebuttal Pending` (If employee disputes)
- `Under Review` -> `Upheld` (If no dispute and accepted)
- `Under Review` -> `Escalated` (If risk requires manager intervention)
- `Rebuttal Pending` -> `QA Review` (When dispute is submitted)
- `QA Review` -> `Upheld` (Rebuttal rejected)
- `QA Review` -> `Overturned` (Rebuttal accepted, event nullified)
- `QA Review` -> `Partially Accepted` -> `Corrective Action`
- `Upheld` -> `Root Cause Analysis`
- `Root Cause Analysis` -> `Corrective Action`
- `Corrective Action` -> `Effectiveness Review` (Once all CAPAs are 'Completed')
- `Effectiveness Review` -> `Closed` (If deemed 'Effective')
- `Effectiveness Review` -> `Reopened` / `Root Cause Analysis` (If deemed 'Not Effective')

**Backend Requirement:** The backend MUST reject invalid transitions (e.g., jumping from `Logged` directly to `Closed` without `RCA` and `CAPA` where severity dictates it).

## 2. Rebuttal & Dispute Resolution Workflow
1. **Submission:** A Frontline Employee (or Team Lead) submits a Rebuttal with evidence and explanation.
   - *Backend enforcement:* Only the assignee/employee can submit. SLA timer pauses for standard review.
2. **Arbitration:** A QA Reviewer or Manager evaluates the dispute.
   - *Backend enforcement:* The user resolving the dispute CANNOT be the same user who originally logged the error.
3. **Decision:** Dispute is Overturned, Upheld, or Escalated.

## 3. Root Cause Analysis Workflow
1. **Investigation:** QA Auditor or Manager fills out the 5 Whys and Fishbone diagram.
2. **AI Assistance (Optional):** User can request AI to suggest root causes.
   - *Backend enforcement:* AI suggestion is recorded as a draft; a human must explicitly accept/save it.
3. **Completion:** Assigns a Primary Root Cause category.

## 4. Corrective & Preventative Action (CAPA) Workflow
1. **Creation:** Multiple CAPAs can be spawned from a single event.
2. **Execution:** Assignee marks CAPA as `In Progress`, uploads required Evidence, and marks `Completed`.
   - *Backend enforcement:* A Quality Event cannot move to `Effectiveness Review` until ALL its linked CAPAs are `Completed`.

## 5. Effectiveness Verification Workflow
1. **Wait Period:** Occurs post-CAPA completion (e.g., 30 days).
2. **Measurement:** QA Reviewer measures error rates before and after.
3. **Decision:** Pass (`Effective` -> Close) or Fail (`Not Effective` -> Reopen/Rework).

## 6. Calibration Workflow
1. QA Manager selects a sample `QualityEvent`.
2. Multiple QA Auditors independently evaluate the event blindly.
3. System calculates `scoreVariance`.
4. Manager finalizes the `calibratedScore`.

## 7. SLA & Escalation Engine (Background Workflow)
While the UI displays SLA warnings (Green/Yellow/Red), the backend must actively manage this:
1. **Job Scheduler (APScheduler):** Scans events continuously.
2. If `warning_threshold` is reached -> Emit "SLA Warning" notification.
3. If `resolution_target` is breached -> Update status to `Breached`, emit "SLA Breach" notification, and potentially trigger automatic status transition to `Escalated`.
