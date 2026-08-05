# QEMS — 00: Repo Structure & Git Workflow
### Push this structure to GitHub FIRST (empty files/folders are fine). Nobody starts coding until this skeleton is on `main`.

This is the **one merged, final structure** — it takes the folder tree you pasted and re-labels every file by which of the 4 people owns it, matching the 4 task docs exactly. If a doc ever disagrees with this file on a path, **this file wins.**

---

## 1. Root

```
qems/
├── backend/
├── frontend/
├── docs/
│   ├── specs/                      # original spec docs
│   └── team-assignments/           # PERSON-1..4-*.md + this file
├── .github/
│   └── workflows/
│       ├── backend-ci.yml
│       └── frontend-ci.yml
├── docker-compose.yml               # Postgres + Redis, local dev
├── .gitignore
└── README.md
```

---

## 2. Backend — `backend/app/`

Owner tags: **P1** = Person 1 (Foundation) · **P2** = Person 2 (Rebuttal & Decision) · **P3** = Person 3 (Evidence & Notifications) · **P4** = Person 4 (Dashboards & Admin) · **SHARED** = additive-only, see Section 4.

```
backend/
├── app/
│   ├── main.py                          # SHARED — additive router registration only
│   ├── core/                            # P1 — config.py, di.py, exceptions.py, middleware.py
│   ├── contracts/                       # SHARED — frozen request/response shapes, README describes each owner's contract
│   ├── db/
│   │   ├── session.py                   # P1
│   │   ├── base_class.py                # P1
│   │   └── models/
│   │       ├── user.py                  # P1
│   │       ├── role.py                  # P1
│   │       ├── user_role.py             # P1
│   │       ├── lob.py                   # P1
│   │       ├── category.py              # P1
│   │       ├── sub_category.py          # P1
│   │       ├── error.py                 # P1
│   │       ├── error_status_history.py  # P1
│   │       ├── rebuttal.py              # P2
│   │       ├── decision.py              # P2
│   │       ├── evidence_file.py         # P3
│   │       ├── evidence_access_log.py   # P3
│   │       ├── notification_template.py # P3
│   │       ├── notifications_log.py     # P3
│   │       ├── in_app_notification.py   # P3
│   │       ├── ownership_mapping.py     # P4
│   │       ├── sla_rule.py              # P4
│   │       ├── escalation_matrix.py     # P4
│   │       ├── working_hours_calendar.py# P4
│   │       ├── holiday.py               # P4
│   │       └── config_change_history.py # P4
│   ├── auth/                            # P1
│   ├── rbac/                            # P1
│   ├── workflow/                        # P1 — the status state machine + PATCH /errors/:id/status
│   ├── errors/                          # P1 — create/list/detail/draft/submit/history
│   ├── ownership/                       # P1 — owner-resolution logic (calls P4's admin API over HTTP)
│   ├── sla_engine/                      # P1 — snapshot, aging calc, breach + escalation background job
│   ├── rebuttal/                        # P2 — accept/rebut/reopen/rebuttal-correction
│   ├── decision/                        # P2 — decision + reopen-decision logic
│   ├── evidence/                        # P3 — upload/list/download/supersede
│   ├── notifications/                   # P3 — worker + in-app notification endpoints
│   ├── email/                           # P3 — SMTP client
│   ├── search/                          # P4 — advanced filter/sort layer over P1's /errors
│   ├── dashboards/                      # P4 — auditor/team/ops/leadership summaries
│   ├── reports/                         # P4 — CSV export
│   ├── admin/
│   │   ├── lobs.py                      # P1
│   │   ├── categories.py                # P1
│   │   ├── sub_categories.py            # P1
│   │   ├── users.py                     # P1 — user/role admin endpoints
│   │   ├── ownership_mapping.py         # P4
│   │   ├── sla_rules.py                 # P4
│   │   ├── escalation_matrix.py         # P4
│   │   ├── working_hours.py             # P4
│   │   ├── holidays.py                  # P4
│   │   ├── notification_templates.py    # P3
│   │   └── config_history.py            # P4
│   └── extensibility/                   # STRETCH GOALS ONLY — do not start before Sprint 6, see each person's doc
│       ├── categorization.py            # P1 (stretch)
│       ├── duplicate_detection.py       # P1 (stretch)
│       ├── analytics.py                 # P4 (stretch)
│       └── summarization.py             # P4 (stretch)
├── alembic/
│   └── versions/                        # naming convention below in Section 5 — everyone adds migrations here, nobody edits another person's migration file
├── tests/
│   ├── person1_foundation/
│   ├── person2_rebuttal_decision/
│   ├── person3_evidence_notifications/
│   └── person4_dashboards_admin/
├── requirements.txt
├── Dockerfile
└── README.md
```

