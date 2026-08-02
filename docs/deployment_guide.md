# Deployment & DevOps Guide

**Project:** Team Scheduling & Task Management System  
**Version:** 1.0  
**Date:** 4 July 2026  
**Stack:** Next.js (App Router) · Supabase (PostgreSQL + Auth + Realtime) · Vercel  
**Sources:**
- [system_design.md](./system_design.md)
- [database_schema.md](./database_schema.md)
- [api_specification.md](./api_specification.md)
- [test_plan.md](./test_plan.md)

---

## 1. Deployment Overview

### 1.1 Architecture Summary

```
┌──────────────────────────────────────────────────────────────────┐
│                         DEVELOPER                                │
│  Local machine: next dev + Supabase CLI (Docker)                │
└──────────────┬───────────────────────────────────────────────────┘
               │ git push
┌──────────────▼───────────────────────────────────────────────────┐
│                       GITHUB                                     │
│  Repository: lawcrm                                              │
│  Branches: main (production), develop (staging), feature/*       │
└──────────────┬──────────────────────────┬────────────────────────┘
               │ auto-deploy              │ auto-deploy
┌──────────────▼──────────┐  ┌────────────▼───────────────────────┐
│       VERCEL             │  │         SUPABASE                   │
│                          │  │                                     │
│  Preview (per PR)        │  │  Dev project (linked to develop)   │
│  Production (main)       │  │  Prod project (linked to main)    │
│                          │  │                                     │
│  Serverless functions    │  │  PostgreSQL + Auth + Realtime      │
│  Edge network (CDN)      │  │  Edge Functions (cron jobs)        │
│  Next.js SSR             │  │  Row-Level Security                │
└──────────────────────────┘  └───────────────────────────────────┘
```

### 1.2 Hosting Decisions

| Component | Service | Tier | Cost |
|-----------|---------|------|------|
| Frontend + API routes | Vercel | Free (Hobby) | £0/month |
| Database | Supabase | Free | £0/month |
| Auth | Supabase Auth | Free (50k MAU) | £0/month |
| Realtime | Supabase Realtime | Free (200 connections) | £0/month |
| Edge Functions (crons) | Supabase Edge Functions | Free (500k/month) | £0/month |
| Source control | GitHub | Free (private repos) | £0/month |
| CI/CD | GitHub Actions | Free (2000 min/month) | £0/month |
| Domain (optional) | External registrar | — | ~£10/year |

**Total MVP cost: £0/month** (optional domain excluded)

### 1.3 Upgrade Path

| Trigger | Action | New Cost |
|---------|--------|----------|
| Database > 500 MB | Supabase Pro | $25/month |
| > 100 GB bandwidth/month | Vercel Pro | $20/month |
| > 200 Realtime connections | Supabase Pro | $25/month |
| Custom domain + SSL | Purchase domain | ~£10/year |
| Need for staging environment | Second Supabase project | $25/month |

---

## 2. Environment List

| Environment | Branch | Vercel URL | Supabase Project | Purpose |
|------------|--------|------------|-----------------|---------|
| **Local** | any | `http://localhost:3000` | Supabase local (Docker) | Development and unit testing |
| **Preview** | PR branches | `https://lawcrm-git-{branch}-{team}.vercel.app` | Dev Supabase project | PR review and testing |
| **Staging** | `develop` | `https://lawcrm-staging.vercel.app` | Dev Supabase project | Integration testing, UAT |
| **Production** | `main` | `https://lawcrm.vercel.app` or custom domain | Production Supabase project | Live system |

### 2.1 Environment Parity

All environments run the same Next.js build, same Node.js version, and same PostgreSQL version. The only differences are:
- Environment variable values (Supabase URLs, keys)
- Data content (test data vs production data)
- Supabase project configuration

---

## 3. Local Development Setup

