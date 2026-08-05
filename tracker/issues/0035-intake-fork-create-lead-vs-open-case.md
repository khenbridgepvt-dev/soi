---
id: 35
title: Intake fork — create lead vs create and open case
labels: [wayfinder:task, post-mvp, ux]
status: closed
closed: 2026-08-05
parent: 1
blocked-by: [32]
mode: AFK
created: 2026-08-05
---

## Question

Every "+ Create Lead" opens the same modal and only creates `lead_pending`. Admins need a choice: queue for review later, or create + accept immediately and land on case detail.

## HITL note

**Create & open case** auto-accepts the lead without the S-08 review step — explicit product choice for admins who already have enough information to open the case.

## Scope

- `CreateCaseForkModal` — chooser before create
- `CreateAndOpenCaseModal` — same fields as S-07, create + accept + navigate
- `CreateCaseIntake` — drop-in wrapper for entry points
- Wire: `TaskBoardView`, `AdminDashboardView`, `CaseList`
- Integration tests for both paths

## Spec pointers

- `docs/ui_wireframe_spec.md` S-07
- `docs/api_specification.md` EP-01, EP-05
- `docs/user_stories.md` US-2.1, US-2.3

## Done when

"+ New case" → fork → both paths work without F5 stale UI. Gate 1 green.

## Test seam

- `tests/integration/intake-fork.test.ts`
- `src/lib/cases/create-lead-and-accept.ts` helper

## Do NOT

- Skilled Worker dependants (0036)
- Slot menu create lead (0034 scope)
- Change 13-task lifecycle (ADR-0002)
- Realtime board

## Resolution

`CreateCaseIntake` wraps `CreateCaseForkModal` + existing `CreateLeadModal` + new `CreateAndOpenCaseModal`. Entry points (`CaseList`, `TaskBoardView`, `AdminDashboardView`) renamed button to **+ New case** and open the fork.

**Create & open case:** same S-07 fields → `POST /api/cases` → `POST /api/cases/:id/accept` → `invalidate('createLead')` + `invalidate('acceptLead', { caseId })` → `router.push(/cases/:id?accepted=1)`.

`createLeadAndAccept()` helper in `src/lib/cases/create-lead-and-accept.ts` for integration tests. `LeadDetailActionsClient` navigates to `?accepted=1` on S-08 accept from case detail.

Updated S-07 wireframe fork, US-2.1 post-MVP note. Integration tests in `tests/integration/intake-fork.test.ts`.

### Manual smoke

1. Case list → + New case → Create lead for review → lead appears as pending.
2. Task board → + New case → Create & open case → lands on active case detail with reference and tasks.
