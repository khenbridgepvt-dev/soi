# Team Task OS — product guide

**ADR:** [0023-team-task-os-ui-pivot.md](./adr/0023-team-task-os-ui-pivot.md)  
**Epic:** tickets [0090](../tracker/issues/0090-team-task-os-adr.md)–[0099](../tracker/issues/0099-team-workload-strip.md)  
**Paused:** [0080–0086](./REMINDERS_AND_CALENDAR.md) (reminders calendar epic UI)

Soi's **primary product** after this pivot is a **team task calendar**: admins schedule firm work; staff see **My tasks** and complete them; the calendar uses **status-first full-cell colours**.

Case CRM (cases, 13-task checklist, documents, leads) stays in the product under **Advanced** navigation — not deleted.

---

## 1. Target admin screen — Team Schedule

**Route:** `/schedule` (default after admin login)

| Zone | Content |
|------|---------|
| Header | Date picker · **+ Assign task** CTA (0092) · view controls |
| Workload strip | Per staff member: in progress / done today / overdue (0099) — **implemented** |
| Grid | TLS day grid (S-04) — one column per staff member |
| Cells | **Full background colour** by task status (see §3) |
| Slot actions | Click empty slot → **Assign team task** modal directly (0103); click booked task → detail where applicable |

**Assign flow (0093, 0102, 0111–0112):** Opens simplified modal — **Assign to** staff picker, **date**, **start time** (any minute), task name, duration. Creates firm task via `POST /api/schedule/adhoc-task-assign` on `FIRM-GENERAL`. Off days blocked; outside working hours shows warning but allows submit. Schedule grid columns are **staff/senior only** (0101). **`GET /api/schedule` returns `role` per staff row** (0106). **No** case search, **no** audit link to client case task. **Edit title/notes:** admin `PATCH /api/tasks/:id/firm` (0121 API); schedule pill edit modal in 0123. **Remove:** admin `DELETE /api/tasks/:id/firm` (0122 API); UI confirm in 0124.

**Firm task volume:** The internal case (`FIRM-GENERAL`) is **not** subject to the per-client-case cap of 5 custom tasks (migration `00058`, ADR-0019 addendum). Team schedules may create unlimited firm tasks.

**Realtime:** Assignment INSERT/UPDATE/DELETE (0075) + task status UPDATE (0097) **refetch** active views (not just invalidate). See **§9** for assign vs status latency. Migration `00056_tasks_realtime.sql`; hooks `useScheduleRealtime`, `useTasksRealtime`; 15s poll fallback on schedule and My tasks when disconnected.

---

## 2. Target staff screen — My tasks

**Route:** `/staff/tasks` (default after staff login)

| Zone | Content |
|------|---------|
| Tabs | **Not started** · **In progress** · **Done** |
| Row | Task name · scheduled time (if assigned) · **Start** / **Done** actions |
| Link | **My calendar** → `/staff/calendar` (day view, same status colours) |

**Data source (v1):** `GET /api/dashboard/staff?view=today` → `firm_tasks` (FIRM-GENERAL / `cases.is_internal` only). Completed firm tasks via `GET /api/dashboard/staff/history?internalOnly=true`. **Implemented in ticket 0095.** No `staff_personal_tasks` UI.

**Actions:**

- **Start** → `PATCH /api/tasks/:id/status` `{ "status": "in_progress" }`
- **Done** → `{ "status": "completed" }` (direct complete allowed for internal case per 0047)

**Realtime (0110b):** `useTasksRealtime` + `useScheduleRealtime` (`ignoreViewedDate: true`) → `refetchActiveTaskViewQueries`; 15s poll + `refetchOnWindowFocus` on dashboard query. New assignments appear on `task_assignments` INSERT without waiting for `tasks.assigned_to` UPDATE.

---

## 3. Calendar colour table (status-first, full cell)

Applies to **admin Team Schedule** and **staff My calendar** (0096). Cell **background** is the primary signal; text remains readable. **Implemented** in `src/lib/tasks/team-task-status-colour.ts` (ticket 0096).