### 3.1 Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 20 LTS | Runtime |
| npm | 10+ | Package management |
| Docker Desktop | Latest | Supabase local database |
| Supabase CLI | Latest | Database migrations, local dev |
| Git | Latest | Version control |

### 3.2 First-Time Setup

```bash
# 1. Clone the repository
git clone https://github.com/{org}/lawcrm.git
cd lawcrm

# 2. Install dependencies
npm install

# 3. Install Supabase CLI (if not already installed)
npm install -g supabase

# 4. Start Supabase local services (requires Docker running)
supabase start

# Output will display:
#   API URL:   http://localhost:54321
#   DB URL:    postgresql://postgres:postgres@localhost:54322/postgres
#   Studio:    http://localhost:54323
#   Anon Key:  eyJ... (copy this)
#   Service Key: eyJ... (copy this)

# 5. Create local .env.local file
cp .env.example .env.local
# Edit .env.local with the values from step 4

# 6. Apply database migrations
supabase db reset
# This runs all migrations in /supabase/migrations/ and seeds data

# 7. Start the development server
npm run dev
# App available at http://localhost:3000
```

### 3.3 `.env.example` File

```env
# Supabase (public - safe for client-side)
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Supabase (server-side only - NEVER expose to client)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME="Task Manager (Dev)"

# Optional: Node environment
NODE_ENV=development
```

### 3.4 Local Development Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start Next.js dev server with hot reload |
| `npm run build` | Production build (for local testing) |
| `npm run lint` | Run ESLint |
| `npm run type-check` | Run TypeScript type checking (`tsc --noEmit`) |
| `npm test` | Run unit tests (Vitest) |
| `npm run test:integration` | Run integration tests against Supabase local |
| `npm run test:e2e` | Run Playwright E2E tests |
| `supabase start` | Start local Supabase (Docker) |
| `supabase stop` | Stop local Supabase |
| `supabase db reset` | Drop and recreate DB from migrations + seed |
| `supabase db diff` | Generate migration from manual DB changes |
| `supabase migration new <name>` | Create a new empty migration file |
| `supabase db push` | Apply pending migrations to remote project |

### 3.5 Supabase Studio (Local)

Available at `http://localhost:54323` when `supabase start` is running. Provides:
- Table editor (browse/edit data)
- SQL editor (run ad-hoc queries)
- Auth user management (create test users)
- RLS policy viewer

### 3.6 Seed Data

The seed file (`/supabase/seed.sql`) creates:

| Entity | Count | Purpose |
|--------|-------|---------|
| Admin user | 1 | `admin@firm.com` / `AdminPass123!` |
| Staff users | 3 | `asha@firm.com`, `bless@firm.com`, `jaya@firm.com` (passwords: `StaffPass123!`) |
| Senior user | 1 | `senior@firm.com` (password: `SeniorPass123!`) |
| Application types | 7 | SKW, GRD, SPV, ILR, NAT, FWV, FLR |
| Cases (active) | 5 | Various types, various progress states |
| Cases (lead) | 2 | Pending review |
| Tasks | 65 | 13 per active case (various statuses) |
| Task assignments | 15 | Spread across staff and dates |
| Leave requests | 3 | 1 approved, 1 pending, 1 rejected |
| Notifications | 10 | Mix of types and read states |

---

## 4. Build and Release Process

### 4.1 Build Steps

```bash
# The Vercel build runs these steps automatically:
npm ci                    # Install dependencies (clean install)
npm run lint              # ESLint check
npm run type-check        # TypeScript compiler check
next build                # Production Next.js build

# Build output:
# .next/           → Server-side rendered pages + API routes
# .next/static/    → Static assets (CSS, JS, images)
```

### 4.2 Build Configuration

**`next.config.js`:**

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,        // Remove X-Powered-By header
  compress: true,                // Gzip compression
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'X-XSS-Protection', value: '1; mode=block' },
      ],
    },
  ],
};

