---
id: 36
title: Skilled Worker Dependant application type (SKD)
labels: [wayfinder:task, post-mvp, data]
status: closed
closed: 2026-08-05
parent: 1
blocked-by: []
mode: AFK
created: 2026-08-05
---

## Question

Firm workflow treats **Skilled Worker Dependant** as a separate application type from **Skilled Worker Visa (SKW)**. System must seed and display SKD everywhere application types appear.

## HITL note

**Firm decision (2026-08-05):** SKD is a distinct type with code `SKD`, not a dependants-only variant of SKW. Same 13-task lifecycle on accept (ADR-0002) — no per-type task checklist changes.

## Scope

- Migration `00040_add_skd_application_type.sql` + sync `00017_seed_application_types.sql`
- `docs/database_schema.md` T2 seed table
- `docs/user_stories.md`, `docs/SRS_v4_MVP.md`, `docs/test_plan.md` alignment
- Display audit (dynamic queries — no hardcoded type lists expected)
- Integration + unit tests for SKD reference generation

## Spec pointers

- `docs/database_schema.md` T2
- `docs/api_specification.md` EP-35–37
- ADR-0002 (fixed 13 tasks)

## Done when

- `supabase db reset` includes SKD
- Accept case with SKD → reference `MMYYNO/SKD/ABC`
- SKD in settings, intake, case list, detail, board filters
- Gate 1 green

## Test seam

- `tests/integration/skd-application-type.test.ts`
- `tests/unit/reference.test.ts` SKD preview

## Do NOT

- Change 13-task lifecycle per type (ADR-0002)
- Dependent-specific DB columns
- Intake fork / slot menu changes

## Resolution

Migration `00040_add_skd_application_type.sql` seeds **Skilled Worker Dependant** (`SKD`, `sort_order` 8). `00017_seed_application_types.sql` updated for fresh `db reset`.

**Firm decision:** SKD is separate from SKW — same 13-task accept lifecycle (ADR-0002). No UI code changes required; all surfaces load types dynamically via `application_types` query.

Updated `database_schema.md` T2, `user_stories.md` US-2.2, `SRS_v4_MVP.md`, `test_plan.md` SKD reference note.

Tests: `tests/integration/skd-application-type.test.ts`, `tests/unit/reference.test.ts` SKD preview.

### Manual smoke

1. Settings → Application Types → SKD listed.
2. + New case → intake → SKD in application type dropdown.
3. Create & open case with SKD → reference contains `/SKD/`, 13 tasks on case detail.
