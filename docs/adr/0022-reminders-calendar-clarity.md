# ADR-0022: Reminders, calendar clarity, and schedule freshness

**Status:** Accepted  
**Date:** 2026-08-17  
**Ticket:** [0070](../../tracker/issues/0070-reminders-calendar-clarity-adr.md)  
**Related:** [REMINDERS_AND_CALENDAR.md](../REMINDERS_AND_CALENDAR.md) · tickets 0071–0086

## Context

After MVP and the document-preparation epic (ADR-0021), the firm needs **clearer calendars** and **proactive reminders** so staff and admins see what is due, overdue, or at risk without re-reading the task board. Today:

- Schedule and staff day calendar use status pills (0039) but lack a unified **traffic-light** semantics for done / in progress / overdue.
- Schedule data refreshes on **60s polling** (ADR-0016, ADR-0003) — stale when a colleague assigns or moves work.
- **Blocked-task reminders** exist in Phase 2 scope only; there is no per-task **reminder date** or **deadline warning** in MVP.
- **Reschedule** is admin-driven (EP-13); staff cannot request a slot change with an approval path.
- **Personal tasks** (firm or client-linked to-do items outside the 13-task lifecycle) are not modelled.
- Calendar views are **day-only** (S-04 admin grid, S-11 staff day); week/month views are requested for planning.

Pilot constraints (ADR-0013/0014) remain: free tier, single Supabase project, no SMS/email dispatch in this epic.

## Problem

- Staff miss follow-ups because reminders live outside the CRM (sticky notes, Outlook).
- Admins cannot see **yesterday's unfinished work** or **carry-over** from prior days at a glance.
- Calendar pills do not consistently signal **urgent**, **reminder due**, and **overdue** in one visual language.
- Multi-user schedule edits feel laggy without targeted Realtime on assignments.

## Decision

### Product (locked v1)

| Area | Decision |
|------|----------|
| Reminder scope | **Per task** (case checklist task or personal task) — not per case |
| Reminder fields | `reminder_date` (date, required when reminder set), `reminder_note` (text, optional); optional `deadline_date` + `remind_days_before` (integer, days before deadline to surface warning) |
| Reminders nav | New **Reminders** item for **admin and staff** — list filtered to **at-risk**, **overdue**, and **reminder due today / past** |
| Calendar colours | **Green** = completed; **amber** = in progress or approaching (deadline within `remind_days_before`, or due today); **red** = overdue, reminder due/past, urgent case flag, or blocked |
| Schedule freshness | Subscribe to Realtime **`task_assignments`** changes for the signed-in staff member (and admin schedule scope); on event, **invalidate** `queryKeys.schedule.*` (extend ADR-0016 pattern) — replaces 60s polling for assignment-driven updates on schedule views |
| Notification UX | **Toast + short sound** on new in-app notifications; **default ON**; **mute** toggle in **My Profile** (staff + admin) |
| Reschedule | **Staff request** → creates admin **notification** with **Approve / Reject** actions; on approve, admin flow reuses EP-13 validation (or auto-assign if slot still valid — implementation in 0077–0078) |
| Staff personal tasks | Allowed on **firm/internal** work and on **client cases the staff member is assigned to**; creator may **edit/delete own** rows only; admins retain full visibility per case access |
| Calendar views | **Week** and **month** views on **staff** and **admin** schedule surfaces (in addition to existing day views) |
| Carry-over | **Incomplete** scheduled work from prior days appears on **today's** calendar (staff + admin) with distinct carry-over styling |
| Admin yesterday strip | **Admin** schedule/dashboard shows a **yesterday pending** strip — assignments/tasks not completed by end of yesterday |

### Architecture

```
┌──────────────────┐     ┌─────────────────────────┐     ┌─────────────────────┐
│ Tasks + personal │────▶│ Reminder / deadline     │────▶│ Reminders list      │
│ tasks (0071–72)  │     │ fields + due queries    │     │ nav (0073)          │
└────────┬─────────┘     └─────────────────────────┘     └─────────────────────┘
         │
         ▼
┌──────────────────┐     ┌─────────────────────────┐     ┌─────────────────────┐
│ Schedule views   │◀────│ Colour tokens (0074)    │     │ Week / month (0081–82)│
│ day/week/month   │     │ green / amber / red     │     │ carry-over (0083)   │
└────────┬─────────┘     └─────────────────────────┘     └─────────────────────┘
         │
         ▼
┌──────────────────┐     ┌─────────────────────────┐
│ Realtime         │────▶│ invalidate schedule     │
│ task_assignments │     │ keys (0075)             │
└──────────────────┘     └─────────────────────────┘

┌──────────────────┐     ┌─────────────────────────┐
│ Notifications    │◀────│ Toast + sound (0076)   │
│ + reschedule     │     │ profile mute            │
│ (0077–78)        │     └─────────────────────────┘
└──────────────────┘
```

1. **Task reminders (0071–0072)** — Extend `tasks` (and personal-task table if split) with reminder/deadline columns; server helpers compute **due / at-risk / overdue** for list and pill colour.

2. **Reminders list (0073)** — Shared page or section under `/reminders` (admin + staff shells); queries reuse reminder lib; respects RLS (staff see assigned cases + own personal tasks).

3. **Calendar colours (0074)** — Centralise pill/slot colour in one module (extend `assignment-status.ts` / design tokens); map task state + reminder/deadline + `is_urgent` + `blocked` to green/amber/red per table above.

4. **Realtime schedule (0075)** — Narrow Realtime channel on `task_assignments` (staff: own `staff_id`; admin: day grid). On INSERT/UPDATE/DELETE, invalidate schedule queries. Task board polling unchanged unless ticket 0086 consolidates.

5. **Toast + sound (0076)** — Client hook on notification INSERT (existing Realtime from 0027); Web Audio or bundled short clip; `profiles.notification_sound_muted` or preferences JSON.

6. **Reschedule request (0077–0078)** — New notification type (or reuse `extension_request` pattern); staff submits desired slot; admin Approve triggers assign/reassign API; Reject notifies staff with reason.

7. **Personal tasks (0079–0080)** — Table `staff_personal_tasks` (or flagged `tasks.is_personal`) with `created_by`, optional `case_id`, `title`, `notes`, reminder fields; RLS: own CRUD + admin read on visible cases.

8. **Week/month views (0081–0082)** — Extend S-04 / S-11 with view toggle; same data layer as day grid; month may aggregate counts per day.

9. **Carry-over + yesterday strip (0083–0084)** — Query layer marks incomplete assignments before `view_date` as carry-over on today; admin strip queries yesterday's incomplete set.

## Consequences

- **Positive:** Single visual language across board, schedule, and reminders list; staff-initiated reschedule reduces admin inbox friction.
- **Positive:** Targeted Realtime reduces schedule staleness without full board Realtime (ADR-0003 Phase 2 scope).
- **Negative:** Colour rules must stay documented — risk of drift between board tokens and schedule pills without shared module (0074).
- **Negative:** Sound in open-plan office may annoy — mute in profile is mandatory.
- **Follow-up tickets:** 0071 → 0086 per [REMINDERS_AND_CALENDAR.md](../REMINDERS_AND_CALENDAR.md) and ticket 0070 epic table.

## Out of scope (v1)

- SMS, email, or push notifications
- Recurring reminders or snooze
- Staff self-assign without admin approval (except personal tasks)
- Drag-and-drop reschedule on calendar (Phase 2 Advanced)
- Public holiday calendar / half-day leave (Future)
- Replacing DU/overdue cron jobs (0028) — complementary, not removed
