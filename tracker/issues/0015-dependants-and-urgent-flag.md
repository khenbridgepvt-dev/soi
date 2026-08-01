---
id: 15
title: Dependants and the urgent flag
labels: [wayfinder:task, sprint-3-4]
status: open
assignee:
parent: 1
blocked-by: [14]
mode: AFK
created: 2026-08-01
---

## Question

Complete the case record: dependant management on the detail page, and the urgent flag with its cascade.

**Scope**

- Dependants CRUD: EP-09 add, EP-10 update, EP-11 soft-delete per [api_specification.md](../../docs/api_specification.md); minimal fields per data-minimisation ([SRS_v4_MVP.md §1.3](../../docs/SRS_v4_MVP.md)); S-06 dependants section.
- Urgent flag: EP-07 toggle (admin) per api_spec; effect per [ADR-0008](../../docs/adr/0008-urgent-flag-active-tasks-only.md) — case-level flag, styling later applies to active tasks only.
- Notification **rows** on urgent-flag set (one per assigned staff, via the server-side service-role util `src/lib/notifications.ts` created here in minimal form) — drawer/delivery UI is ticket 0027.

**Spec pointers** — api_spec EP-07–11 · ADR-0008 · ui_wireframe S-06 · database_schema T4

**Done when** US-2.5 (TC-024–026) and US-2.7 (TC-029–031) pass; toggling urgent writes notification rows for assigned staff; unflagging reverts.

**Test seam** — notification-fanout function (unit: who gets a row); dependant soft-delete integration test.

**Do NOT**

- No notification UI, realtime, or read-state (ticket 0027) — rows only.
- No board styling work (ticket 0024 consumes the flag).
- Client-side use of the service-role key is forbidden (plan §A.2.2).
