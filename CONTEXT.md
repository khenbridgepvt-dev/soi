# Team Scheduling & Task Management

A case and task operations system for an immigration law firm. Replaces an Excel-based tracker with structured case lifecycles, admin-controlled scheduling, and staff productivity dashboards.

## Language

**Case**:
A client matter tracked from lead intake through completion. Only accepted cases generate tasks and appear on staff dashboards.
_Avoid_: File, matter (use only in legal prose), ticket

**Lead**:
A case that has been created but not yet accepted or rejected by an administrator. Invisible to staff.
_Avoid_: Prospect, enquiry

**Task**:
A unit of work within a case lifecycle. The system auto-generates 13 standard tasks on case acceptance; administrators may add up to 5 custom tasks.
_Avoid_: Step, action item, to-do

**Task Board**:
The admin tracker view that replaces the Excel spreadsheet — columns per staff member, colour-coded task cards.
_Avoid_: Kanban, pipeline

**Scheduling Grid**:
The admin day-view calendar showing all staff timetables, task assignments, and available slots.
_Avoid_: Calendar, roster

**Timetable**:
A staff member's configured working hours per day of week. Non-working days and off-hours define when tasks cannot be assigned.
_Avoid_: Schedule (ambiguous — use Scheduling Grid for the visual view)

**Assignment**:
A reserved time slot linking a task to a staff member on a specific date and time.
_Avoid_: Booking, allocation (acceptable in technical docs)

**Blocked Task**:
A task waiting on a client response or external dependency. Removed from active scheduling until unblocked and rescheduled.
_Avoid_: On hold, paused

**Senior**:
A staff sub-role eligible for Task 8 (Senior Review). Not a separate access tier — RLS treats senior and staff identically.
_Avoid_: Supervisor, manager

**Administrator**:
A user with full system access: cases, settings, staff, schedules, and reporting.
_Avoid_: Admin (acceptable shorthand in UI), manager

**Staff**:
A caseworker with access limited to their assigned tasks, cases, and personal schedule.
_Avoid_: Caseworker (legal term, not system role name), employee

**Notification**:
An in-app alert delivered to a user. MVP supports in-app only — no SMS or email.
_Avoid_: Alert, message

**Leave**:
A staff absence request with approval workflow, allowances, and schedule blocking. **Advanced (Phase 2) only** — not in MVP.
_Avoid_: PTO, holiday (use as leave type values, not as the concept name)

**Archive**:
Soft-deleted records recoverable by administrators within a configurable retention period.
_Avoid_: Trash, deleted items

## Architecture

- **Client state:** TanStack Query (`src/lib/query/`); mutations call `invalidateAfterMutation` — see [ADR-0016](docs/adr/0016-reactive-cache-invalidation.md), [ticket 0032](tracker/issues/0032-reactive-data-layer.md). Board Realtime deferred per [ADR-0003](docs/adr/0003-realtime-split-notifications-mvp-board-advanced.md).
- **Application types:** SKD (Skilled Worker Dependant) is a **separate** type from SKW — [ticket 0036](tracker/issues/0036-skilled-worker-dependant-application-type.md).
- **Post-MVP UX:** Assign picker (0033), slot custom task (0034), intake fork (0035) — index in [docs/SOURCE_OF_TRUTH.md](docs/SOURCE_OF_TRUTH.md).
- **Agent docs:** Start at [docs/SOURCE_OF_TRUTH.md](docs/SOURCE_OF_TRUTH.md); delivery history in [tracker/issues/0001-mvp-implementation-map.md](tracker/issues/0001-mvp-implementation-map.md).
