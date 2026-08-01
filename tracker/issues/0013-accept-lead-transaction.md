---
id: 13
title: Accept-lead atomic transaction
labels: [wayfinder:task, sprint-3-4]
status: closed
assignee: blessanai
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

## Resolution

- **Migration `00021_accept_lead_function.sql`** — `public.accept_lead(p_case_id uuid)`, one `SECURITY DEFINER` plpgsql function returning jsonb. Inside a single transaction: admin authorisation check, `SELECT … FOR UPDATE` on the case, `reference_counters` UPSERT (`ON CONFLICT … last_sequence + 1`), reference composition per §9.1, status flip to `active` + `accepted_at`, and the 13 default task inserts from one `VALUES` list. No exception handler swallows errors, so any failure aborts the whole statement. Shipped as a new file rather than editing the applied `00014` family — migrations are immutable once pushed to the cloud project (ADR-0014).
- **`SECURITY DEFINER` rationale** — `tasks` is still deny-by-default (its policies land with the checklist in 0016), so the function runs as owner and re-implements the check RLS would do: `jwt_role() = 'admin'` and `is_active_user()`. `EXECUTE` granted to `authenticated` only.
- **EP-05 `POST /api/cases/[id]/accept`** — one `supabase.rpc('accept_lead')` call and nothing else; error mapping lives in the `src/lib/cases/accept-errors.ts` seam (404 / 400 / 403 / `REFERENCE_GENERATION_FAILED` / `INTERNAL_ERROR`).
- **Seams** — `src/lib/utils/reference.ts` (MMYY, sequence padding, name segment, compose, parse/validate, S-08 preview) and `src/lib/cases/default-tasks.ts` (the 13 tasks, mirrored by the RPC).
- **S-08 accept leg** — stub removed. The modal previews the reference as `0726NN/SKW/MAR`, disables both buttons while submitting, and on success lands on the case detail screen, which shows "Case {reference} created with 13 tasks."
- **Tests (written first)** — `accept-lead-rpc.test.ts`: TC-023 rollback (a pre-existing task at sequence 1 forces the batch insert to violate `tasks_case_id_sequence_active` mid-transaction; afterwards the status is still `lead_pending`, the reference and `accepted_at` are null, no extra tasks exist, and `reference_counters` is unmoved), TC-018 concurrency, TC-017/020/032 happy path, TC-019 short name, TC-021/033 double accept, missing case, non-admin denial, and SQL↔TypeScript name-segment parity including non-ASCII names. Unit: `reference.test.ts` (padding, short names, month and year rollover, UTC, parse) and `accept-errors.test.ts`.
- **Gate 1 green** — lint, typecheck, `npm run build`, 160 tests, `supabase db reset` from scratch.
- Also took the optional 0012 review item: `cases_insert_admin` now carries `WITH CHECK status = 'lead_pending' AND reference IS NULL AND is_deleted = false`, so every other status transition has to go through an API route.

### Spec conflict resolved (plan §A.2 rule 7)

api_spec EP-05 step 2 asks for an idempotent `200 OK` when the case is already `active`, but TC-021 and TC-033 — both named in this ticket's **Done when** — require `400 INVALID_STATE_TRANSITION`. The tests win: a second accept returns 400. The double-submit risk EP-05 was guarding against is covered structurally instead — the `FOR UPDATE` row lock serialises concurrent accepts of the same case and the modal disables its buttons while submitting, so no case can ever gain duplicate tasks or burn a second sequence number. Worth revisiting if the firm sees the error in practice.
