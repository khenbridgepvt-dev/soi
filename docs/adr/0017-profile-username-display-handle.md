# ADR-0017: Profile username is a display handle, not login

**Status:** Accepted  
**Date:** 2026-08-05  
**Ticket:** [0041](../../tracker/issues/0041-mandatory-profile-username.md)

## Context

Staff need a short, team-visible identifier for assignment UIs, team overview, and schedule headers. Email addresses are sensitive (C-07) and must not appear in staff-facing lists. Login already uses email via Supabase Auth.

## Decision

- Add mandatory `profiles.username` — unique case-insensitively, 3–30 chars, charset `[a-z0-9._-]`.
- **Username is display-only.** Authentication remains email + password; no username login without a separate ADR and auth work.
- All users must have a username. Migration backfills existing profiles from email local-part with numeric disambiguation.
- Staff-facing APIs and `profiles_staff_view` expose `username` + `full_name`; email is admin-settings only.
- Staff may update their own username via `PATCH /api/profile` (column trigger allows `username` and `online_status` self-service).

## Consequences

- Team, assign, and schedule UIs show `full_name` with `@username` subtitle where helpful.
- `UsernamePromptGate` blocks the shell if username is missing (edge cases post-migration).
- Staff create/edit (EP-18/20) require username with server-side uniqueness checks.