---

## 3. Frontend — `frontend/src/`

```
frontend/
├── src/
│   ├── App.tsx                          # SHARED — additive routes only
│   ├── app/
│   │   └── shell/                       # P1 — builds the skeleton once, freezes it
│   │       ├── AppShell.tsx
│   │       ├── TopBar.tsx                # includes an empty <NotificationBellSlot /> for P3
│   │       ├── LeftNav.tsx
│   │       ├── Footer.tsx
│   │       └── navItems.ts               # SHARED — additive only, each person appends their own entry
│   ├── features/
│   │   ├── person1_foundation/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── AuditorDashboard.tsx
│   │   │   ├── LogNewErrorForm/
│   │   │   ├── ErrorDetail/              # ⚠️ shell with 4 placeholder slots — see Section 4
│   │   │   ├── OverviewTab.tsx
│   │   │   ├── HistoryTab.tsx
│   │   │   └── useAuth.ts                # SHARED contract, owned + frozen by P1
│   │   ├── person2_rebuttal_decision/
│   │   │   ├── RespondTab.tsx
│   │   │   ├── DecisionTab.tsx
│   │   │   ├── RebuttalAction.tsx
│   │   │   └── DecisionAction.tsx
│   │   ├── person3_evidence_notifications/
│   │   │   ├── EvidenceTab.tsx
│   │   │   ├── EvidenceUploadWidget.tsx  # reused by P2's RebuttalAction via import from this folder
│   │   │   └── NotificationBell.tsx
│   │   └── person4_dashboards_admin/
│   │       ├── admin/
│   │       │   ├── LobsCategories.tsx
│   │       │   ├── OwnershipMapping.tsx
│   │       │   ├── SlaRules.tsx
│   │       │   ├── EscalationMatrix.tsx
│   │       │   ├── WorkingHoursHolidays.tsx
│   │       │   ├── UsersRoles.tsx
│   │       │   └── ConfigHistory.tsx
│   │       ├── dashboards/
│   │       │   ├── TeamDashboard.tsx
│   │       │   ├── OpsDashboard.tsx
│   │       │   └── LeadershipDashboard.tsx
│   │       ├── escalations/
│   │       │   └── EscalationsView.tsx
│   │       ├── reports/
│   │       │   └── ReportsExport.tsx
│   │       └── VersionedConfigTable.tsx   # shared pattern across the 3 config screens above
│   ├── lib/
│   │   └── api/
│   │       ├── authApi.ts                 # P1
│   │       ├── errorsApi.ts               # P1
│   │       ├── rebuttalApi.ts             # P2
│   │       ├── decisionApi.ts             # P2
│   │       ├── evidenceApi.ts             # P3
│   │       ├── notificationsApi.ts        # P3
│   │       ├── adminApi.ts                # P4
│   │       ├── dashboardsApi.ts           # P4
│   │       └── reportsApi.ts              # P4
│   └── design-system/                     # SHARED — built jointly Sprint 0, then frozen (see Section 4)
│       ├── tokens.ts
│       ├── Button.tsx
│       ├── Badge.tsx
│       ├── Modal.tsx
│       ├── DataTable.tsx
│       ├── FilterBar.tsx
│       ├── Tooltip.tsx
│       └── Toast.tsx
├── public/
├── package.json
└── README.md
```

**Note on `EvidenceUploadWidget`:** it physically lives in `person3_evidence_notifications/`, but Person 2's `RebuttalAction.tsx` imports it directly (`import EvidenceUploadWidget from '../person3_evidence_notifications/EvidenceUploadWidget'`). This is the **one deliberate exception** to "never import another person's file" — it's a shared, stable UI widget, not business logic. Person 3 must not change its prop signature after Sprint 2 without telling Person 2.

---

## 4. The 4 Shared Files — Exactly Who Edits What, When

