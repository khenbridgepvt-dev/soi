---
id: 71
title: Task reminder columns migration
labels: [wayfinder:task, post-mvp, reminders]
status: closed
closed: 2026-08-17
parent: 1
blocked-by: [70]
created: 2026-08-17
---

## HITL — Firm intent

Per-task reminders and optional deadlines on the existing `tasks` table (ADR-0022) — column-only migration before API and Reminders list.

## Scope

- Migration `00050_task_reminder_columns.sql` — `reminder_date`, `reminder_note`, `deadline_date`, `remind_days_before` on `public.tasks`
- CHECK constraints: `reminder_note` ≤ 500 chars; `remind_days_before` ≥ 0 when set
- Partial index `idx_tasks_reminder_date_open` for open-task reminder queries
- Regenerate `src/types/database.ts`
- `docs/database_schema.md` T5 addendum
- Integration tests in `schema-constraints.test.ts`

## Do NOT

- RLS policy changes (0072)
- API routes (0072)
- Reminders UI (0073)
- Personal tasks table (0079)

## Done when

- `supabase db reset` applies 00050
- Gate 1 green
- Constraint integration tests pass

## Test seam

- `tests/integration/schema-constraints.test.ts` (reminder_note length, remind_days_before)

## Resolution

Migration 00050 adds four nullable reminder/deadline columns to `tasks` with CHECK constraints and partial index on `reminder_date` for non-completed, non-deleted rows. Types regenerated. Schema doc T5 and index table updated. Integration tests cover CHECK failures. Gate 1 green.

## Manual smoke

1. After 0072: set reminder on a task via API; row persists `reminder_date` + `reminder_note`.
