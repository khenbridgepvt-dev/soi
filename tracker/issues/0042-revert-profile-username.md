---
id: 42
title: Revert profile username (supersedes 0041)
labels: [wayfinder:task, post-mvp, ux]
status: closed
closed: 2026-08-06
parent: 1
blocked-by: []
mode: AFK
created: 2026-08-06
supersedes: 41
---

## HITL — Firm decision (2026-08-06)

- Delete username feature entirely.
- `full_name` is the only display name everywhere.
- Login remains email.

## Scope

- Migration `00042_drop_profile_username.sql` — drop column, constraints, index; restore `profiles_staff_view` and signup trigger
- Remove `username.ts`, `check-username-available.ts`, `UsernamePromptGate`, `/api/profile`, username unit tests
- Staff APIs EP-18–20: remove username fields/validation
- UI: team, schedule, assign, settings — `full_name` only
- ADR-0018; mark 0041 superseded

## Do NOT

- Reintroduce username without new ADR
- Start ad-hoc custom task work (0043+)

## Resolution

`profiles.username` dropped. All display surfaces use `full_name` only. Staff create/edit no longer requires username. ADR-0017 removed; ADR-0018 records full_name as display identity. Integration suite green after `db reset`.

## Manual smoke

1. Settings → Add staff — no username field; create succeeds.
2. Team overview and assign dropdown show full name only.
3. No username prompt on login.
