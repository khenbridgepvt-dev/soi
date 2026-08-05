---
id: 40
title: Deleted case tombstone and calendar deleted pills
labels: [wayfinder:task, post-mvp, ux]
status: closed
closed: 2026-08-05
parent: 1
blocked-by: []
mode: AFK
created: 2026-08-05
---

## HITL — Firm decisions (2026-08-05)

- Soft-delete case: calendar slot **stays booked**; pill shows **deleted** state.
- **Do NOT** change `soft_delete_case` RPC to release assignments automatically.
- Tombstone UI: show **deleted by full_name only** (no email).
- No sensitive DB/auth exposure in frontend.

## Scope

- `GET /api/cases/:id/tombstone` (admin only)
- `fetch-schedule.ts` — `case_deleted` / `task_deleted` on assignments
- Schedule pills — DELETED label; admin navigates to tombstone; staff no navigation
- `CaseDeletedTombstone` empty state on S-06
- `invalidate('deleteCase')` includes schedule

## Do NOT

- Auto-release assignments in `soft_delete_case`
- Show email on tombstone
- Username work (0041)

## Resolution

Admin tombstone endpoint returns `deleted_at`, `deleted_by_name`, reference, and client name only. Schedule assignments expose deleted flags; pills show `DELETED` via shared `assignment-status` helper. Case detail shows tombstone empty state for admin; staff get generic not-found. `deleteCase` invalidates schedule cache.

## Manual smoke

1. Delete case with booked slot → S-04 pill shows DELETED without F5.
2. Admin opens deleted case URL → tombstone with deleted by name, links to Cases + Archive.
3. Staff cannot load tombstone API.