| Status | Colour | Token (proposed) | When |
|--------|--------|------------------|------|
| Not started | Grey | `status.notStarted` | `status = not_started`, slot in future or today |
| In progress | Yellow | `status.inProgress` | `status = in_progress` |
| Completed | Green | `status.completed` | `status = completed` |
| Overdue | Red | `status.overdue` | `is_overdue = true` or slot end in past and not completed |
| Blocked | Brown/tan | `status.blocked` | `status = blocked` (existing token) |

**Note:** ADR-0022 amber/green/red **reminder** semantics still apply on **Reminders list** and task board where not superseded by this ticket. Schedule grid adopts **status-first** colours above.

**Urgent case flag:** May add border or icon; does not override completed green.

---

## 4. Navigation map

### Admin

| Section | Items |
|---------|--------|
| **Main** | Team Schedule (`/schedule`) · Team (`/team`) |
| **Advanced** | Dashboard (`/dashboard`) · Cases · Task Board · Reminders · Blocked Tasks · Archive · Settings (application types, letterhead, staff, profile) |

Login redirect: **`/schedule`** (0091).

### Staff

| Section | Items |
|---------|--------|
| **Main** | My tasks (`/staff/tasks`) · My calendar (`/staff/calendar`) |
| **Advanced** | Dashboard (`/staff/dashboard`) · Cases (assigned) · Reminders · My Profile |

Login redirect: **`/staff/tasks`** (0094).

---

## 5. Epic ticket table (0090–0099)

| Ticket | Scope (one line) |
|--------|------------------|
| **0090** | ADR-0023 + this doc + tracker stubs |
| **0091** | Admin nav restructure; login → `/schedule` |
| **0092** | + Assign task button on schedule header |
| **0093** | Simplified firm-only assign modal; hide case audit link |
| **0094** | Staff nav + login → `/staff/tasks` |
| **0095** | My tasks hub: tabs, Start/Done, firm_tasks API |
| **0096** | Full-cell status calendar colours (grey/yellow/green/red) |
| **0097** | Realtime on `tasks` + invalidation hook — **implemented** |
| **0098** | Admin notification when staff completes firm task — **implemented** |
| **0099** | Team workload strip on admin schedule — **implemented** |

**Dependency order:** 0090 → 0091 → 0092–0093 (parallel) → 0094 → 0095 → 0096 → 0097 → 0098–0099 (parallel).

---

## 6. Paused work (0080–0086)

| Ticket | Original scope | Pause reason |
|--------|----------------|--------------|
| 0080 | Personal tasks UI | Firm adhoc is v1 task model |
| 0081–0082 | Week/month views | After Team OS core |
| 0083–0084 | Carry-over / yesterday strip | After Team OS core |
| 0085–0086 | Tests / polish | Re-scope after 0099 |

**0079 `staff_personal_tasks` + EP-67:** Database and API **shipped**; **no UI** until epic resumes after Team OS.

---

## 7. Manual smoke checklist (full epic)

Run after **0099** on pilot/staging.

### Admin

1. Login → lands on **Team Schedule** (`/schedule`), not dashboard.
2. **+ Assign task** → create firm task on empty slot → appears on grid with **grey** cell.
3. Second admin/staff marks task in progress → cell turns **yellow** without full page refresh (0097).
4. Staff completes task → cell **green**; admin receives notification (0098) — **implemented** (`task_status_changed`).
5. Overdue firm task shows **red** cell.
6. **Advanced → Cases** still opens case list; no regression.
7. Workload strip shows per-person counts for the day (0099) — **implemented**.

### Staff

1. Login → lands on **My tasks** (`/staff/tasks`).
2. **Not started** tab lists assigned firm tasks; **Start** moves to In progress.
3. **Done** completes task; row moves to Done tab.
4. **My calendar** shows same task with matching cell colour.
5. Toast/sound on new assignment notification (0076, 0105 — title **Team task assigned**).

### Regression

- `POST /api/schedule/adhoc-task-assign` unchanged contract.
- Case accept, document wizard, task board still reachable from Advanced.
- `GET /api/personal-tasks` works via API but has no nav entry (0079 paused).

