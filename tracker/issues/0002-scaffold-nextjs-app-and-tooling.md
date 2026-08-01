---
id: 2
title: Scaffold the Next.js app and tooling
labels: [wayfinder:task, sprint-1-2]
status: closed
assignee: blessanai
parent: 1
blocked-by: []
mode: AFK
created: 2026-08-01
closed: 2026-08-01
---

## Question

Greenfield scaffold ([ADR-0012](../../docs/adr/0012-greenfield-rebuild-of-application-code.md)): archive the old app to a `legacy-app` branch, wipe the repo root except `docs/` and git history, and stand up the Next.js (App Router) + TypeScript + Tailwind skeleton every later ticket lands in.

**Scope**

- Wipe per [IMPLEMENTATION_PLAN.md §B.1](../../docs/IMPLEMENTATION_PLAN.md); tree per plan §B.2 (deployment_guide §10 minus `.github/workflows/`, minus leave routes, Playwright deferred).
- `.env.example` and npm scripts per [deployment_guide.md](../../docs/deployment_guide.md) §3.3–3.4; `dev`, `build`, `lint`, `typecheck`, `test` must all exist — they are Gate 1 (plan §A.3).
- Tailwind config with the design tokens from [design_system.md §12](../../docs/design_system.md), font stack §5 — tokens only, no screens.
- Security headers in `next.config.js` (M10 row, [scope_matrix.md §3](../../docs/scope_matrix.md)).
- Health check endpoint per deployment_guide §7.4.
- Vitest configured with one trivial passing unit test under `tests/unit/`.

**Spec pointers** — plan §B · deployment_guide §3, §7.4, §10 · design_system §5, §12

**Done when** `npm run dev` serves a placeholder page with security headers present, `npm run lint && npm run typecheck && npm test` all pass, and the tree matches plan §B.2.

**Test seam** — none beyond the Gate 1 harness itself; keep the trivial test as the suite's smoke check.

**Do NOT**

- Do not open, copy, or "reference" anything from `legacy-app` (ADR-0012).
- No CI files, no `.github/` folder (ADR-0013).
- No UI beyond one placeholder page — login is ticket 0006, shell is 0007.
- No extra libraries beyond Next/React/Tailwind/Supabase clients/Vitest (component libs, state managers, ORMs are all out).

## Resolution

Greenfield scaffold at repo root (no legacy wipe needed — repo was already docs-only). Manual scaffold (create-next-app refused non-empty directory).

**Delivered:** Next.js 15 App Router + TypeScript + Tailwind 3 + Vitest; `src/` tree per plan §B.2 (no leave routes, no `.github/`, no Playwright); Supabase client stubs (`client.ts`, `server.ts`, `middleware.ts`); empty `supabase/migrations/` + `config.toml` + placeholder `seed.sql`; security headers in `next.config.js` (deployment_guide §4.2); Tailwind tokens from design_system §12 + IBM Plex Sans via `next/font` (§5); `.env.example` per §3.3; placeholder home page; `GET /api/health` per §7.4.

**Gate 1:** `npm run lint`, `npm run typecheck`, `npm test`, `npm run dev` all green. `npm run build` also passes. Security headers verified (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`). Health returns JSON with `status`, `timestamp`, `version`, `database`, `environment` — reports `degraded` / `database: disconnected` until Supabase local is running (expected pre-ticket 0003).

**Note:** `type-check` script aliases `typecheck` for deployment_guide §3.4 compatibility. Health DB probe uses REST `/rest/v1/` reachability rather than `SELECT 1` RPC (no schema yet).