module.exports = nextConfig;
```

### 4.3 Release Flow

```
Developer                  GitHub                     Vercel              Supabase
    │                         │                         │                    │
    │  1. Create feature      │                         │                    │
    │     branch              │                         │                    │
    │ ──────────────────────▶ │                         │                    │
    │                         │                         │                    │
    │  2. Push commits        │                         │                    │
    │ ──────────────────────▶ │                         │                    │
    │                         │  3. CI runs             │                    │
    │                         │  (lint, type-check,     │                    │
    │                         │   unit, integration)    │                    │
    │                         │ ──────────────────────▶ │                    │
    │                         │                         │                    │
    │                         │  4. Preview deploy      │                    │
    │                         │ ──────────────────────▶ │                    │
    │                         │                         │                    │
    │  5. Open PR to develop  │                         │                    │
    │ ──────────────────────▶ │                         │                    │
    │                         │                         │                    │
    │  6. Code review         │                         │                    │
    │ ◀─────────────────────▶ │                         │                    │
    │                         │                         │                    │
    │  7. Merge to develop    │                         │                    │
    │ ──────────────────────▶ │                         │                    │
    │                         │  8. Staging deploy      │                    │
    │                         │ ──────────────────────▶ │                    │
    │                         │                         │                    │
    │  9. QA on staging       │                         │                    │
    │ ◀─────────────────────── │                        │                    │
    │                         │                         │                    │
    │  10. If DB migration:   │                         │                    │
    │      supabase db push   │                         │                    │
    │      (to prod project)  │                         │                    │
    │ ─────────────────────────────────────────────────────────────────────▶ │
    │                         │                         │                    │
    │  11. Merge develop      │                         │                    │
    │      → main (PR)        │                         │                    │
    │ ──────────────────────▶ │                         │                    │
    │                         │  12. Production deploy  │                    │
    │                         │ ──────────────────────▶ │                    │
    │                         │                         │                    │
    │  13. Smoke test prod    │                         │                    │
    │ ◀─────────────────────── │                        │                    │
```

### 4.4 Database Migration Deployment

Database migrations require a separate step from code deployment because Supabase schema changes are not automatically synced by Vercel.

**Migration deployment process:**

```bash
# 1. Link CLI to the target Supabase project
supabase link --project-ref <project-ref>

# 2. Review pending migrations
supabase db diff

# 3. Push migrations to remote project
supabase db push

# 4. Verify migration applied
# Open Supabase Dashboard > SQL Editor > Run a test query
```

**Critical Rule:** Always push database migrations **before** deploying code that depends on them. The sequence is:

```
1. supabase db push (schema changes)  →  2. Merge PR (code deploy)
```

Reversing this order will cause runtime errors (code references columns/tables that don't exist yet).

### 4.5 Release Checklist

```markdown
## Release Checklist — v{X.Y.Z}

### Pre-Release
- [ ] All P1 tests passing on staging
- [ ] No open S1 or S2 defects
- [ ] Database migrations reviewed and tested on staging
- [ ] Environment variables confirmed for production
- [ ] Changelog updated

### Database
- [ ] Migrations pushed to production Supabase (`supabase db push`)
- [ ] Migration verified (test query on production DB)
- [ ] Seed data not applied to production (confirm)

### Code Deploy
- [ ] PR from develop → main created
- [ ] CI pipeline passed (lint, type-check, unit, integration, E2E)
- [ ] PR approved by reviewer
- [ ] PR merged → Vercel auto-deploys to production

