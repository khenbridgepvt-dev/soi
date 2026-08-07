---
id: 47
title: Internal case guards, ad-hoc UX, cloud seed, quick-complete
labels: [wayfinder:task, post-mvp, staff-dashboard]
status: closed
closed: 2026-08-07
parent: 1
blocked-by: [45]
mode: AFK
created: 2026-08-07
---

## HITL — Firm intent

- `FIRM-GENERAL` stays in DB but must never look like a client case.
- Staff dashboard: firm tasks show task name only; tick to complete; history section.
- Internal case never completes; cloud seed via migration.

## Scope

- Migrations `00044_seed_internal_case.sql`, `00045_internal_case_operational_rules.sql`
- API/UI guards: case detail 404, PATCH/DELETE/dependants/reference blocked
- Staff dashboard `firm_tasks` + `firm_tasks_history` + complete button
- `not_started → completed` for internal-case tasks only (DB + API)
- Tests: `internal-case-guards.test.ts`, task-status unit

## Do NOT

- Nullable case_id; global lifecycle skip; username work; CustomTaskAssignModal changes

## Resolution

Internal case hidden from case APIs and pages. Staff dashboard firm-task UX with quick complete and history. Migrations seed cloud and block case completion. Gate 1 green.

## Manual smoke

1. Ad-hoc “Clear emails” → staff dashboard firm section → tick completes.
2. History shows completed firm task.
3. `/cases/f0000000-...` → 404.
4. Client NEXT ACTION still shows reference + Open Case.
