---
id: 8
title: Set up the CI pipeline
labels: [wayfinder:task, sprint-1-2]
status: closed
assignee:
parent: 1
blocked-by: [2, 3]
mode: AFK
created: 2026-08-01
closed: 2026-08-01
---

## Question

Every push gets verified: a GitHub Actions pipeline running lint, type-check, unit tests, and integration tests against a throwaway local Supabase.

## Resolution

**Deferred — not in the MVP pilot plan per [IMPLEMENTATION_PLAN.md](../../docs/IMPLEMENTATION_PLAN.md).** [ADR-0013](../../docs/adr/0013-no-ci-cd-for-mvp-pilot.md) removes CI/CD, GitHub Actions, and branch protection from the pilot; quality runs through the three manual gates in plan §A.3 instead. The test suites this ticket would have automated are still built (per-ticket, per plan §A.2.4) — only the automation trigger is dropped. If the pilot converts or the team grows, revisit as an optional hardening slice wiring the existing suites into the deployment_guide §6 pipeline.