### Post-Release
- [ ] Smoke test: login as admin → dashboard loads
- [ ] Smoke test: login as staff → dashboard loads
- [ ] Smoke test: create lead, accept, verify tasks
- [ ] Smoke test: assign task, verify scheduling grid
- [ ] Smoke test: notifications appear
- [ ] Check Vercel function logs for errors (first 15 minutes)
- [ ] Check Supabase dashboard for failed queries
- [ ] Announce release to stakeholders
```

---

## 5. Environment Variables & Secrets

### 5.1 Variable Registry

| Variable | Location | Secret? | Environments |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel env vars | No | All |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel env vars | No | All |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel env vars | **Yes** | All |
| `NEXT_PUBLIC_APP_URL` | Vercel env vars | No | All |
| `NEXT_PUBLIC_APP_NAME` | Vercel env vars | No | All |

### 5.2 Per-Environment Values

| Variable | Local | Preview / Staging | Production |
|----------|-------|-------------------|------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `http://localhost:54321` | `https://{dev-ref}.supabase.co` | `https://{prod-ref}.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Local anon key | Dev project anon key | Prod project anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Local service key | Dev project service key | Prod project service key |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | Vercel preview URL | `https://lawcrm.vercel.app` |
| `NEXT_PUBLIC_APP_NAME` | "Task Manager (Dev)" | "Task Manager (Staging)" | "Task Manager" |

### 5.3 Secret Management Rules

| Rule | Detail |
|------|--------|
| Never commit secrets | `.env.local` is in `.gitignore`. Only `.env.example` (with placeholder values) is committed. |
| `SUPABASE_SERVICE_ROLE_KEY` is the most critical secret | It bypasses RLS. Exposure = full database access. |
| Prefix convention | `NEXT_PUBLIC_` = exposed to browser. No prefix = server-only. |
| Rotation | Rotate keys if any team member leaves or if a key is suspected compromised. Done via Supabase dashboard > Settings > API. |
| Vercel scoping | Set environment variables scoped to specific environments (Production, Preview, Development) in Vercel dashboard. |

### 5.4 Setting Variables in Vercel

```bash
# Via CLI (alternative to dashboard)
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add SUPABASE_SERVICE_ROLE_KEY production  # marks as secret

# Via dashboard
# Vercel > Project > Settings > Environment Variables
# Add each variable, select environment scope, mark secrets as "Sensitive"
```

---

## 6. CI/CD Pipeline

### 6.1 GitHub Actions Workflow

**File: `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

env:
  NODE_VERSION: '20'

jobs:
  lint-and-typecheck:
    name: Lint & Type Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check

  unit-tests:
    name: Unit Tests
    runs-on: ubuntu-latest
    needs: lint-and-typecheck
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      - run: npm ci
      - run: npm test -- --coverage
      - uses: actions/upload-artifact@v4
        with:
          name: coverage-report
          path: coverage/

  integration-tests:
    name: Integration Tests
    runs-on: ubuntu-latest
    needs: lint-and-typecheck
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      - uses: supabase/setup-cli@v1
        with:
          version: latest
      - run: supabase start
      - run: npm ci
      - run: npm run test:integration
      - run: supabase stop

  e2e-tests:
    name: E2E Tests
    runs-on: ubuntu-latest
    needs: [unit-tests, integration-tests]
    if: github.event_name == 'push' && (github.ref == 'refs/heads/main' || github.ref == 'refs/heads/develop')
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      - uses: supabase/setup-cli@v1
        with:
          version: latest
      - run: supabase start
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run build
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
      - run: supabase stop

  build-check:
    name: Build Check
    runs-on: ubuntu-latest
    needs: lint-and-typecheck
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      - run: npm ci
      - run: npm run build
```

### 6.2 Pipeline Stages

```
┌─────────────────┐
│   Push / PR      │
└────────┬────────┘
         │
┌────────▼────────┐
│  Lint & Type    │  ← Fast feedback (< 1 min)
│  Check          │
└────────┬────────┘
         │
    ┌────┴────┬────────────┐
    │         │            │
┌───▼───┐ ┌──▼─────┐ ┌───▼────────┐
│ Unit  │ │Integr. │ │ Build      │  ← Parallel (2-4 min)
│ Tests │ │ Tests  │ │ Check      │
└───┬───┘ └──┬─────┘ └───┬────────┘
    │         │            │
    └────┬────┘            │
         │                 │
┌────────▼────────┐        │
│  E2E Tests      │ ← Only on main/develop push (5-8 min)
│ (Playwright)    │        │
└────────┬────────┘        │
         │                 │
┌────────▼────────────────▼┐
│  Vercel Auto-Deploy      │ ← Triggered by GitHub integration
│  (Preview / Staging /    │
│   Production)            │
└──────────────────────────┘
```

