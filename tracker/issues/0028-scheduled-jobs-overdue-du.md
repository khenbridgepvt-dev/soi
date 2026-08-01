---
id: 28
title: Scheduled jobs — overdue and DU alerts
labels: [wayfinder:task, sprint-7-8]
status: open
assignee:
parent: 1
blocked-by: [27]
mode: AFK
created: 2026-08-01
---

## Question

The system watches the clock: Supabase Edge Function crons for overdue detection and the document-upload escalation ladder.

**Scope**

- `detect-overdue` (every 15 min) per [deployment_guide.md §11.1](../../docs/deployment_guide.md): flag overdue tasks (`is_overdue`), notification per US-7.3 — **idempotent**, no duplicate notifications on re-runs.
- `du-alerts` (daily 09:00) per [ADR-0007](../../docs/adr/0007-hybrid-amber-and-du-escalation.md) and [SRS_v4_MVP.md §5.4/5.5](../../docs/SRS_v4_MVP.md): when appointment date exists, compute the 3-**working**-day upload window for Tasks 12/13; alert staff + admin at the threshold; escalate severity each pending working day (warning → critical) until complete.
- Working-day math in `src/lib/utils/dates.ts` (shared with UI amber logic from ticket 0024).
- Schedules via Supabase dashboard/pg_cron. **Not Vercel cron** — Hobby is daily-only (plan §A.1).
- Both functions use the service role; deploy via `supabase functions deploy` (manual, per ADR-0013).

**Spec pointers** — deployment_guide §11.1 · ADR-0007 · SRS §5.4/5.5 · plan §A.1

**Done when** US-7.3 passes (TC-074); running a function twice produces zero duplicate notifications; DU ladder verified against a fixture case with an appointment 5 working days out (day-by-day severity walk); schedules visibly registered in the dashboard.

**Test seam** — `dates.ts` working-day arithmetic (unit: weekends, month edges); dedupe check (integration, run-twice assertion).

**Do NOT**

- No 14/7/1-day progressive tiers, no blocked-task reminders, no appointment safety net (Phase 2, [scope_matrix.md](../../docs/scope_matrix.md) M7/M11).
- No public-holiday calendar — working days = Mon–Fri for MVP (Future scope).
