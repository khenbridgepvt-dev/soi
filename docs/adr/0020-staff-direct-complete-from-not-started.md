# ADR-0020: Staff may complete assigned tasks from not_started

**Status:** Accepted  
**Date:** 2026-08-07  
**Ticket:** [0049](../../tracker/issues/0049-priority-list-status-actions.md)  
**Supersedes (in part):** EP-12 transition table for staff dashboard direct-complete

## Context

ADR-0002 defines the MVP lifecycle as `not_started → in_progress → completed`. Ticket 0047 allowed direct complete for firm (internal-case) tasks only. Staff requested completing client lifecycle tasks from the priority list without an extra “in progress” step when work is already done, while keeping Task 8/9/10 prerequisite gates.

## Decision

- Staff may PATCH `not_started → completed` for **any assigned task** (lifecycle 1–13, custom, firm) when prerequisites pass.
- Default workflow remains `not_started → in_progress → completed`; the dashboard exposes **Complete**, **In progress**, and **Open case** actions (0049).
- `check_task_prerequisites` is unchanged — illegal completions still return `PREREQUISITE_NOT_MET`.
- Internal case still never transitions to `completed` at case level (`check_case_completion`).

## Consequences

- `update_task_status` RPC and EP-12 share the same completed branch for `not_started` and `in_progress`.
- Admin-only custom task creation and case acceptance rules are unchanged.
- Case auto-completion on final task complete is unchanged (existing RPC behaviour).
