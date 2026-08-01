---
id: 20
title: Staff timetables
labels: [wayfinder:task, sprint-5-6]
status: open
assignee:
parent: 1
blocked-by: [19]
mode: AFK
created: 2026-08-01
---

## Question

Working hours become data: the 7-day timetable editor and its access rules — the input side of all scheduling.

**Scope**

- `staff_timetables` RLS: admin write, self read ([ADR-0010](../../docs/adr/0010-staff-schedules-admin-only.md) — staff never see others' schedules) with the §10.4 guard.
- EP-22 update (PUT, per-day start/end pairs, null = non-working day), EP-23 get, per [api_specification.md](../../docs/api_specification.md).
- Timetable section on S-16 per [ui_wireframe_spec.md](../../docs/ui_wireframe_spec.md): 7-day time-pair editor, 30-minute steps ([design_system.md](../../docs/design_system.md) DS-1).
- Absence workaround per [ADR-0001](../../docs/adr/0001-leave-management-deferred-to-phase-2.md): admins mark days off by editing the timetable — make zeroing a day out effortless.

**Spec pointers** — api_spec EP-22/23 · ADR-0010/0001 · database_schema T7

**Done when** US-5.1 passes (TC-051/052); invalid pairs (end ≤ start, misaligned to 30 min) rejected; staff read own timetable only (harness-verified).

**Test seam** — timetable validation in `src/lib/utils/dates.ts` (unit: pair validity, 30-min alignment).

**Do NOT**

- No availability computation or grid (ticket 0021).
- No overtime detection ([scope_matrix.md](../../docs/scope_matrix.md) M12 — Phase 2).
- No leave tables touched.
