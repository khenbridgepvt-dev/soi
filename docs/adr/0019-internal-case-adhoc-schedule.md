# ADR-0019: Internal case for ad-hoc schedule work

**Status:** Accepted  
**Date:** 2026-08-06  
**Ticket:** [0043](../../tracker/issues/0043-internal-case-adhoc-model.md)

## Context

Generic calendar work ("clear emails", "help invoices") is usually not tied to a client matter, but `task_assignments` and `tasks` require a non-null `case_id`. Nullable case links would ripple through RLS, the task board, and case completion logic.

## Decision

- Add `cases.is_internal` (default `false`).
- Seed one hidden case: reference `FIRM-GENERAL`, client "Firm operations", `status = active`, `is_internal = true`.
- Ad-hoc schedule tasks (0044) attach to this case; optional audit link to a real case task may follow later.
- **Exclude** internal cases from case list APIs, global search, and assignable case picker.
- **Include** internal assignments on the schedule grid with `case_is_internal: true` so pills can render differently (0044).

## Consequences

- `case_id` stays NOT NULL everywhere; no schema fork for "general" work.
- Staff never pick the internal case from normal case UIs.
- Schedule and assignment APIs must surface the internal flag for display logic.
