---
id: 13
title: Accept-lead atomic transaction
labels: [wayfinder:task, sprint-3-4]
status: open
assignee:
parent: 1
blocked-by: [12]
mode: AFK
created: 2026-08-01
---

## Question

The riskiest single operation in the system (risk R1): accepting a lead atomically generates the case reference and the 13 fixed tasks. **Spike-grade — use a strong model (plan §E, §F).**

**Scope**

- One Postgres function (called via RPC from EP-05) doing ALL of: `generate_case_reference` per [database_schema.md §9.1](../../docs/database_schema.md) (MMYY + zero-padded global monthly sequence via concurrent-safe UPSERT on `reference_counters` + type code + first-3-chars name, pad short names with X — [ADR-0009](../../docs/adr/0009-global-reference-counter-with-edit-sync.md)); status flip `lead_pending → active`; batch insert of the 13 tasks per [SRS_v4_MVP.md §3.2](../../docs/SRS_v4_MVP.md) ([ADR-0002](../../docs/adr/0002-fixed-13-task-lifecycle-for-mvp.md)). Partial failure rolls back everything.
- EP-05 per [api_specification.md](../../docs/api_specification.md); accept leg of S-08.
- Ship function in the `00014` migration file family per §11.1.

**Spec pointers** — database_schema §9.1, T5, T9 · api_spec EP-05 · SRS §3.2 · ADR-0002/0009 · plan §E

**Done when** US-2.3, US-2.4 (accept legs), US-3.1 pass — TC-017–023 and TC-032/033 — **including the TC-023 rollback test** (forced mid-transaction failure leaves no reference, no tasks, status unchanged) and a concurrency test (two simultaneous accepts get distinct sequences).

**Test seam** — `reference.ts` mirror of the format logic for display/validation (unit: padding, short names, month rollover); RPC integration tests (rollback, concurrency) — write these FIRST.

**Do NOT**

- No sequential supabase-js inserts pretending to be a transaction (plan §A.2.3).
- No reference editing (ticket 0014 owns `sync_reference_counter_on_edit`).
- No custom tasks (ticket 0016), no task UI (0016/0017).
