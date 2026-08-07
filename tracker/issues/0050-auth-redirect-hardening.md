---
id: 50
title: Auth redirect hardening (unauthenticated → login)
labels: [wayfinder:task, post-mvp, auth]
status: closed
closed: 2026-08-07
parent: 1
mode: AFK
created: 2026-08-07
---

## HITL — Firm intent

Any protected page without valid session → redirect to `/login?next=...`. Role-based routing unchanged.

## Scope

- Middleware `next` param on login redirect
- Staff/admin layout + dashboard page guards
- Login form honors safe `next` return path
- API 401 (not 500) when unauthenticated

## Do NOT

- Change RLS or role matrix

## Resolution

Defense-in-depth redirects; login return path; Gate 1 green.

## Manual smoke

1. `/staff/dashboard` logged out → `/login?next=...`
2. Staff login → returns to dashboard
3. Admin cannot stay on `/staff/*`