| File | Built by | Edited by others? |
|---|---|---|
| `backend/app/main.py` | P1 scaffolds it Sprint 0 | Everyone adds their own router-include line only, in their own PR |
| `frontend/src/App.tsx` | P1 scaffolds it Sprint 0 | Everyone adds their own route line only, in their own PR |
| `frontend/src/app/shell/navItems.ts` | P1 scaffolds it Sprint 0 | Everyone appends one array entry for their own nav link |
| `frontend/src/features/person1_foundation/ErrorDetail/` (shell) | P1 builds 4 empty slots in Sprint 2 | P2 adds `RespondTab`/`DecisionTab` imports; P3 adds `EvidenceTab` import — one line each, no other edits |
| `frontend/src/app/shell/TopBar.tsx` (bell slot) | P1 builds the empty slot Sprint 2 | P3 adds the `NotificationBell` import — one line, no other edits |
| `frontend/src/design-system/` | Built **jointly** in Sprint 0 (see Section 6) | Frozen after Sprint 0 — if someone needs a new shared component after that, they propose it in a PR others review, never silently add variants |

Every one of these files only ever receives **additive one-line changes** from people other than its primary builder. If a task ever seems to require more than that, it means the task was scoped wrong — stop and ask in the team channel before editing.

---

## 5. Alembic Migration Naming Convention
Since `alembic/versions/` is a shared folder but nobody should edit another person's migration file:
- Filename prefix = your person number: `p1_0001_create_users_roles_categories.py`, `p2_0001_create_rebuttals_decisions.py`, etc.
- Never edit a migration file once it's merged to `main` — write a new one, even to fix a mistake.
- Before writing a new migration, always `git pull origin main` first so your migration is chained on top of the latest one, not a stale parent.

---

## 6. Sprint 0 — Before Anyone Starts Their Own Feature
1. Whoever pushes first creates the full folder skeleton above (empty `__init__.py`/placeholder files are fine) on `main`.
2. All 4 people pair (even briefly) on `design-system/` — tokens, Button, Badge, Modal, DataTable, FilterBar, Tooltip, Toast. Freeze it before Sprint 1 starts.
3. Person 1 scaffolds `main.py`, `App.tsx`, `navItems.ts`, and stubs the empty `ErrorDetail` slots and `TopBar` bell slot, and pushes to `main`.
4. Everyone clones the repo **after** step 3 is merged, then creates their own branch from `main`.

---

## 7. Git Workflow — Branches, Clone, Pull, PR Order

### One-time setup (each person)
```bash
git clone <repo-url>
cd qems
git checkout main
git pull origin main
git checkout -b feature/personN-xxx      # see exact branch name in your task doc
```

### Every single work session (in this order, every time)
```bash
git checkout main
git pull origin main
git checkout feature/personN-xxx
git merge main                            # resolve conflicts now, while they're small — never let 2 weeks pass
```
Do this **before** starting work each day/session, not just once at project start.

### When you finish a task (not a whole sprint — a single task)
```bash
git add <only the files inside your own folder, plus any single additive line in a shared file>
git commit -m "P<N>: <TASK-ID> <short description>"
git push origin feature/personN-xxx
```
Open a PR into `main` **per completed task or small task-group**, not one giant PR at the end of a sprint. Small, frequent PRs are what actually keeps merge conflicts near zero — this matters more than the folder split itself.

### PR merge order each sprint
Because everyone else's feature calls Person 1's API, **Person 1's PR for a given sprint should be reviewed and merged first**, before Person 2/3/4 merge PRs that assume Person 1's new endpoint shape. If Person 1 is behind, the others keep building against their last-agreed mock shape rather than blocking.

---

## 8. Task Sequencing Rule (applies inside every person's doc)
Each task doc now lists tasks as **TASK X → TASK Y → TASK Z**, in the order you must complete them — some tasks are hard-blocked on your own earlier task, others are hard-blocked on another person's task landing on `main`. Each task explicitly states:
- **Depends on:** (your own earlier task, and/or another person's task + whether it must be merged to `main` or just mocked)
- **Branch / git action:** which branch you're on and whether to pull `main` first (always yes, per Section 7)
- **Unblocks:** who can start their next task once this one is merged

See each `PERSON-N-*.md` file's new "Task Sequence" table at the top of the Backend and Frontend sections.