### 6.3 Pipeline Duration Targets

| Stage | Target | Fail Action |
|-------|--------|-------------|
| Lint + Type Check | < 1 min | Block merge |
| Unit Tests | < 2 min | Block merge |
| Integration Tests | < 4 min | Block merge |
| Build Check | < 3 min | Block merge |
| E2E Tests | < 8 min | Block merge (on main/develop) |
| **Total pipeline** | **< 10 min** | — |

### 6.4 Branch Protection Rules

| Branch | Rules |
|--------|-------|
| `main` | Require PR. Require CI pass. Require 1 approval. No force push. No direct push. |
| `develop` | Require PR. Require CI pass. No force push. |
| `feature/*` | No restrictions. Developers push freely. |

---

## 7. Monitoring & Logging

### 7.1 Available Monitoring (Free Tier)

| Source | What It Provides | Access |
|--------|-----------------|--------|
| **Vercel Dashboard** | Serverless function logs, deployment status, error rates, response times | `vercel.com` > Project > Logs |
| **Vercel Analytics** | Web Vitals (LCP, FID, CLS), page views, performance scores | `vercel.com` > Project > Analytics |
| **Supabase Dashboard** | Database query performance, active connections, storage usage, auth events | `supabase.com` > Project > Dashboard |
| **Supabase Logs** | API request logs, auth logs, edge function logs, Realtime connection logs | `supabase.com` > Project > Logs |
| **GitHub Actions** | CI/CD pipeline logs, test results, build artifacts | GitHub > Actions tab |

### 7.2 What to Monitor

| Metric | Source | Alert Threshold | Check Frequency |
|--------|--------|-----------------|-----------------|
| API error rate (5xx) | Vercel function logs | > 1% of requests | Daily review |
| API response time (p95) | Vercel function logs | > 3 seconds | Daily review |
| Database connections | Supabase dashboard | > 50 (free tier limit: 60) | Weekly |
| Database storage | Supabase dashboard | > 400 MB (free tier: 500 MB) | Monthly |
| Auth failures | Supabase auth logs | > 10 failed logins from same IP/hour | Daily review |
| Edge function errors | Supabase edge function logs | Any failure | After each cron run |
| Realtime connections | Supabase dashboard | > 150 (free tier: 200) | Weekly |
| Build failures | GitHub Actions | Any failure on main/develop | Immediate (email notification) |

### 7.3 Application-Level Logging

API routes log structured data for debugging:

```typescript
// Logging pattern used in API routes
console.log(JSON.stringify({
  level: 'info' | 'warn' | 'error',
  action: 'case_accepted',
  case_id: 'uuid',
  user_id: 'uuid',
  reference: '072604/SKW/MAR',
  tasks_created: 13,
  duration_ms: 245,
  timestamp: new Date().toISOString()
}));
```

**Logging rules:**
- Log all mutations (create, update, delete) with user ID and resource ID
- Log all errors with stack traces (server-side only, never in client response)
- Never log passwords, tokens, or full JWT payloads
- Use `console.log` (Vercel captures stdout as function logs)
- Include `duration_ms` for performance tracking

### 7.4 Health Check Endpoint

```
GET /api/health
```

**Response — `200 OK`:**

```json
{
  "status": "healthy",
  "timestamp": "2026-07-04T16:00:00.000Z",
  "version": "1.0.0",
  "database": "connected",
  "environment": "production"
}
```