---

### v1.1 smoke addendum (0100–0105)

1. **+ Assign task** defaults to first **staff/senior** column — not admin.
2. Modal shows **Assign to** dropdown; change staff before submit.
3. Click empty slot → team assign modal (no slot action menu).
4. Complete a firm task → cell **green** (`status-onTrack-bg`).
5. Staff receives **Team task assigned** toast/sound on assign.

### Production hotfix (0106)

1. **+ Assign task** opens modal (schedule API includes `role` on staff rows).
2. Assign sixth+ firm task on same day succeeds (internal case exempt from 5-custom cap).
3. If no staff have timetables/slots, header CTA shows a toast instead of silent no-op.

### Realtime refetch (0109, 0110b)

1. Staff **Start** → admin schedule cell **yellow** within ~2s (no F5).
2. Staff **Done** → admin cell **green** within ~2s.
3. Admin **assign** → staff **My Tasks** new row within ~2s (0110b).
4. Toast may still arrive before or after list row; **0110a** improves notification reliability.

### Flexible assign (0111–0112)

1. **+ Assign task** → pick any date, **10:15** start, 90 min duration → succeeds (end **11:45**).
2. Assign on staff **off day** → error, submit disabled.
3. Assign **07:00–08:00** before staff start → amber warning, still assigns.
4. Task board **client** assign at **10:15** → still rejected (30-min rule).

**Pilot DB:** apply migrations `00056`–`00058` (`supabase db push`) before relying on realtime, status notifications, and unlimited firm tasks.

## 8. Doc updates per downstream ticket

| Artifact | Tickets |
|----------|---------|
| `ui_wireframe_spec.md` | 0091, 0092, 0095, 0096 |
| `design_system.md` | 0096 |
| `api_specification.md` | 0098 (notification type), 0106 (schedule `role`, adhoc errors) |
| `database_schema.md` | 0106 (internal custom-task limit exemption) |
| `TEAM_TASK_OS.md` §9 | 0109, 0110b, 0110a (live update channels) |
| `USER_WORKFLOWS.md` | 0099 or follow-up polish |

---

## 9. Live updates — assign vs status (0109, 0110b, 0110a)

Three channels fire when admin assigns firm work:

| Event | Table | Admin schedule | Staff My Tasks | Staff toast/bell |
|--------|--------|----------------|----------------|------------------|
| New slot booked | `task_assignments` INSERT | `useScheduleRealtime` → refetch (0110b) | `useScheduleRealtime` → refetch (0110b) | — |
| Assignee set | `tasks` UPDATE (`assigned_to`) | `useTasksRealtime` → refetch (0109) | `useTasksRealtime` → refetch (0109) | — |
| Notify staff | `notifications` INSERT | — | — | `useRealtime` (often fast) |

**Why colours felt instant but assign felt ~7s (pre-0110b):** **0109** wired `tasks` UPDATE to `refetchActiveTaskViewQueries` — staff **Start/Done** updates admin cell colours within ~2s. Staff **My Tasks** only listened to `tasks` UPDATE, not `task_assignments` INSERT, and had no poll fallback — so the list often lagged until `assigned_to` propagated or manual F5. The **notification** could still arrive first via a separate Realtime channel.

**0110b (shipped):** `use-schedule-realtime` calls `refetchActiveTaskViewQueries` (schedule + `staffTasks` + board + reminders). **My Tasks** mounts `useScheduleRealtime` with `ignoreViewedDate: true` so future-date assigns also refetch. Poll: 15s + window focus.

**0110a (shipped):** Notification poll backup (60s), Realtime resubscribe on channel error, AudioContext unlock on first click in `AppShell`. Toast still suppressed when notification drawer is open; sound skipped when tab hidden (browser policy).

**Layout note:** Schedule **COMPLETED** suffix text only shows when booked cell spans ≥2 rows (~60+ min). Short tasks use green fill + status dot only — not a data bug.

**Code:** `src/lib/query/refetch-views.ts` — `refetchActiveScheduleQueries`, `refetchActiveTaskViewQueries`.
