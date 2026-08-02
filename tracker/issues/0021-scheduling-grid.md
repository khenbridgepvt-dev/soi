---
id: 21
title: Scheduling grid
labels: [wayfinder:task, sprint-5-6]
status: closed
assignee: composer
parent: 1
blocked-by: [13, 20]
mode: AFK
created: 2026-08-01
---

## Question

The densest screen in the app (risk R3): the admin day-view scheduling grid computing availability from timetables minus assignments, rendered in the TLS slot pattern. **Spike-grade — use a strong model (plan §E, §F).**

**Scope**

- `task_assignments` RLS per [database_schema.md §10.2](../../docs/database_schema.md) (admin all, staff read own).
- EP-24 schedule grid per [api_specification.md](../../docs/api_specification.md): **server-side** computation `available = timetable − assignments` in 30-minute slices; EP-25 single-staff variant (staff self allowed — feeds S-11 later).
- Pure availability engine in `src/lib/utils/availability.ts`.
- S-04 per [ui_wireframe_spec.md](../../docs/ui_wireframe_spec.md) and [design_system.md §3.1/3.2](../../docs/design_system.md): slot-state table exactly (available/booked/selected/conflict/off-hours), 56px sticky time gutter, sticky staff headers, legend, date chevrons, 36px slot rows (DS-1). Fidelity reference: [`ui/inspiration/2 tls time slots.jpeg`](../../docs/ui/inspiration/README.md).
- Click booked block → case detail. Click available slot → stub until ticket 0022 wires the modal.

**Spec pointers** — design_system §3.1/3.2, §10 (S-04) · api_spec EP-24/25 · ui_wireframe S-04 · plan §E

**Done when** US-5.4/5.5/5.6 pass (TC-060–063); grid renders all active staff for a chosen day in < 3s; off-hours vs available vs booked visually match the §3.1 state table.

**Test seam** — `availability.ts` (unit: overlaps, adjacency, day edges, empty timetables) — write these FIRST; EP-24 integration test against seeded assignments.

**Do NOT**

- No assignment creation (ticket 0022).
- No week/month views, no leave overlay (Phase 2).
- No client-side availability math — server computes (R3 mitigation).
- No slot pills anywhere but S-04/S-09 (design_system §9 rule 1).

## Resolution

- Migration `00033_task_assignments_rls.sql` — admin ALL; staff/senior SELECT own; `is_active_user()` §10.4 guard. No staff write path (0022 adds insert).
- Pure seam `src/lib/utils/availability.ts` — `computeAvailableSlots` (timetable − assignments), `computeSlotStates` (available/booked/off_hours + span), `computeGridRange` / `buildSlotTimeline` (30-min DS-1). Client never recomputes.
- EP-24 `GET /api/schedule?date=` (admin); EP-25 `GET /api/schedule/:staffId` (admin or self) via `fetchSchedule`.
- S-04 `/schedule`: TLS `SlotBlock` states, 56px sticky gutter (`tabular-nums`), sticky staff headers, legend, date chevrons + picker, 36px rows; booked → case detail; available click → selection stub for 0022; per-staff booked/working chips (TC-063 strip).
- Seed: `task_assignments` rows for today for manual TC-060 walk.
- Tests: `availability.test.ts` (51), `schedule-dates.test.ts`, `schedule-grid.test.ts` (EP-24/25 + RLS + no_overlap).
- Gate 1 green after `supabase db reset`: lint, typecheck, 370 tests.
- Manual walk: TC-060 day view; TC-061 available-slot stub; TC-062 via EP-25 self; TC-063 workload chips on grid (dashboard widget remains 0024).
