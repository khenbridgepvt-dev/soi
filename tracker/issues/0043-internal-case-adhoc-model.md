---
id: 43
title: Internal case model for ad-hoc schedule work
labels: [wayfinder:task, post-mvp, schedule]
status: closed
closed: 2026-08-06
parent: 1
blocked-by: []
mode: AFK
created: 2026-08-06
---

## HITL — Firm intent

Generic calendar work ("clear emails", "help invoices") is usually **not** tied to a client case. Optional audit link to an existing case task may follow in 0044.

## Scope

- ADR-0019
- Migration `00043_internal_case.sql` — `cases.is_internal`; seed `FIRM-GENERAL` in `supabase/seed.sql` (client "Firm operations", `status = active`)
- Filter `is_internal` from case list, global search, assignable case picker, dashboard counts, task board
- `fetch-schedule.ts` — `case_is_internal` on assignments
- `src/lib/cases/internal-case.ts` — stable internal case id/reference constants
- Integration: internal case absent from list/search/picker; schedule assignment surfaces `case_is_internal: true`

## Do NOT

- Redesign `CustomTaskAssignModal` (0044)
- Nullable `case_id` on tasks or assignments

## Resolution

`cases.is_internal` added with seeded hidden case `FIRM-GENERAL`. Case list, search RPC, assignable picker, admin dashboard counts, staff list active-case filter, and task board exclude internal cases. Schedule assignments on the internal case still appear with `case_is_internal: true`. Gate 1 green.

## Manual smoke

1. Cases list — no "Firm operations" / `FIRM-GENERAL` row.
2. Global search for `FIRM-GENERAL` — no internal case hit.
3. Assign task case picker — internal case not listed.
4. (After 0044) Custom slot assign creates task on internal case; schedule pill shows general-work styling.
