# ADR-0018: full_name as display identity (reverts ADR-0017)

**Status:** Accepted  
**Date:** 2026-08-06  
**Ticket:** [0042](../../tracker/issues/0042-revert-profile-username.md)  
**Supersedes:** [ADR-0017](./0017-profile-username-display-handle.md) (deleted)

## Context

Ticket 0041 added mandatory `profiles.username` as a display handle. Firm HITL (2026-08-06) decided the extra field adds friction without enough value for a small team pilot.

## Decision

- **Remove `profiles.username`** entirely (migration 00042).
- **`full_name` is the only display name** in team overview, assign dropdowns, schedule headers, and admin dashboard.
- **Login remains email-based** (unchanged).
- Staff-facing APIs continue to expose `full_name` via `profiles_staff_view`; email stays admin-settings only (C-07).

## Consequences

- No username prompt on login; no username field on staff create/edit.
- Ticket 0041 and ADR-0017 are superseded — do not reintroduce username without a new ADR and firm sign-off.