**Checks performed:**
1. Supabase client can connect (simple query: `SELECT 1`)
2. Auth service is reachable
3. Returns app version from `package.json`

**Usage:** Uptime monitoring services (e.g., UptimeRobot free tier) can poll this endpoint every 5 minutes.

### 7.5 Advanced Monitoring (Phase 2)

| Tool | Purpose | Trigger |
|------|---------|---------|
| Sentry (free tier) | Error tracking with stack traces, user context, breadcrumbs | When error volume increases |
| Vercel Speed Insights | Detailed performance monitoring per route | When performance optimisation is needed |
| PgHero (self-hosted or Supabase query insights) | Slow query detection, index recommendations | When database performance degrades |

---

## 8. Rollback Strategy

### 8.1 Code Rollback (Vercel)

Vercel keeps all previous deployments. Rollback is instant.

```bash
# Option 1: Via Vercel Dashboard
# Project > Deployments > Find previous deployment > "..." > "Promote to Production"

# Option 2: Via CLI
vercel rollback
# or
vercel promote <deployment-url>
```

**Rollback time:** < 30 seconds. No rebuild required.

### 8.2 Database Rollback

Database schema changes are **not automatically reversible**. Each migration must have a corresponding rollback plan.

**Rollback approach:**

| Scenario | Action |
|----------|--------|
| New column added | Safe — old code ignores new columns. No rollback needed. |
| Column renamed | **Dangerous** — old code references old name. Write a reverse migration. |
| Column deleted | **Dangerous** — old code references deleted column. Restore from backup. |
| New table added | Safe — old code doesn't reference it. No rollback needed. |
| Table deleted | **Dangerous** — restore from backup. |
| RLS policy changed | Write a reverse migration to restore old policy. |
| Enum value added | Safe — `ALTER TYPE ADD VALUE` is not reversible in PostgreSQL, but harmless. |

**Reverse migration file convention:**

```
/supabase/migrations/
├── 00004_create_cases.sql              # Forward migration
├── 00004_create_cases_rollback.sql     # Reverse migration (manual execution only)
```

**Rollback execution:**

```bash
# 1. Identify the migration to reverse
# 2. Run the rollback SQL manually via Supabase SQL Editor or CLI
psql $DATABASE_URL -f supabase/migrations/00004_create_cases_rollback.sql
```

### 8.3 Rollback Decision Matrix

| Situation | Code Rollback? | DB Rollback? | Steps |
|-----------|---------------|-------------|-------|
| UI bug (no data impact) | Yes (Vercel rollback) | No | Rollback code. Fix. Redeploy. |
| API bug (no data impact) | Yes | No | Same as above. |
| API bug + corrupted data | Yes | Possibly | Rollback code. Assess data. Fix data manually via SQL. |
| Failed migration | No (code not deployed yet) | Yes | Run reverse migration. Fix migration. Re-push. |
| Bad migration + bad code deployed | Yes | Yes | Rollback code first. Then rollback DB. Fix both. Redeploy. |

### 8.4 Rollback Communication

When a rollback is performed:
1. Post in team channel: "⚠️ Production rollback initiated. Reason: [brief]. ETA for fix: [time]."
2. Log the rollback event: date, time, initiator, reason, affected deployment.
3. Post-mortem: brief document within 24 hours.

---

## 9. Backup & Recovery

### 9.1 Supabase Automatic Backups

| Tier | Backup Frequency | Retention | Point-in-Time Recovery |
|------|-------------------|-----------|----------------------|
| Free | Daily | 7 days | No |
| Pro ($25/month) | Daily | 30 days | Yes (PITR) |

**Free tier limitation:** Backups are daily snapshots only. Data loss window is up to 24 hours. No self-service restore — must contact Supabase support.

### 9.2 Manual Backup Strategy

To supplement free-tier limitations, implement a manual backup routine:

