# Mvp4 Documentation

Specification package for the **Team Scheduling & Task Management System** — a web application replacing an Excel-based case tracker for an immigration law firm.

**Stack:** Next.js (App Router) · Supabase (PostgreSQL + Auth + Realtime) · Vercel · Tailwind CSS

**Phase:** **Implementation** — specs locked August 2026

---

## Start here (implementation)

| Role | Read first | Then |
|------|------------|------|
| **Any developer** | [scope_matrix.md](./scope_matrix.md) §7 (Sprint 1) | [deployment_guide.md](./deployment_guide.md) |
| **Backend** | [database_schema.md](./database_schema.md) | [api_specification.md](./api_specification.md) |
| **Frontend** | [design_system.md](./design_system.md) | [ui_wireframe_spec.md](./ui_wireframe_spec.md) |
| **Feature work** | [SRS_v4_MVP.md](./SRS_v4_MVP.md) | [user_stories.md](./user_stories.md) |
| **Tests** | [test_plan.md](./test_plan.md) | User story acceptance criteria |
| **Domain terms** | [../CONTEXT.md](../CONTEXT.md) | — |

---

## Document map

### Requirements

| Document | Purpose |
|----------|---------|
| [SRS_v4_MVP.md](./SRS_v4_MVP.md) | MVP functional requirements (canonical) |
| [SRS_v4_Advanced.md](./SRS_v4_Advanced.md) | Phase 2 enhancements |

### Planning & design

| Document | Purpose |
|----------|---------|
| [scope_matrix.md](./scope_matrix.md) | Modules, sprint plan, risks |
| [user_stories.md](./user_stories.md) | Acceptance criteria |
| [system_design.md](./system_design.md) | Architecture |
| [database_schema.md](./database_schema.md) | Tables, RLS, SQL |
| [api_specification.md](./api_specification.md) | `/api` routes |
| [design_system.md](./design_system.md) | Colours, type, TLS slots, components |
| [ui_wireframe_spec.md](./ui_wireframe_spec.md) | Screen layouts |
| [ui/inspiration/](./ui/inspiration/README.md) | TLS + Optina reference images (6 files) |

### Operations

| Document | Purpose |
|----------|---------|
| [test_plan.md](./test_plan.md) | Test cases |
| [deployment_guide.md](./deployment_guide.md) | CI/CD, environments |
| [adr/](./adr/) | Architecture decisions (11 ADRs) |

---

## Sprint 1 deliverable

Per [scope_matrix.md](./scope_matrix.md) §7:

- Next.js + Supabase project scaffolding
- Auth (login, role routing, middleware)
- Core RLS policies (profiles, incremental per table)
- CI pipeline (unit + integration on push)

---

## Implementation status

| Module | Status |
|--------|--------|
| M1 Auth & RLS | Not started |
| M2 Case Management | Not started |
| M3 Task Lifecycle | Not started |
| M4 Task Board | Not started |
| M5 Scheduling | Not started |
| M6 Staff Dashboard | Not started |
| M7 Notifications | Not started |
| M8 Staff Management | Not started |
| M9 Search | Not started |
| M10 Data Integrity | Not started |
| M11–M15 Advanced | Phase 2 |

**Post-MVP:** Reactive data layer ([0032](../tracker/issues/0032-reactive-data-layer.md)) — TanStack Query + mutation invalidation ([ADR-0016](./adr/0016-reactive-cache-invalidation.md)); closed 2026-08-04.

---

## Locked decisions (quick reference)

| Area | Decision | ADR |
|------|----------|-----|
| Leave | Phase 2; MVP uses timetable for absences | [0001](./adr/0001-leave-management-deferred-to-phase-2.md) |
| Task lifecycle | Fixed 13 tasks | [0002](./adr/0002-fixed-13-task-lifecycle-for-mvp.md) |
| Realtime | Notifications MVP; live board Advanced | [0003](./adr/0003-realtime-split-notifications-mvp-board-advanced.md) |
| Scheduling slots | 30-minute rows, TLS slot pattern | [design_system.md](./design_system.md) §11 |
| Urgent flag | Active tasks only turn red | [0008](./adr/0008-urgent-flag-active-tasks-only.md) |
| References | Global monthly counter, editable | [0009](./adr/0009-global-reference-counter-with-edit-sync.md) |
| Purge retention | 90 days default | [0011](./adr/0011-ninety-day-purge-retention.md) |
| Client data layer | TanStack Query + invalidate-on-mutation | [0016](./adr/0016-reactive-cache-invalidation.md) |

---

## Out of scope (all phases)

Document storage · SMS/email notifications · Payment processing · Multi-tenant
