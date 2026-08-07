---
id: 51
title: Paginated completed task history (firm + client)
labels: [wayfinder:task, post-mvp, staff-dashboard]
status: closed
closed: 2026-08-07
parent: 1
blocked-by: [48]
mode: AFK
created: 2026-08-07
---

## HITL — Firm intent

History shows completed firm + client tasks; lazy load 10 per page via `GET /api/dashboard/staff/history`.

## Scope

- History endpoint with cursor pagination
- Remove history from initial dashboard payload
- Staff dashboard collapsible History + Load more

## Resolution

Paginated history for all completed assigned tasks. Gate 1 green.