```bash
# Export database dump (run locally or from CI)
# Requires: Supabase project URL and service role key

# Option 1: pg_dump via connection string
pg_dump "$SUPABASE_DB_URL" --format=custom --no-owner --file=backup_$(date +%Y%m%d).dump

# Option 2: Supabase CLI (if available)
# supabase db dump --file=backup.sql
```

**Backup schedule:**

| Frequency | Method | Storage | Retention |
|-----------|--------|---------|-----------|
| Daily (automated) | Supabase built-in | Supabase infrastructure | 7 days |
| Weekly (manual) | `pg_dump` script | Local / cloud storage | 30 days |
| Pre-release | `pg_dump` before migration | Local | Until next release |

### 9.3 Recovery Procedure

**From Supabase automatic backup:**
1. Open Supabase Dashboard > Project > Settings > Database
2. Select backup date
3. Contact Supabase support for restore (free tier)
4. OR restore via dashboard (Pro tier)

**From manual pg_dump:**

```bash
# Restore to a fresh database (or the same one after clearing)
pg_restore --clean --no-owner -d "$SUPABASE_DB_URL" backup_20260704.dump
```

**Recovery time estimate:**
- Database restore: 5–30 minutes depending on size
- Code rollback: < 1 minute (Vercel instant rollback)
- Full recovery: < 45 minutes

### 9.4 Data That Cannot Be Recovered

| Data | Reason | Mitigation |
|------|--------|------------|
| Supabase Auth sessions | Stored in Supabase-managed auth tables, not included in `pg_dump` of `public` schema | Users will need to log in again after restore |
| Vercel function logs older than 1 hour (free tier) | Vercel log retention is limited on free tier | Export critical logs to external storage if needed |
| Realtime message history | Supabase Realtime is transient (pub/sub, no persistence) | Notifications are persisted in `notifications` table |

---

## 10. Project Structure

```
lawcrm/
├── .github/
│   └── workflows/
│       └── ci.yml                    # CI/CD pipeline
├── supabase/
│   ├── config.toml                   # Supabase local config
│   ├── migrations/
│   │   ├── 00001_create_enums.sql
│   │   ├── 00002_create_profiles.sql
│   │   ├── ...
│   │   └── 00018_enable_realtime.sql
│   └── seed.sql                      # Development seed data
├── src/
│   ├── app/
│   │   ├── layout.tsx                # Root layout (App Shell)
│   │   ├── page.tsx                  # Root redirect
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── (admin)/                  # Admin route group
│   │   │   ├── dashboard/
│   │   │   ├── cases/
│   │   │   ├── task-board/
│   │   │   ├── scheduling/
│   │   │   ├── team/
│   │   │   ├── leave/
│   │   │   ├── settings/
│   │   │   └── archive/
│   │   ├── (staff)/                  # Staff route group
│   │   │   ├── dashboard/
│   │   │   ├── calendar/
│   │   │   ├── cases/
│   │   │   └── leave/
│   │   └── api/                      # API routes
│   │       ├── cases/
│   │       ├── tasks/
│   │       ├── staff/
│   │       ├── schedule/
│   │       ├── leave/
│   │       ├── notifications/
│   │       ├── application-types/
│   │       ├── search/
│   │       ├── archive/
│   │       ├── dashboard/
│   │       └── health/
│   ├── components/                   # Shared UI components
│   │   ├── ui/                       # Base components (buttons, inputs, cards)
│   │   ├── layout/                   # Shell, sidebar, header
│   │   ├── cases/                    # Case-specific components
│   │   ├── tasks/                    # Task-specific components
│   │   ├── scheduling/              # Calendar/grid components
│   │   └── notifications/           # Notification components
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts            # Browser Supabase client
│   │   │   ├── server.ts            # Server-side Supabase client
│   │   │   └── middleware.ts        # Auth middleware
│   │   ├── utils/
│   │   │   ├── reference.ts         # Reference generation logic
│   │   │   ├── prerequisites.ts     # Task prerequisite checks
│   │   │   ├── priority.ts          # Priority sorting logic
│   │   │   └── dates.ts             # Date/time utilities
│   │   └── hooks/
│   │       ├── use-auto-save.ts
│   │       ├── use-realtime.ts
│   │       └── use-notifications.ts
│   ├── types/
│   │   └── database.ts              # Supabase generated types
│   └── styles/
│       └── globals.css              # Global styles
├── public/                           # Static assets
├── tests/
│   ├── unit/                        # Vitest unit tests
│   ├── integration/                 # Vitest + Supabase integration tests
│   └── e2e/                         # Playwright E2E tests
├── .env.example
├── .env.local                        # Local only (gitignored)
├── .gitignore
├── middleware.ts                      # Next.js middleware (auth routing)
├── next.config.js
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── playwright.config.ts
└── README.md
```

