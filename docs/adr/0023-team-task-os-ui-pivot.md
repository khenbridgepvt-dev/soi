# ADR-0023: Team Task OS — UI and information architecture pivot

**Status:** Accepted  
**Date:** 2026-08-22  
**Ticket:** [0090](../../tracker/issues/0090-team-task-os-adr.md)  
**Related:** [TEAM_TASK_OS.md](../TEAM_TASK_OS.md) · tickets 0091–0099

## Context

Pilot feedback (Aug 2026): Soi feels **too complex** and **case-CRM-first**. The firm's daily work is a **team task calendar** — assign simple firm work, see who is doing what, tick tasks done — not navigating cases, checklists, and document wizards on every login.

**Backend capability already exists:**

| Capability | Shipped in |
|------------|------------|
| Firm adhoc tasks on `FIRM-GENERAL` | 0043–0044, `POST /api/schedule/adhoc-task-assign` |
| Schedule grid + assign modal | 0021–0022, S-04/S-09 |
| Schedule Realtime on `task_assignments` | 0075 |
| Notification toast + sound + mute | 0076 |
| Staff status PATCH (online/break/offline) | EP-12, 0025 |
| Task status machine (not_started → in_progress → completed) | 0017, EP-12 |
| Staff dashboard `firm_tasks` + quick complete | 0047, 0049 |

The gap is **information architecture (IA)** and **visual hierarchy**: admin lands on dashboard/cases; staff lands on a priority dashboard mixing case and firm work; calendar cells use status **pills** rather than **full-cell status colours**; case features share top-level nav with scheduling.

ADR-0022 (reminders epic) added valuable infrastructure but deepened case-adjacent surfaces (Reminders nav, reschedule flow, personal tasks DB). Tickets **0080–0086** (personal tasks UI, week/month views, carry-over) are **paused** until Team Task OS ships.

## Problem

- Admin opens Soi and must find **Schedule** among Cases, Task Board, Reminders — not the team's day view.
- Staff see a **case-oriented dashboard** before a simple **My tasks** list with Start / Done.
- Calendar blocks do not read at a glance: grey (not started), yellow (in progress), green (done), red (overdue).
- Status changes on assignments do not feel **live** beyond assignment moves (0075); task status changes still rely on polling.
- `staff_personal_tasks` (0079) adds a second task model before the primary firm-task UX is polished.

## Decision

### Product (locked v1 — Team Task OS)

| Area | Decision |
|------|----------|
| Primary product | **Team task calendar** — assign and track firm work first; case CRM remains available under **Advanced** |
| Admin landing | **`/schedule`** (Team Schedule) after login — not `/dashboard` |
| Staff landing | **`/staff/tasks`** (My tasks) — not `/staff/dashboard` |
| Task type (v1) | **FIRM-GENERAL adhoc tasks only** — reuse `POST /api/schedule/adhoc-task-assign`; no `staff_personal_tasks` UI |
| Admin nav — Main | **Team Schedule**, **Team** (workload strip in 0099) |
| Admin nav — Advanced | Dashboard, Cases, Task Board, Reminders, Blocked, Archive, Settings |
| Staff nav — Main | **My tasks**, **My calendar** |
| Staff nav — Advanced | Dashboard (legacy priority list), Cases (assigned), Reminders, Profile |
| Calendar colours | **Full cell background** by task status: **grey** not started, **yellow** in progress, **green** completed, **red** overdue |
| Realtime | Keep **0075** `task_assignments`; add **`tasks` Realtime** (0097) for status changes on schedule + My tasks |
| Assign UX | **+ Assign task** CTA on schedule header (0092); **simplified firm-only modal** — hide case audit link (0093) |
| Notifications | Admin notified when staff **completes** a firm task (0098); toast/sound unchanged (0076) |
| Workload | Per-person **done / overdue / in progress** strip on admin schedule (0099) |

### Architecture

