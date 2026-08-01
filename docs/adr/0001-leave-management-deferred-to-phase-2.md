# Leave management deferred to Phase 2

Leave requests, approval workflows, allowances, accrual rules, and schedule blocking from approved leave are **Advanced (Phase 2)** features. MVP scheduling uses staff timetables and task assignments only — administrators handle absences by adjusting a staff member's timetable (marking days off) until the full leave module ships.

**Why:** The approved SRS explicitly excludes leave from MVP. Several downstream docs incorrectly marked leave blocking as MVP Must, creating a dependency on tables and workflows that do not exist in the MVP schema. Deferring leave keeps Sprint 5–6 focused on the highest-risk module (scheduling) without building half a leave system.

**MVP workaround:** Admin edits staff timetable to mark non-working days. Scheduling grid formula: `available = timetable − assignments − non-working hours`.
