---
id: 55
title: case_document_preparations table and RLS
labels: [wayfinder:task, post-mvp, documents]
status: closed
closed: 2026-08-08
parent: 1
blocked-by: [54]
created: 2026-08-08
---

## HITL — Firm intent

Store wizard answers and merged text per case for document preparation (ADR-0021). Access follows case assignment — not firm-wide staff.

## Scope

- Migration `00048_case_document_preparations.sql` — table, UNIQUE(case_id, kind), `updated_at` trigger, RLS
- Admin SELECT (active + archived cases); admin INSERT/UPDATE on writable non-deleted cases
- Staff/senior SELECT/INSERT/UPDATE on `staff_assigned_active_case_ids()` only
- Regenerate `src/types/database.ts`
- `docs/database_schema.md` T16 addendum
- Integration tests `case-document-preparations-rls.test.ts`

## Do NOT

- Merge lib, DOCX/PDF, API routes (0056–0059)
- Wizard UI (0060)
- Storage bucket (0061)
- DELETE policy (UPSERT in 0059)

## Done when

- `supabase db reset` applies 00048
- Gate 1 green
- RLS integration tests pass

## Test seam

- `tests/integration/case-document-preparations-rls.test.ts`

## Resolution

Migration 00048 creates `case_document_preparations` with ADR-0021 columns, UNIQUE(case_id, kind), and RLS mirroring dependants/case access. Types regenerated. Integration harness covers admin, assigned staff, unassigned staff, and unique constraint. Gate 1 green.

## Manual smoke

1. (After 0060) Case detail → save wizard answers → row visible to admin and assigned staff only.