```
┌─────────────────────┐     ┌──────────────────────────┐
│ Admin login         │────▶│ /schedule (Team Schedule) │
│ + Assign task CTA   │     │ full-cell status colours │
└──────────┬──────────┘     └────────────┬─────────────┘
           │                              │
           ▼                              ▼
┌─────────────────────┐     ┌──────────────────────────┐
│ adhoc-task-assign   │     │ Realtime: assignments +   │
│ → FIRM-GENERAL      │     │ tasks (0097)              │
└─────────────────────┘     └──────────────────────────┘

┌─────────────────────┐     ┌──────────────────────────┐
│ Staff login         │────▶│ /staff/tasks (My tasks)   │
│ tabs + Start/Done   │     │ firm_tasks from dashboard │
└─────────────────────┘     └──────────────────────────┘

┌─────────────────────┐
│ Advanced nav        │  Cases · Task Board · Documents · Leads · Archive
│ (unchanged APIs)    │  — not deleted; demoted in IA
└─────────────────────┘
```

1. **IA pivot (0091, 0094)** — Reorder nav; change default post-login redirects; case features move to Advanced.

2. **Schedule-first assign (0092–0093)** — Prominent assign entry; modal defaults to firm task (name, duration, slot) without case picker or audit link.

3. **Staff My tasks hub (0095)** — Tabbed list (Not started / In progress / Done); Start and Done actions; data from existing staff dashboard / firm_tasks APIs.

4. **Status calendar colours (0096)** — Replace pill-first styling with full-cell status colours on admin schedule and staff calendar.

5. **Tasks Realtime (0097)** — `ALTER PUBLICATION` + client hook; invalidate schedule, staff tasks, and board keys on task UPDATE.

6. **Completion notifications (0098)** — Fanout to active admins when staff marks firm task completed.

7. **Workload strip (0099)** — Aggregate counts per team member for the viewed day.

### Pause: reminders epic 0080–0086

| Ticket | Reason paused |
|--------|----------------|
| 0080 | Personal tasks UI — second task model; firm adhoc is v1 |
| 0081–0082 | Week/month views — after Team OS core |
| 0083–0084 | Carry-over / yesterday strip — after Team OS core |
| 0085–0086 | Integration tests / polish — re-scope after 0099 |

`staff_personal_tasks` table and EP-67 API (0079) **remain in DB**; UI deferred.

## Consequences

- **Positive:** Faster daily workflow for admin and staff; aligns product with firm mental model.
- **Positive:** Reuses existing APIs — low backend risk for v1.
- **Positive:** Case CRM, documents, and leads remain for immigration work without removal.
- **Negative:** Two nav mental models (Main vs Advanced) require onboarding copy.
- **Negative:** ADR-0022 colour semantics (amber for approaching) partially superseded by status-first grey/yellow/green/red on schedule — document in TEAM_TASK_OS.md.
- **Follow-up:** 0091 → 0099 per [TEAM_TASK_OS.md](../TEAM_TASK_OS.md).

## v1.1 addendum (pilot UX — tickets 0100–0105)

| Fix | Decision |
|-----|----------|
| Schedule columns | Staff/senior only — exclude admin from grid and assign prefill |
| Assign modal | Required **Assign to** picker; header CTA must not default to admin |
| Empty slot | Direct **Assign team task** modal — no slot action menu on Team Schedule |
| Completed colour | `!bg-status-onTrack-bg` (Tailwind nested token) |
| Staff notify on assign | `task_status_changed` title **Team task assigned** — mirrors 0098 complete fanout |

## Production hotfix addendum (ticket 0106)

| Fix | Decision |
|-----|----------|
| Schedule API | Return `role` on each staff row — required for header **+ Assign task** prefill |
| Internal custom-task cap | `enforce_custom_task_limit` skips `cases.is_internal` — firm tasks are unlimited on `FIRM-GENERAL` |
| Deploy | Migration `00058` before Vercel deploy |

## Out of scope (Team OS v1)

- `staff_personal_tasks` UI (0079 API only)
- Week/month calendar views (0081–0082)
- Personal tasks in `/api/reminders` union
- Removing or hiding case APIs
- Drag-and-drop calendar (Phase 2)
- New task types beyond FIRM-GENERAL adhoc
