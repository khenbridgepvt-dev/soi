---
id: 9
title: Free-tier cloud setup and first manual deploy
labels: [wayfinder:task, sprint-1-2]
status: closed
assignee: blessanai
parent: 1
blocked-by: [7]
mode: HITL
created: 2026-08-01
closed: 2026-08-01
---

## Question

Put the foundation on the internet: one free Supabase project + one free Vercel project ([ADR-0014](../../docs/adr/0014-single-cloud-project-for-pilot.md)), env vars placed, migrations pushed, first manual deploy serving the role-routed login flow — the Sprint 2 demo ([ADR-0005](../../docs/adr/0005-delivery-assumptions.md)).

**Scope** (HITL — account creation and secrets need the human; the agent prepares the exact checklist and runs what it can)

- Create the Supabase project; `supabase link`; `supabase db push` per [deployment_guide.md §4.4](../../docs/deployment_guide.md).
- Import the repo into Vercel (Hobby); set the five env vars per deployment_guide §5 registry, `SUPABASE_SERVICE_ROLE_KEY` marked Sensitive.
- Deploy via `git push` to `main` (Vercel auto-build) per plan §D.2.
- Create cloud demo accounts (admin + staff) via the Supabase dashboard (staff-creation UI arrives in ticket 0019).
- Smoke: health endpoint responds; both roles complete login → role-routed dashboard on the cloud URL.

**Spec pointers** — plan §D · deployment_guide §2, §4.4, §5 · ADR-0014

**Done when** the smoke passes on the cloud URL. The Resolution records the project URLs, dashboard locations, and where each secret lives — later tickets depend on those facts.

**Test seam** — none; this is provisioning. The smoke checklist is the verification.

**Do NOT**

- No GitHub Actions, no branch protection (ADR-0013).
- No second Supabase project, no custom domain (upgrade path only, deployment_guide §1.3).
- Never run `supabase db reset` against the cloud project.

## Resolution

Free-tier pilot infrastructure live per [ADR-0014](../../docs/adr/0014-single-cloud-project-for-pilot.md) and deployment_guide §2/§4.4/§5.

| Item | Value |
|------|--------|
| **Vercel URL** | https://soicrm.vercel.app |
| **Supabase project ref** | `yuwfifidcxvybmwwvqao` |
| **Supabase API URL** | https://yuwfifidcxvybmwwvqao.supabase.co |
| **Custom Access Token hook** | Enabled — `public.custom_access_token_hook` (ADR-0015 `user_role` claim) |

**Provisioning:** Supabase project created and linked; migrations pushed via `supabase db push` (no cloud `db reset`). Vercel Hobby project connected to GitHub; five env vars set (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_APP_NAME`); service role marked Sensitive. Deploy via `git push` to `main`.

**Smoke tests (passed on cloud URL):**
- `/api/health` responds
- Admin login → `/dashboard`
- Staff login → `/staff/dashboard`
- Role routing and session behave as on local stack

Cloud demo accounts created via Supabase dashboard (staff-creation UI deferred to ticket 0019).
