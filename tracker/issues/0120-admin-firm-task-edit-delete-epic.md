---
id: 120
title: Admin firm task edit/delete (epic)
labels: [wayfinder:epic, team-os, api, ui]
status: open
parent: 1
created: 2026-08-24
---

## Goal

Admins can fix mistakes on firm team tasks they created from the schedule: edit title/notes/schedule, and soft-delete.

## Tickets

| ID | Scope | Status |
|----|--------|--------|
| **0121** | `PATCH /api/tasks/:id/firm` — name + description | closed |
| **0122** | `DELETE /api/tasks/:id/firm` — soft delete | closed |
| **0123** | Schedule pill edit modal (PATCH + reassign) | closed |
| **0124** | Remove confirm, in-progress warning, toasts | open |

## Shared

- `src/lib/tasks/firm-custom-task-guards.ts` — eligibility for edit/delete/reassign UI