---

## 11. Advanced Deployment Considerations (Phase 2)

### 11.1 Supabase Edge Functions

Edge Functions are deployed separately from the Next.js application. See [scheduled-jobs.md](./scheduled-jobs.md) for MVP pilot deploy and cron registration (ticket 0028).

```bash
# Deploy edge functions (manual — ADR-0013)
supabase functions deploy detect-overdue
supabase functions deploy du-alerts

# Set up cron schedules via Supabase dashboard:
# detect-overdue → every 15 minutes (`*/15 * * * *`)
# du-alerts      → daily at 09:00 UTC (`0 9 * * *`)
```

Phase 2 functions (out of MVP scope): `escalation-alerts`, `blocked-reminders`.

### 11.2 Supabase Realtime Configuration

```sql
-- Enable Realtime on specific tables (run as migration)
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Phase 2: Add more tables
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE task_assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE cases;
```

### 11.3 Custom Domain Setup

```bash
# 1. Purchase domain (e.g., tasks.firm.com)
# 2. In Vercel dashboard: Project > Settings > Domains > Add
# 3. Add DNS records as instructed by Vercel:
#    CNAME tasks.firm.com → cname.vercel-dns.com
# 4. Vercel auto-provisions SSL certificate
# 5. Update NEXT_PUBLIC_APP_URL to new domain
```

---

## 12. Open Questions

| # | Question | Impact | Recommendation |
|---|----------|--------|----------------|
| DQ-1 | **Should we use a separate Supabase project for staging?** Free tier allows multiple projects but each has its own 500 MB limit. Sharing a project for preview/staging saves cost but risks data collision. | Environment isolation | Share one dev project for preview + staging. Separate project for production. |
| DQ-2 | **Should database migrations be automated in CI, or remain manual?** Automated is faster but riskier (bad migration auto-deploys). Manual requires discipline but is safer. | Deployment speed vs safety | Manual for production (`supabase db push`). Automated for staging (`supabase db reset` in CI). |
| DQ-3 | **Should we set up uptime monitoring from day one?** UptimeRobot free tier provides 50 monitors with 5-minute intervals. | Incident detection | Yes — set up UptimeRobot for `/api/health` immediately. Zero cost. |
| DQ-4 | **Should Vercel preview deployments use the dev Supabase project or create temporary databases?** Temporary DBs are cleaner but expensive. Shared dev DB is simpler but previews can pollute data. | Preview reliability | Share dev DB. Reset seed data nightly via cron or before each preview test. |
| DQ-5 | **What is the backup strategy for production before the first real user data?** pg_dump requires a connection string with direct DB access, which Supabase exposes under Settings > Database. | Data safety | Set up weekly pg_dump script before launch. Store dumps in a cloud storage bucket or local encrypted drive. |
| DQ-6 | **Who has production Supabase access?** All team members or restricted? | Security | Restrict production Supabase dashboard access to admin/lead developer only. Dev project open to all developers. |

---

*— End of Document —*
