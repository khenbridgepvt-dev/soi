# User Stories & Acceptance Criteria

**Project:** Team Scheduling & Task Management System  
**Version:** 1.0  
**Date:** 4 July 2026  
**Sources:**
- [SRS_v4_MVP.md](./SRS_v4_MVP.md)
- [SRS_v4_Advanced.md](./SRS_v4_Advanced.md)

---

## 1. Objective

Translate every functional requirement from the SRS into implementation-ready user stories with clear acceptance criteria, organised by epic. Each story is classified as **MVP** or **Advanced (Phase 2)** and assigned a priority of **Must**, **Should**, or **Could**.

---

## 2. Scope Summary

| Scope | Description |
|-------|-------------|
| **MVP** | Core case management, 13-task auto-lifecycle (+ up to 5 custom tasks), task board (Excel replacement), basic scheduling, staff timetables, in-app notifications with acknowledgement, search & filtering, authentication & RLS, data integrity |
| **Advanced** | Drag-and-drop, real-time live updates, bulk actions, linked cases, task extension workflow, overtime module, appointment safety net automation, progressive alert escalation, full audit trails, psychology-driven UX, leave management |
| **Out of Scope** | Document storage, SMS/email notifications, payment processing, external integrations beyond Google Forms |

---

## 3. Epic List

| # | Epic | Scope | Stories |
|---|------|-------|---------|
| E1 | Authentication & Role Management | MVP | US-1.1 – US-1.3 |
| E2 | Case Management | MVP | US-2.1 – US-2.7 |
| E3 | Task Lifecycle & Checklist | MVP | US-3.1 – US-3.5 |
| E4 | Task Board (Tracker View) | MVP + Advanced | US-4.1 – US-4.8 |
| E5 | Team Scheduling | MVP | US-5.1 – US-5.7 |
| E6 | Staff Dashboard & Calendar | MVP + Advanced | US-6.1 – US-6.4 |
| E7 | In-App Notifications | MVP + Advanced | US-7.1 – US-7.7 |
| E8 | Staff Management & Leave | MVP + Advanced | US-8.1 – US-8.7 |
| E9 | Search & Filtering | MVP + Advanced | US-9.1 – US-9.2 |
| E10 | Security & Data Integrity | MVP + Advanced | US-10.1 – US-10.6 |
| E11 | Advanced Scheduling & Automation | Advanced | US-11.1 – US-11.7 |
| E12 | Appointment Safety Net | Advanced | US-12.1 – US-12.5 |
| E13 | Overtime Tracking & Reporting | Advanced | US-13.1 – US-13.5 |

---

## 4. User Stories & Acceptance Criteria

---

### Epic 1 — Authentication & Role Management

---

#### US-1.1 · Admin Login

| Field | Value |
|-------|-------|
| **Scope** | MVP |
| **Priority** | Must |
| **Dependencies** | Supabase project configured |
| **SRS Ref** | MVP §2.1, §7.1 |

**Story:** As an administrator, I want to log in with secure credentials so that I can access all system features with full privileges.

**Acceptance Criteria:**
- [ ] Admin can log in using email and password via Supabase Auth.
- [ ] Upon successful login, admin is redirected to the admin dashboard.
- [ ] Failed login attempts display a clear error message without revealing whether the email or password was incorrect.
- [ ] Admin session persists across browser refreshes until explicit logout or session timeout.
- [ ] RLS policies restrict admin access to `role = 'admin'` only.

**Edge Cases:**
- Concurrent sessions from multiple devices must be permitted.
- Browser crash during login does not leave a partially authenticated state.

---

#### US-1.2 · Staff Login

| Field | Value |
|-------|-------|
| **Scope** | MVP |
| **Priority** | Must |
| **Dependencies** | US-1.1 (auth infrastructure) |
| **SRS Ref** | MVP §2.2, §7.1 |

**Story:** As a staff member, I want to log in with secure credentials so that I can view only my assigned tasks and schedule.

**Acceptance Criteria:**
- [ ] Staff can log in using email and password via Supabase Auth.
- [ ] Upon successful login, staff is redirected to their prioritised dashboard.
- [ ] Staff cannot access admin-only views (system settings, other staff's schedules, financial data).
- [ ] RLS policies restrict staff to rows where `assigned_to = auth.uid()` or the case is shared with them.
- [ ] Pre-acceptance cases are not visible to staff.

**Edge Cases:**
- A staff member whose account is deactivated by an admin cannot log in; an appropriate message is shown.

---

#### US-1.3 · Role-Based Access Control

| Field | Value |
|-------|-------|
| **Scope** | MVP |
| **Priority** | Must |
| **Dependencies** | US-1.1, US-1.2 |
| **SRS Ref** | MVP §2.1, §2.2, §7.1 |

**Story:** As the system, I want to enforce role-based access at the database level so that data visibility is restricted by user role without relying solely on frontend guards.

**Acceptance Criteria:**
- [ ] Three roles exist: `admin`, `staff`, and `senior`. The `senior` role is a sub-role of staff — it has the same data access as staff but can additionally be assigned to Task 8 (Senior Review) and approve/reject work.
- [ ] RLS policies are defined on all MVP data tables (cases, tasks, profiles, notifications). Leave tables (Advanced) are excluded from MVP RLS scope.
- [ ] Admin role can read/write all rows in all tables.
- [ ] Staff and senior roles can only read/write rows they are assigned to, plus shared read access to case checklists they participate in.
- [ ] Column-level write restrictions are enforced by database triggers — RLS controls row access; triggers control which columns staff/senior can modify.
- [ ] Attempting to access restricted data via the Supabase client or direct API returns an empty result or a 403 error — not a 500.

---

### Epic 2 — Case Management

---

#### US-2.1 · Create a New Case (Lead)

| Field | Value |
|-------|-------|
| **Scope** | MVP |
| **Priority** | Must |
| **Dependencies** | US-1.1 |
| **SRS Ref** | MVP §3.1 |

**Story:** As an administrator, I want to create a new case (lead) so that I can record an incoming enquiry and decide whether to accept it.

**Acceptance Criteria:**
- [ ] Only admins can create cases; staff cannot.
- [ ] The case creation form captures: client name, application type (from admin-configured list), and optional notes.
- [ ] Newly created cases default to status `Lead — Pending Review`.
- [ ] The case does not generate tasks and is not visible to staff until explicitly accepted.
- [ ] A case reference is **not** generated until the case is accepted (see US-2.3).

**Post-MVP (ticket 0035):** Admins may choose **Create & open case** at intake to auto-accept immediately (same EP-01 + EP-05 sequence) and land on case detail — bypasses S-08 review when the admin already has enough information.

**Edge Cases:**
- Submitting the form with a blank client name is blocked (mandatory field enforcement after acceptance — but client name should be required at creation too for usability).

---

#### US-2.2 · Configure Application Types

| Field | Value |
|-------|-------|
| **Scope** | MVP |
| **Priority** | Must |
| **Dependencies** | US-1.1 |
| **SRS Ref** | MVP §3.5 |

**Story:** As an administrator, I want to add, edit, and remove application types so that the system reflects the firm's current service offerings.

**Acceptance Criteria:**
- [ ] Admin can navigate to Settings → Application Types.
- [ ] Admin can add a new type with: full name, abbreviation code (e.g., "SKW" for Skilled Worker), and active/inactive status.
- [ ] Admin can edit an existing type's name or abbreviation.
- [ ] Admin can deactivate (not hard-delete) a type; deactivated types no longer appear in the case creation dropdown but remain on existing cases.
- [ ] Default types are pre-seeded: Skilled Worker Visa (SKW), **Skilled Worker Dependant (SKD)** — separate type per firm workflow, Graduate Visa, Spouse Visa, ILR, Naturalisation, Fee Waiver, Further Leave to Remain.
- [ ] The abbreviation code is used in automated reference generation (US-2.3).

---

#### US-2.3 · Automated Reference Generation

| Field | Value |
|-------|-------|
| **Scope** | MVP |
| **Priority** | Must |
| **Dependencies** | US-2.1, US-2.2, US-2.4 |
| **SRS Ref** | MVP §3.7 |

**Story:** As the system, I want to automatically generate a case reference number when a case is accepted so that every case has a unique, human-readable identifier.

**Acceptance Criteria:**
- [ ] Reference format: `MMYYNO/TYPE/ABC` where:
    - `MM` = two-digit month of acceptance
    - `YY` = two-digit year of acceptance
    - `NO` = sequential number within that month, **global across all application types** (zero-padded to at least 2 digits)
    - `TYPE` = application type abbreviation (from US-2.2)
    - `ABC` = first three letters of the client's first name (uppercase)
- [ ] Example: the 4th case accepted in May 2026 (any type) for client "Mariya" on a Skilled Worker case → `052604/SKW/MAR`.
- [ ] Sequential numbering resets at the start of each month.
- [ ] References are unique — the system prevents duplicates even under concurrent acceptance.
- [ ] The reference is displayed on all case-related views: checklist, task board, case detail, notifications.
- [ ] The auto-generated reference is **editable by administrators** after generation to align with external software. Edited references must remain unique.
- [ ] **Edit sync rules** (see [ADR-0009](./adr/0009-global-reference-counter-with-edit-sync.md)):
    - If admin changes sequence `04` → `05` but `05` already exists, the system assigns the next available number (e.g. `06`) and notifies the admin.
    - The monthly counter updates to stay ahead of the highest sequence number in use.
    - Other cases are not automatically renumbered.

**Edge Cases:**
- Client names shorter than 3 characters: pad with "X" (e.g., "Li" → "LIX").
- Non-Latin characters in client names: use the [`transliteration`](https://www.npmjs.com/package/transliteration) npm package (or equivalent) to convert non-Latin scripts to ASCII. If transliteration produces fewer than 3 characters, pad with "X". If transliteration fails entirely, use "XXX".
- If an admin edits a reference to a value already used by another case, the system rejects the edit with a clear error (UNIQUE constraint).
- Admin-edited references must NOT match the auto-generation pattern (`MMYYNO/TYPE/ABC`). If the edited value would collide with a future auto-generated reference, the system warns the admin. As a backstop, the auto-generation function retries with the next sequence number if a UNIQUE constraint violation occurs.

---

#### US-2.4 · Accept or Reject a Lead

| Field | Value |
|-------|-------|
| **Scope** | MVP |
| **Priority** | Must |
| **Dependencies** | US-2.1 |
| **SRS Ref** | MVP §3.1 |

**Story:** As an administrator, I want to accept or reject a lead so that only valid cases enter the workflow and generate tasks.

**Acceptance Criteria:**
- [ ] Admin views a list of leads with status `Lead — Pending Review`.
- [ ] Admin can click **Accept** — the case status changes to `Active`, a reference is generated (US-2.3), and the 13-task lifecycle is auto-generated (US-3.1).
- [ ] Admin can click **Reject** — the case status changes to `Rejected`. No tasks are generated.
- [ ] Rejected cases are retained in the database (soft state) and can be filtered/viewed by admins but are excluded from default views.
- [ ] Acceptance/rejection is a one-time action — a rejected case cannot be re-accepted without admin explicitly re-opening it.

**Edge Cases:**
- If the case is missing mandatory fields at acceptance time, the system blocks acceptance and highlights missing fields.

---

#### US-2.5 · Client & Dependant Association

| Field | Value |
|-------|-------|
| **Scope** | MVP |
| **Priority** | Must |
| **Dependencies** | US-2.1 |
| **SRS Ref** | MVP §3.5 |

**Story:** As an administrator, I want to associate a case with a primary client and their dependants so that all family members are tracked together.

**Acceptance Criteria:**
- [ ] Each case has exactly one primary client.
- [ ] Admin can add one or more dependants to a case (name + relationship).
- [ ] Dependant names appear alongside the client name on the task board (e.g., "Rakhi Krishna + 2 children").
- [ ] Dependants can be added or removed after case creation.
- [ ] Deleting a dependant is a soft-delete.

---

#### US-2.6 · View Case Detail

| Field | Value |
|-------|-------|
| **Scope** | MVP |
| **Priority** | Must |
| **Dependencies** | US-2.4, US-3.1 |
| **SRS Ref** | MVP §3.3 |

**Story:** As an administrator or assigned staff member, I want to view the full detail of a case so that I can see its status, checklist, client info, and all associated tasks.

**Acceptance Criteria:**
- [ ] Case detail page displays: reference number, client name + dependants, application type, case status, assigned staff, last date / deadline, appointment date, and inline notes.
- [ ] The 13-task visual checklist is prominently displayed (see US-3.2).
- [ ] Admins can edit all fields. Staff can edit inline notes and task statuses for tasks assigned to them.
- [ ] Mandatory fields (client name, appointment date once set, last date once set) cannot be cleared.

---

#### US-2.7 · Add Inline Notes to a Case

| Field | Value |
|-------|-------|
| **Scope** | MVP |
| **Priority** | Should |
| **Dependencies** | US-2.6 |
| **SRS Ref** | MVP §3.4.1 |

**Story:** As an administrator or staff member, I want to add inline notes to a case or task so that I can record context visible on the task board.

**Acceptance Criteria:**
- [ ] Both admins and assigned staff can add/edit inline notes on a task.
- [ ] Notes are freeform text, max 500 characters.
- [ ] Notes are visible on the task board row for that task (e.g., "CoS pending", "no rep", "new client").
- [ ] Notes are auto-saved (no save button required).

---

### Epic 3 — Task Lifecycle & Checklist

---

#### US-3.1 · Auto-Generate 13-Task Lifecycle

| Field | Value |
|-------|-------|
| **Scope** | MVP |
| **Priority** | Must |
| **Dependencies** | US-2.4 |
| **SRS Ref** | MVP §3.2 |

**Story:** As the system, I want to automatically generate 13 tasks when a case is accepted so that staff have a structured workflow without manual setup.

**Acceptance Criteria:**
- [ ] Upon case acceptance, exactly 13 default task records are created in the database, in order:
    1. CCL, 2. LOA, 3. Send Google Form, 4. Google Form Received, 5. Application Preparation, 6. Pending Detail Collection, 7. Review by Client, 8. Review by Senior, 9. Disclaimer Email Sent, 10. Application Payment, 11. Appointment Booking, 12. Document Collection, 13. Document Review & Upload.
- [ ] Each task has: a sequence number, task name, description, status (`Not Started` by default), assigned staff (null until assigned), time allocation (null until set by admin), `is_custom = false`, and a parent case reference.
- [ ] Tasks are immediately visible on the case checklist view.
- [ ] Tasks are not visible on staff dashboards until assigned to a specific staff member.

---

#### US-3.1b · Add Custom Task to Case

| Field | Value |
|-------|-------|
| **Scope** | MVP |
| **Priority** | Must |
| **Dependencies** | US-3.1 |
| **SRS Ref** | MVP §3.2.1 |

**Story:** As an administrator, I want to add custom tasks to a case so that I can accommodate exception workflows beyond the standard 13 tasks.

**Acceptance Criteria:**
- [ ] Only admins can add custom tasks; staff cannot.
- [ ] Admin can add a custom task to any active case, specifying: task name, abbreviation, and description.
- [ ] Custom tasks are assigned sequence numbers starting from 14 onwards.
- [ ] A maximum of **5 custom tasks** can be added per case (hard limit). Attempting to add a 6th returns an error.
- [ ] Custom tasks are marked with `is_custom = true` and visually labelled as "Custom" on the checklist and task board.
- [ ] Custom tasks behave identically to default tasks: they can be assigned to staff, scheduled with time allocations, and tracked through the standard status workflow.
- [ ] Custom tasks do **not** participate in prerequisite logic (Task 8, 9, 10 gates).
- [ ] The case checklist, task board, and all views automatically reflect custom tasks.

**Edge Cases:**
- Adding a custom task to a completed case is blocked.

---

#### US-3.2 · Visual Case Checklist

| Field | Value |
|-------|-------|
| **Scope** | MVP |
| **Priority** | Must |
| **Dependencies** | US-3.1 |
| **SRS Ref** | MVP §3.3 |

**Story:** As an administrator or staff member, I want to see a visual checklist of all 13 tasks on the case detail page so that I can instantly assess case progress.

**Acceptance Criteria:**
- [ ] The checklist displays all 13 tasks in sequence order.
- [ ] Each task shows: task name, status icon (Not Started ○, In Progress ◐, Completed ✓, Blocked ⊘), and assigned staff name.
- [ ] Completed tasks have a visual tick and are styled as "done" (e.g., strikethrough or muted colour).
- [ ] Blocked tasks display "Blocked — Awaiting Client Response" in a distinct colour.
- [ ] The checklist updates immediately when a task status changes (on the same page — no navigation required).
- [ ] A progress bar or fraction (e.g., "5/13 complete") is displayed at the top of the checklist.

---

#### US-3.3 · Update Task Status

| Field | Value |
|-------|-------|
| **Scope** | MVP |
| **Priority** | Must |
| **Dependencies** | US-3.1 |
| **SRS Ref** | MVP §3.2, §3.3 |

**Story:** As a staff member, I want to update the status of a task assigned to me so that my progress is reflected on the case checklist and task board.

**Acceptance Criteria:**
- [ ] A staff member can change a task's status from `Not Started` → `In Progress` → `Completed`.
- [ ] A staff member can change a task's status to `Blocked — Awaiting Client Response` from any non-completed status (see US-5.5).
- [ ] Status changes are reflected on the case checklist (US-3.2) and task board (US-4.1).
- [ ] Marking a task as `Completed` is a protected action — once completed, it cannot be undone by staff (admin reversal is Phase 2 — US-10.5).
- [ ] The system records the timestamp and user who changed the status.

**Edge Cases:**
- A task cannot be marked `Completed` if it has never been `In Progress` — it must transition through `In Progress` first.

---

#### US-3.4 · Task 10 Payment Gate

| Field | Value |
|-------|-------|
| **Scope** | MVP |
| **Priority** | Must |
| **Dependencies** | US-3.1, US-3.3 |
| **SRS Ref** | MVP §3.2 (Task 10) |

**Story:** As the system, I want to enforce that Application Payment (Task 10) can only be marked as complete when prerequisite tasks are done so that payment is not processed prematurely.

**Acceptance Criteria:**
- [ ] Task 10 cannot be marked `Completed` unless:
    - Task 9 (Disclaimer Email Sent) is `Completed`.
    - Task 1 (CCL) is `Completed`.
    - Task 2 (LOA) is `Completed`.
- [ ] If a staff member attempts to complete Task 10 without prerequisites, a clear error message lists the outstanding tasks.
- [ ] This rule is enforced at the API/database level, not just the frontend.

---

#### US-3.5 · Task 8 Senior Review Gate

| Field | Value |
|-------|-------|
| **Scope** | MVP |
| **Priority** | Must |
| **Dependencies** | US-3.1, US-3.3 |
| **SRS Ref** | MVP §3.2 (Task 8) |

**Story:** As the system, I want to enforce that the Senior Review task requires explicit senior approval so that applications are properly quality-checked.

**Acceptance Criteria:**
- [ ] Task 8 (Review by Senior) can only be assigned to a staff member with a `senior` or `admin` designation.
- [ ] Task 8 has two completion outcomes: **Approved** or **Revisions Required**.
- [ ] If **Revisions Required**, Task 5 (Application Preparation) is reopened with status `In Progress` and a note indicating revisions are needed.
- [ ] Task 9 (Disclaimer Email Sent) cannot be started until Task 8 is marked `Approved`.
- [ ] The system tracks a **revision count** on the case (incremented each time Task 8 returns Revisions Required). The count is visible to administrators on the case detail page and task board.
- [ ] When the revision count reaches a configurable threshold (default: **3**), administrators receive an in-app alert. There is **no automatic cap** on revision loops — see [ADR-0006](./adr/0006-task-8-unlimited-revisions-with-admin-alert.md).

---

### Epic 4 — Task Board (Tracker View)

---

#### US-4.1 · Display Task Board Grid

| Field | Value |
|-------|-------|
| **Scope** | MVP |
| **Priority** | Must |
| **Dependencies** | US-3.1, US-5.1 |
| **SRS Ref** | MVP §3.4.1 |

**Story:** As an administrator, I want to view a multi-column grid where each column shows a staff member's active tasks so that I can manage daily operations at a glance — replacing the current Excel tracker.

**Acceptance Criteria:**
- [ ] The board displays one column per active staff member.
- [ ] Each column header shows the staff member's name.
- [ ] Each row within a column represents one task and displays:
    - Task type abbreviation (e.g., App, DU, CCL/LOA, Appt Booking, Review)
    - Client name (including dependants — e.g., "Vishnu partner and child"). The client name is a **clickable link** that navigates to the client's case detail page.
    - Appointment date & time (e.g., "appt 19 (3:30)")
    - Last date / deadline (e.g., "last date 28 July")
    - Inline notes
- [ ] Only tasks with status `In Progress`, `Not Started` (assigned), or `Blocked` appear on the board. `Completed` tasks are hidden by default.
- [ ] The board loads within 3 seconds for up to 100 concurrent tasks.

---

#### US-4.2 · Colour-Coded Task Rows (MVP)

| Field | Value |
|-------|-------|
| **Scope** | MVP |
| **Priority** | Must |
| **Dependencies** | US-4.1 |
| **SRS Ref** | MVP §3.4.2 |

**Story:** As an administrator, I want task rows to be colour-coded by urgency so that I can instantly identify which tasks need attention.

**Acceptance Criteria:**
- [ ] **Green** row: task is `In Progress` and on track (not approaching deadline).
- [ ] **Red** row: task is flagged as `Urgent` by admin, or the task is `Overdue` (past allocated end time without completion), or DU escalation has reached critical level (US-7.7).
- [ ] **Amber** row: task is approaching deadline — triggered by **whichever comes first** (see [ADR-0007](./adr/0007-hybrid-amber-and-du-escalation.md)):
    - Deadline within **3 calendar days**, OR
    - **50% or more** of the allocated time has elapsed without completion.
- [ ] **White** row: task is `Not Started` with no immediate urgency.
- [ ] Colours are applied automatically based on task state and deadline — no manual colour selection.
- [ ] **Document Upload (DU) tasks** (Tasks 12 & 13) use **working days** for deadline proximity, not calendar days. See US-7.7 for notification and escalation rules.

---

#### US-4.3 · Enhanced Task Board Colours

| Field | Value |
|-------|-------|
| **Scope** | Advanced |
| **Priority** | Should |
| **Dependencies** | US-4.2 |
| **SRS Ref** | ADV §3.2 |

**Story:** As an administrator, I want additional colour codes (teal for elevated priority, grey separators) so that I can visually organise the board beyond basic urgency.

**Acceptance Criteria:**
- [ ] **Teal / Highlighted** row: task has been explicitly flagged by admin as elevated priority (distinct from urgent).
- [ ] **Grey** rows: non-task separator rows for visual grouping (e.g., by week, batch, or priority tier).
- [ ] Admin can insert a grey separator row at any position in a column.
- [ ] Separator rows display a label (e.g., "Week 28", "Priority Tier 1") but have no task data.

---

#### US-4.4 · Drag-and-Drop Task Reordering

| Field | Value |
|-------|-------|
| **Scope** | Advanced |
| **Priority** | Should |
| **Dependencies** | US-4.1 |
| **SRS Ref** | ADV §3.3 |

**Story:** As an administrator, I want to reorder tasks on the board via drag-and-drop so that I can manually adjust priorities without editing each task individually.

**Acceptance Criteria:**
- [ ] Admin can drag a task row within a column to reorder it.
- [ ] The new position is persisted immediately (auto-save).
- [ ] Drag-and-drop is available only to admins — staff see a read-only task order.
- [ ] Moving a task updates its priority position in the staff member's priority queue.

---

#### US-4.5 · Real-Time Live Board Updates

| Field | Value |
|-------|-------|
| **Scope** | Advanced |
| **Priority** | Should |
| **Dependencies** | US-4.1 |
| **SRS Ref** | ADV §3.4 |

**Story:** As an administrator, I want the task board to update in real time so that status changes, completions, and reassignments are visible without refreshing the page.

**Acceptance Criteria:**
- [ ] When any user changes a task status, the board reflects the change within 2 seconds for all open board sessions.
- [ ] When a task is assigned or reassigned, it moves to the correct column in real time.
- [ ] Powered by Supabase Realtime subscriptions on the `tasks` table.
- [ ] If the real-time connection drops, a banner warns the user and falls back to polling every 30 seconds.

---

#### US-4.6 · Advanced Filtering & Grouping on Task Board

| Field | Value |
|-------|-------|
| **Scope** | Advanced |
| **Priority** | Should |
| **Dependencies** | US-4.1 |
| **SRS Ref** | ADV §3.5 |

**Story:** As an administrator, I want to filter and group the task board by multiple criteria so that I can focus on specific subsets of work.

**Acceptance Criteria:**
- [ ] Filter options: staff member, task type, urgency level, deadline range (date picker), blocked status.
- [ ] Grouping options: by week, by staff member, by case.
- [ ] Multiple filters can be applied simultaneously (AND logic).
- [ ] Active filters are displayed as removable chips above the board.
- [ ] Filter state persists across page navigation within the same session.

---

#### US-4.7 · Bulk Actions on Task Board

| Field | Value |
|-------|-------|
| **Scope** | Advanced |
| **Priority** | Could |
| **Dependencies** | US-4.1, US-4.6 |
| **SRS Ref** | ADV §3.6 |

**Story:** As an administrator, I want to select multiple tasks and perform bulk actions so that I can reassign, reprioritise, or flag tasks efficiently.

**Acceptance Criteria:**
- [ ] Admin can select multiple tasks using checkboxes (per-row selection + "select all in column").
- [ ] Available bulk actions: Reassign to another staff member, Flag as Urgent, Remove urgent flag, Change status.
- [ ] A confirmation dialog appears before executing bulk actions, showing the count of affected tasks.
- [ ] Bulk actions are atomic — either all succeed or none do, with an error message identifying failures.

---

#### US-4.8 · Soft-Delete Protection on Task Board

| Field | Value |
|-------|-------|
| **Scope** | MVP |
| **Priority** | Must |
| **Dependencies** | US-4.1 |
| **SRS Ref** | MVP §7.2 |

**Story:** As the system, I want to prevent accidental task deletion on the board so that no operational data is lost.

**Acceptance Criteria:**
- [ ] There is no "Delete" button on task rows. Tasks cannot be removed from the board directly.
- [ ] If an admin removes a task (from the case detail view), a confirmation dialog with the task name and case reference is shown.
- [ ] Confirmed deletions are soft-deletes — the task is marked `is_deleted = true` and hidden from all views.
- [ ] Admins can access an "Archived Tasks" view to see soft-deleted items.
- [ ] Permanent purge is only available after a configurable retention period (default: **90 days**).

---

### Epic 5 — Team Scheduling

---

#### US-5.1 · Add / Remove Staff Members

| Field | Value |
|-------|-------|
| **Scope** | MVP |
| **Priority** | Must |
| **Dependencies** | US-1.1 |
| **SRS Ref** | MVP §4.1 |

**Story:** As an administrator, I want to add and remove staff members from the system so that the team roster is always current.

**Acceptance Criteria:**
- [ ] Admin can add a new staff member with: full name, **username** (display handle), email, role (staff/senior), and default working hours.
- [ ] Usernames are unique (case-insensitive) and shown as `@username` in team and assign UIs; login remains email-based (ADR-0017).
- [ ] Adding a staff member creates a Supabase Auth account and sends an invitation email.
- [ ] Admin can deactivate a staff member — their account is disabled, tasks remain assigned but the staff member no longer appears in the scheduling grid as "available."
- [ ] Deactivated staff members' data is retained (soft-remove, not hard-delete).
- [ ] **Last-admin protection:** The system prevents deactivation of the last active admin. At least one admin account must remain active at all times. Attempting to deactivate the last admin returns an error: "Cannot deactivate the last active administrator."

---

#### US-5.2 · Configure Staff Timetable

| Field | Value |
|-------|-------|
| **Scope** | MVP |
| **Priority** | Must |
| **Dependencies** | US-5.1 |
| **SRS Ref** | MVP §4.1 |

**Story:** As an administrator, I want to set customisable working hours per staff member so that the scheduling system knows when each person is available.

**Acceptance Criteria:**
- [ ] Each staff member has a weekly timetable: for each day (Mon–Sun), a start time and end time can be set.
- [ ] The default timetable for new staff is a **6-day work week** (Monday to Saturday, 09:00–17:00). Sunday is a non-working day by default.
- [ ] Different staff members can have different timetables (e.g., one works 09:00–17:00, another 10:00–18:00).
- [ ] Non-working days (e.g., Sunday by default) can be left blank — they appear greyed out on the scheduling grid.
- [ ] Timetable changes take effect from the next day — they do not retroactively affect already-scheduled tasks.
- [ ] The system displays total available hours per day and per week for each staff member.
- [ ] Timetables are configured in **team settings** or during the process of adding a new staff member.

---

#### US-5.3 · Assign Task to Staff with Time Allocation

| Field | Value |
|-------|-------|
| **Scope** | MVP |
| **Priority** | Must |
| **Dependencies** | US-3.1, US-5.2 |
| **SRS Ref** | MVP §4.3 |

**Story:** As an administrator, I want to assign a task to a staff member with an explicit time allocation and time slot so that the schedule reflects planned workload.

**Acceptance Criteria:**
- [ ] Admin selects a task (from the case or from the unassigned pool) and chooses a staff member.
- [ ] During assignment, the system displays the staff member's schedule showing available (green) and occupied (grey) time slots.
- [ ] Admin sets the time allocation (e.g., 2 hours) and selects a start time from the available slots.
- [ ] Upon confirmation, the time slot is reserved and greyed out on the schedule.
- [ ] The task appears on the staff member's dashboard and on the task board.
- [ ] Different staff members can be given different time allocations for the same task type.

**Edge Cases:**
- If the selected slot is no longer available (race condition), the system displays an error and refreshes the schedule.

---

#### US-5.4 · Visual Schedule Grid (Admin)

| Field | Value |
|-------|-------|
| **Scope** | MVP |
| **Priority** | Must |
| **Dependencies** | US-5.2, US-5.3 |
| **SRS Ref** | MVP §4.4 |

**Story:** As an administrator, I want a calendar-style grid to view and manage all staff schedules so that I can assign tasks visually and spot conflicts.

**Acceptance Criteria:**
- [ ] The grid displays one row per staff member and time slots as columns (hour-by-hour for day view).
- [ ] Available slots are visually distinct (green/open) from occupied slots (grey with task name).
- [ ] Clicking an available slot opens the task assignment dialog (US-5.3).
- [ ] Non-working hours (from staff timetable) appear as blocked/off-hours regions.
- [ ] The grid supports at least a Day view (all staff, one day).

> **Phase 2 (Advanced):** Leave days appear as fully blocked rows (greyed out with "On Leave" label). See US-8.3 and [ADR-0001](./adr/0001-leave-management-deferred-to-phase-2.md).

---

#### US-5.5 · Conflict Prevention (Double-Booking)

| Field | Value |
|-------|-------|
| **Scope** | MVP |
| **Priority** | Must |
| **Dependencies** | US-5.3, US-5.4 |
| **SRS Ref** | MVP §4.4 |

**Story:** As the system, I want to prevent double-booking of staff members so that no two tasks overlap in the same time slot.

**Acceptance Criteria:**
- [ ] When an admin attempts to assign a task to a slot that overlaps with an existing assignment, the system blocks the action and displays a conflict message naming the conflicting task.
- [ ] Conflict detection considers: existing task allocations and non-working hours (from staff timetable).
- [ ] The check is enforced at the API level, not just the UI.

> **Phase 2 (Advanced):** Conflict detection also considers approved leave days. See [ADR-0001](./adr/0001-leave-management-deferred-to-phase-2.md).

---

#### US-5.6 · Flag Case as Urgent

| Field | Value |
|-------|-------|
| **Scope** | MVP |
| **Priority** | Must |
| **Dependencies** | US-2.4, US-4.1 |
| **SRS Ref** | MVP §4.5 |

**Story:** As an administrator, I want to flag a case as urgent so that it is visually highlighted and staff are notified immediately.

**Acceptance Criteria:**
- [ ] Admin can toggle an `is_urgent` flag on any active case.
- [ ] When flagged, only **active tasks** (`In Progress` or `Not Started`) belonging to that case are highlighted red on the task board (US-4.2). **Completed** tasks retain normal colouring — see [ADR-0008](./adr/0008-urgent-flag-active-tasks-only.md).
- [ ] The case itself is highlighted across the case checklist, dashboard, and scheduling grid for **all administrators** and **all staff members assigned to tasks in that case**. Staff not assigned to the case do not see the urgent highlighting.
- [ ] An in-app urgent notification is sent to all staff assigned to tasks in that case (US-7.2). If **no staff are assigned**, the system nudges the admin to assign staff.
- [ ] The urgent flag can be removed by admin, which reverses the visual highlighting.

---

#### US-5.7 · Blocked Task Workflow

| Field | Value |
|-------|-------|
| **Scope** | MVP |
| **Priority** | Must |
| **Dependencies** | US-3.3, US-5.3 |
| **SRS Ref** | MVP §4.6 |

**Story:** As a staff member, I want to mark a task as "Blocked — Awaiting Client Response" so that the allocated time slot is released and I can be assigned other work.

**Acceptance Criteria:**
- [ ] Staff can change any `In Progress` task to `Blocked — Awaiting Client Response`.
- [ ] When blocked, the task's allocated time slot is immediately released and appears as available on the admin scheduling grid.
- [ ] The administrator receives an **in-app notification** when time is freed due to a blocked task, including: staff member name, task name, case reference, and freed time slot details.
- [ ] The task remains on the task board with a distinct visual indicator (e.g., ⊘ icon, muted row colour).
- [ ] Blocked tasks appear in a dedicated **Blocked Tasks Pool** accessible to admins.
- [ ] Admin or staff can unblock the task, which changes status back to `In Progress` but does not automatically re-reserve a time slot — the admin must reschedule.

---

### Epic 6 — Staff Dashboard & Calendar

---

#### US-6.1 · Prioritised Staff Dashboard

| Field | Value |
|-------|-------|
| **Scope** | MVP |
| **Priority** | Must |
| **Dependencies** | US-3.1, US-5.3 |
| **SRS Ref** | MVP §2.2 |

**Story:** As a staff member, I want my dashboard to show my assigned tasks ordered by priority so that I always know what to work on next.

**Acceptance Criteria:**
- [ ] The dashboard lists all tasks assigned to the logged-in staff member.
- [ ] Tasks are auto-ordered by: (1) urgency flag, (2) deadline proximity, (3) task lifecycle position (earlier tasks first).
- [ ] The top task is visually highlighted as "Next Action."
- [ ] Each task row shows: task name, case reference, client name, deadline, urgency indicator, status.
- [ ] Only tasks from accepted cases are shown — pre-acceptance cases are invisible.

---

#### US-6.2 · Staff Day View Calendar

| Field | Value |
|-------|-------|
| **Scope** | MVP |
| **Priority** | Must |
| **Dependencies** | US-5.3, US-6.1 |
| **SRS Ref** | MVP §2.2 |

**Story:** As a staff member, I want a day view calendar showing my hour-by-hour schedule so that I can plan my work effectively.

**Acceptance Criteria:**
- [ ] The calendar displays the current day with hour-by-hour rows (within working hours).
- [ ] Scheduled tasks appear as blocks spanning their allocated duration.
- [ ] Staff see **only their own** schedule — no visibility into other staff members' calendars (see [ADR-0010](./adr/0010-staff-schedules-admin-only.md)).
- [ ] The current time is indicated by a horizontal line.
- [ ] The "next action" task is highlighted.
- [ ] Urgent tasks are visually distinct (red border or glow).
- [ ] Blocked tasks appear muted with a "Blocked" label.

---

#### US-6.3 · Staff Week View Calendar

| Field | Value |
|-------|-------|
| **Scope** | Advanced |
| **Priority** | Should |
| **Dependencies** | US-6.2 |
| **SRS Ref** | ADV §2.2 |

**Story:** As a staff member, I want a week view calendar showing all my tasks for the week so that I can plan ahead.

**Acceptance Criteria:**
- [ ] The calendar displays Mon–Fri (or configured working days) with scheduled tasks as blocks.
- [ ] Tasks are colour-coded by urgency (matching the task board palette).
- [ ] Clicking a task block navigates to the case detail view.
- [ ] Non-working days appear greyed out.

---

#### US-6.4 · Overall View (Monthly / Quarterly)

| Field | Value |
|-------|-------|
| **Scope** | Advanced |
| **Priority** | Could |
| **Dependencies** | US-6.3 |
| **SRS Ref** | ADV §2.3 |

**Story:** As a staff member, I want a monthly or quarterly view of my workload and deadlines so that I can manage long-term commitments.

**Acceptance Criteria:**
- [ ] The view displays a month grid (or quarter) with indicators for: days with tasks, days with deadlines, days with appointments.
- [ ] Clicking a day navigates to the day view.
- [ ] A summary panel shows: total upcoming tasks, upcoming deadlines, and overdue count.

---

### Epic 7 — In-App Notifications

---

#### US-7.1 · New Task Notification

| Field | Value |
|-------|-------|
| **Scope** | MVP |
| **Priority** | Must |
| **Dependencies** | US-5.3 |
| **SRS Ref** | MVP §5.1 |

**Story:** As a staff member, I want to receive an in-app notification when a new task is assigned to me so that I am aware of new work immediately.

**Acceptance Criteria:**
- [ ] When an admin assigns a task, the staff member receives an in-app notification within 5 seconds.
- [ ] The notification contains: task name, case reference, time allocated, scheduled start time, urgency level.
- [ ] A notification badge (unread count) appears on the notification bell icon in the header.
- [ ] Clicking the notification navigates to the relevant task or case.
- [ ] Notifications are persisted in a `notifications` table and viewable in a **notification centre** (scrollable history, ordered by time, most recent first).
- [ ] Read notifications are visually greyed out or muted. Unread notifications are styled prominently (bold text, coloured dot).
- [ ] A persistent unread indicator (badge with count) is displayed on the notification bell icon.

---

#### US-7.2 · Urgent Task Notification

| Field | Value |
|-------|-------|
| **Scope** | MVP |
| **Priority** | Must |
| **Dependencies** | US-5.6 |
| **SRS Ref** | MVP §5.2 |

**Story:** As a staff member, I want to receive a visually distinct urgent notification when a case is flagged as urgent so that I can reprioritise my work immediately.

**Acceptance Criteria:**
- [ ] Urgent notifications have a red background/highlight, bold text, and are visually distinct from standard notifications.
- [ ] Urgent notifications appear at the top of the notification list, above non-urgent items.
- [ ] The notification badge changes to indicate urgency (e.g., red badge instead of grey).
- [ ] The notification text explicitly states: "URGENT: [Case reference] has been flagged as urgent by [admin name]."
- [ ] Urgent notifications are sent **only to staff assigned to tasks within that case**, not all staff.
- [ ] If the case has **no assigned staff**, the system nudges the administrator to assign staff with a persistent visual prompt.
- [ ] Urgent notifications require explicit **acknowledgement** from the assigned staff member (separate from marking as read). The acknowledgement status and timestamp are visible to administrators.

---

#### US-7.3 · Overdue Task Alert

| Field | Value |
|-------|-------|
| **Scope** | MVP |
| **Priority** | Must |
| **Dependencies** | US-3.3 |
| **SRS Ref** | MVP §5.3 |

**Story:** As a staff member, I want to see a persistent visual alert when a task is overdue so that I know it needs immediate attention.

**Acceptance Criteria:**
- [ ] A task becomes `Overdue` when it exceeds its allocated end time without being marked `Completed` or having an approved extension.
- [ ] Overdue tasks display a persistent red indicator on: the staff dashboard, the day view calendar, and the task board.
- [ ] An in-app notification is generated when a task first becomes overdue.
- [ ] The overdue state persists until the task is completed or rescheduled by an admin.

---

#### US-7.4 · Enhanced Notification UX (Sound & Persist)

| Field | Value |
|-------|-------|
| **Scope** | Advanced |
| **Priority** | Could |
| **Dependencies** | US-7.1 |
| **SRS Ref** | ADV §5.1 |

**Story:** As a staff member, I want notifications to play a configurable sound and persist until I acknowledge them so that I never miss an important update.

**Acceptance Criteria:**
- [ ] A subtle sound plays when a new notification arrives (default on, configurable off in user settings).
- [ ] Notifications persist as unread until the staff member explicitly clicks "dismiss" or "mark as read."
- [ ] The notification badge count only decreases when notifications are explicitly acknowledged.

---

#### US-7.5 · Approaching Deadline Warnings

| Field | Value |
|-------|-------|
| **Scope** | Advanced |
| **Priority** | Should |
| **Dependencies** | US-7.1, US-3.3 |
| **SRS Ref** | ADV §5.2 |

**Story:** As a staff member, I want progressive warnings as a task approaches its deadline so that I can plan to complete it on time.

**Acceptance Criteria:**
- [ ] An in-app notification is generated 1 hour before the task's allocated end time.
- [ ] A second notification is generated 30 minutes before.
- [ ] Notifications are visually amber (approaching deadline colour).
- [ ] If the task is already completed, no warning is sent.

---

#### US-7.6 · Blocked Task Periodic Reminders

| Field | Value |
|-------|-------|
| **Scope** | Advanced |
| **Priority** | Should |
| **Dependencies** | US-5.7 |
| **SRS Ref** | ADV §5.3 |

**Story:** As a staff member, I want periodic reminders for tasks stuck in "Blocked" status so that I am prompted to follow up with the client.

**Acceptance Criteria:**
- [ ] After a task has been in `Blocked` status for 48 hours, a reminder notification is sent to the assigned staff member.
- [ ] Subsequent reminders are sent every 48 hours until the task is unblocked.
- [ ] Administrators receive a weekly aggregate report listing all tasks blocked for more than 5 days.

---

#### US-7.7 · Document Upload Approaching Alert (MVP)

| Field | Value |
|-------|-------|
| **Scope** | MVP |
| **Priority** | Must |
| **Dependencies** | US-3.1 (Tasks 11–13), US-7.1 |
| **SRS Ref** | MVP §3.2 (Tasks 12–13), [ADR-0007](./adr/0007-hybrid-amber-and-du-escalation.md) |

**Story:** As an administrator or staff member, I want to be notified when document upload (DU) is approaching so that the 3-working-day upload window is never missed.

**Acceptance Criteria:**
- [ ] When Task 11 (Appointment Booking) has an appointment date set, the system calculates the upload window: **3 working days before** the appointment (excluding weekends; public holidays excluded when timetable marks them off).
- [ ] At **3 working days before** the upload window: in-app notification to assigned staff and all administrators — "Document upload approaching for [case reference]."
- [ ] If Task 12 (Document Collection) or Task 13 (Document Review & Upload) remains incomplete after that point: **escalating urgency** each subsequent working day:
    - Repeat in-app notifications with increasing severity (warning → critical).
    - Task rows on the task board progress amber → red.
    - Administrators see escalated items in the notification centre.
- [ ] No alerts are sent once the relevant task is marked `Completed`.
- [ ] Full auto-scheduling of Task 13 and extended appointment safety net tiers (14/7/1-day) remain Advanced (US-12.x).

---

### Epic 8 — Staff Management & Leave

---

#### US-8.1 · Set Online Status

| Field | Value |
|-------|-------|
| **Scope** | MVP |
| **Priority** | Must |
| **Dependencies** | US-1.2 |
| **SRS Ref** | MVP §6.1 |

**Story:** As a staff member, I want to set my status to Online, On a Break, or Offline so that my administrator knows my current availability.

**Acceptance Criteria:**
- [ ] Staff can change their status via a dropdown in the header or profile.
- [ ] Status options: `Online`, `On a Break`, `Offline`.
- [ ] The current status is displayed with a colour-coded indicator (green/amber/grey) next to the staff member's name on all admin views.
- [ ] Status defaults to `Offline` on login; staff must manually set to `Online`.

---

#### US-8.2 · Request Leave

| Field | Value |
|-------|-------|
| **Scope** | Advanced |
| **Priority** | Should |
| **Dependencies** | US-8.1 |
| **SRS Ref** | ADV §6.2 |

**Story:** As a staff member, I want to request leave through the system so that my absence is formally recorded and my schedule is adjusted.

**Acceptance Criteria:**
- [ ] Staff can submit a leave request specifying: leave type (Holiday, Sick), start date, end date, and optional reason.
- [ ] The request is sent to the administrator for approval (status: `Pending`).
- [ ] Staff can view their own leave request history and remaining allowance.
- [ ] Staff cannot submit overlapping leave requests.

---

#### US-8.3 · Approve / Reject Leave

| Field | Value |
|-------|-------|
| **Scope** | Advanced |
| **Priority** | Should |
| **Dependencies** | US-8.2 |
| **SRS Ref** | ADV §6.2 |

**Story:** As an administrator, I want to approve or reject leave requests so that I can manage team availability.

**Acceptance Criteria:**
- [ ] Admin views a list of pending leave requests.
- [ ] Admin can **Approve** — the leave days are automatically blocked out (greyed) on the scheduling grid. Any tasks already scheduled in those slots trigger a conflict warning.
- [ ] Admin can **Reject** — the staff member is notified with the reason.
- [ ] If the leave exceeds the staff member's remaining allowance, a warning is displayed. The admin can still approve and mark the excess as "approved (paid)" or "salary deduction."

---

#### US-8.4 · Configurable Leave Allowances

| Field | Value |
|-------|-------|
| **Scope** | Advanced |
| **Priority** | Should |
| **Dependencies** | US-8.2 |
| **SRS Ref** | ADV §6.2 |

**Story:** As an administrator, I want to configure leave allowances and accrual rules so that the system accurately tracks each staff member's entitlement.

**Acceptance Criteria:**
- [ ] Admin can set per-staff-member allowances: holiday days per year, sick days per year.
- [ ] Admin can configure accrual rules: e.g., 1 day per month, front-loaded annually, or custom.
- [ ] The system calculates remaining allowance = total accrued − days used.
- [ ] Staff can view their current allowance balance on their profile.
- [ ] Allowances reset on a configurable anniversary date (e.g., January 1 or employment start date).

---

#### US-8.5 · Admin Daily Team View

| Field | Value |
|-------|-------|
| **Scope** | MVP |
| **Priority** | Must |
| **Dependencies** | US-5.1, US-8.1 |
| **SRS Ref** | MVP §6.3 |

**Story:** As an administrator, I want a single page showing all staff members with their status, active cases, and assigned tasks so that I can monitor the team at a glance.

**Acceptance Criteria:**
- [ ] The page lists all active staff members.
- [ ] For each staff member, the view shows: online status indicator, total active case count, count of tasks due today, count of overdue tasks, count of blocked tasks.
- [ ] Clicking a staff member navigates to their schedule or profile.

> **Phase 2 (Advanced):** Staff on approved leave are shown with an "On Leave" badge. See US-8.3.

---

#### US-8.6 · Status Change Logging

| Field | Value |
|-------|-------|
| **Scope** | Advanced |
| **Priority** | Could |
| **Dependencies** | US-8.1 |
| **SRS Ref** | ADV §6.1 |

**Story:** As the system, I want to log all online status changes so that administrators can review availability patterns.

**Acceptance Criteria:**
- [ ] Every status change (Online → Break → Offline, etc.) is recorded with: staff ID, old status, new status, timestamp.
- [ ] Admins can view a status change log per staff member.

---

#### US-8.7 · Staff Profiles (Admin View)

| Field | Value |
|-------|-------|
| **Scope** | Advanced |
| **Priority** | Should |
| **Dependencies** | US-8.5 |
| **SRS Ref** | ADV §6.3 |

**Story:** As an administrator, I want to access a detailed staff profile showing real-time case progress, blocked items, and overdue tasks so that I can assess individual performance.

**Acceptance Criteria:**
- [ ] The profile page shows: online status, total active cases (with list), all assigned tasks grouped by case, progress percentage per case, blocked tasks, overdue tasks.
- [ ] The page includes a mini-schedule showing the staff member's next 3 days.
- [ ] Admin can navigate to any listed case or task directly from the profile.

---

### Epic 9 — Search & Filtering

---

#### US-9.1 · Global Search

| Field | Value |
|-------|-------|
| **Scope** | MVP |
| **Priority** | Must |
| **Dependencies** | US-2.4 |
| **SRS Ref** | MVP §3.6 |

**Story:** As an administrator or staff member, I want to search for cases so that I can quickly find what I need.

**Acceptance Criteria:**
- [ ] A search bar is accessible from all pages (persistent in the header).
- [ ] Search supports: case reference number, client name (partial match), case status, assigned staff member name, urgency level, blocked status.
- [ ] Results are displayed in a dropdown as the user types (minimum 2 characters).
- [ ] Clicking a result navigates to the case detail page.
- [ ] Staff search results are limited to cases they are assigned to (RLS enforced).
- [ ] Search returns results within 500ms for up to 1,000 cases.

---

#### US-9.2 · Admin Team Calendar Views (Weekly & Monthly)

| Field | Value |
|-------|-------|
| **Scope** | Advanced |
| **Priority** | Should |
| **Dependencies** | US-5.4 |
| **SRS Ref** | ADV §6.3 |

**Story:** As an administrator, I want weekly and monthly team calendar views so that I can plan capacity across longer time horizons.

**Acceptance Criteria:**
- [ ] **Weekly view**: all staff displayed with their scheduled tasks across Mon–Fri.
- [ ] **Monthly view**: a calendar grid with day-level indicators (count of tasks per person, leave days).
- [ ] Both views allow clicking into a specific day to access the day view (US-5.4).

---

### Epic 10 — Security & Data Integrity

---

#### US-10.1 · Soft-Delete All Records

| Field | Value |
|-------|-------|
| **Scope** | MVP |
| **Priority** | Must |
| **Dependencies** | None |
| **SRS Ref** | MVP §7.2 |

**Story:** As the system, I want all deletions to be soft-deletes so that no data is permanently lost by accident.

**Acceptance Criteria:**
- [ ] Every table with user-deletable records has an `is_deleted` boolean column and a `deleted_at` timestamp.
- [ ] RLS policies and application queries filter out `is_deleted = true` rows by default.
- [ ] Admins can access an "Archive" view to see soft-deleted records.
- [ ] Permanent purge is a separate admin action, available only for records older than the retention period (default: **90 days**). See [ADR-0011](./adr/0011-ninety-day-purge-retention.md).

---

#### US-10.2 · Mandatory Field Enforcement

| Field | Value |
|-------|-------|
| **Scope** | MVP |
| **Priority** | Must |
| **Dependencies** | US-2.4 |
| **SRS Ref** | MVP §7.2 |

**Story:** As the system, I want to enforce that critical fields cannot be left blank after case acceptance so that data integrity is maintained.

**Acceptance Criteria:**
- [ ] After a case is accepted, the following fields are mandatory and cannot be cleared: client name.
- [ ] Once set, the following fields cannot be cleared: appointment date, last date.
- [ ] Attempting to save with missing mandatory fields displays a validation error listing the missing fields.
- [ ] Validation is enforced at both the frontend and the API/database level (not-null constraints + check constraints).

---

#### US-10.3 · Auto-Save

| Field | Value |
|-------|-------|
| **Scope** | MVP |
| **Priority** | Must |
| **Dependencies** | None |
| **SRS Ref** | MVP §7.2 |

**Story:** As a user, I want all in-progress edits to be automatically saved so that no data is lost due to browser crashes or accidental navigation.

**Acceptance Criteria:**
- [ ] All form fields auto-save after a 1-second debounce following the last keystroke.
- [ ] A visual indicator (e.g., "Saving..." → "Saved ✓") confirms the save state.
- [ ] If auto-save fails (network error), a persistent warning banner appears: "Changes not saved — please check your connection."
- [ ] Navigation away from a page with unsaved changes triggers a browser confirmation dialog.

---

#### US-10.4 · Responsive Design

| Field | Value |
|-------|-------|
| **Scope** | MVP |
| **Priority** | Must |
| **Dependencies** | All UI stories |
| **SRS Ref** | MVP §7.3 |

**Story:** As a user on a mobile device, I want the application to be fully functional and usable so that I can work from any BYOD device.

**Acceptance Criteria:**
- [ ] All pages are usable on screens from 375px (mobile) to 1920px (desktop).
- [ ] The task board switches to a single-column scrollable layout on mobile.
- [ ] Navigation uses a hamburger menu on mobile.
- [ ] Touch targets are at least 44×44px.
- [ ] The calendar views adapt to the available screen width without horizontal scrolling.

---

#### US-10.5 · Completion Reversal Control

| Field | Value |
|-------|-------|
| **Scope** | Advanced |
| **Priority** | Should |
| **Dependencies** | US-3.3 |
| **SRS Ref** | ADV §8.2 |

**Story:** As an administrator, I want to reverse a task's "Completed" status with a logged reason so that accidental completions can be corrected with accountability.

**Acceptance Criteria:**
- [ ] Only admins can reverse a `Completed` task back to `In Progress`.
- [ ] A modal requires the admin to enter a reason for the reversal.
- [ ] The reversal and reason are logged in the audit trail with a timestamp.
- [ ] The case checklist and task board update accordingly.

---

#### US-10.6 · Full Change History

| Field | Value |
|-------|-------|
| **Scope** | Advanced |
| **Priority** | Should |
| **Dependencies** | US-10.1 |
| **SRS Ref** | ADV §8.3 |

**Story:** As an administrator, I want to view the complete change history of any task or case so that I can see who changed what and when.

**Acceptance Criteria:**
- [ ] Every edit to a task or case (status change, date change, reassignment, note edit, field update) creates an audit record containing: field name, old value, new value, user ID, timestamp.
- [ ] The change history is viewable on the case detail page in a collapsible "History" section.
- [ ] History records are immutable — they cannot be edited or deleted.

---

### Epic 11 — Advanced Scheduling & Automation

---

#### US-11.1 · Admin Manual Priority Reordering

| Field | Value |
|-------|-------|
| **Scope** | Advanced |
| **Priority** | Should |
| **Dependencies** | US-6.1 |
| **SRS Ref** | ADV §2.1, §4.2 |

**Story:** As an administrator, I want to manually reorder any staff member's priority list so that I can override the auto-calculated order for exceptional situations.

**Acceptance Criteria:**
- [ ] Admin navigates to a staff member's priority queue and can drag-and-drop tasks to reorder.
- [ ] Manually ordered tasks display a "Manual Override" badge.
- [ ] Auto-priority recalculation does not override manually set positions unless the admin resets to auto.
- [ ] Admin can click "Reset to Auto-Priority" to revert to the system-calculated order.

---

#### US-11.2 · Urgent Flag Auto-Reshuffling

| Field | Value |
|-------|-------|
| **Scope** | Advanced |
| **Priority** | Should |
| **Dependencies** | US-5.6, US-6.1 |
| **SRS Ref** | ADV §4.3 |

**Story:** As the system, I want to automatically reshuffle affected staff priority lists when a case is flagged as urgent so that urgent tasks surface to the top without manual intervention.

**Acceptance Criteria:**
- [ ] When a case is flagged urgent, all tasks belonging to that case are promoted to the top of each assigned staff member's priority list.
- [ ] The reshuffling occurs within 5 seconds of the flag being set.
- [ ] If a staff member had manually overridden their priority order, the urgent tasks still surface to the top but a notification informs the admin that a manual override was adjusted.

---

#### US-11.3 · Timezone Intelligence

| Field | Value |
|-------|-------|
| **Scope** | Advanced |
| **Priority** | Should |
| **Dependencies** | US-5.2, US-5.4 |
| **SRS Ref** | ADV §4.4 |

**Story:** As the system, I want to automatically handle timezone differences so that UK and India-based team members each see schedules in their local time.

**Acceptance Criteria:**
- [ ] Each user profile stores a timezone setting (auto-detected on first login, manually overridable).
- [ ] All schedule views display times in the viewer's local timezone.
- [ ] When an admin in the UK assigns a task at 14:00 UK time, a staff member in India sees it at 18:30 IST.
- [ ] All database timestamps are stored in UTC.

---

#### US-11.4 · Task Extension Workflow

| Field | Value |
|-------|-------|
| **Scope** | Advanced |
| **Priority** | Should |
| **Dependencies** | US-5.3 |
| **SRS Ref** | ADV §4.6 |

**Story:** As a staff member, I want to request additional time for a task so that my schedule adjusts formally rather than me simply overrunning.

**Acceptance Criteria:**
- [ ] Staff clicks "Request Extension" on an active task.
- [ ] Staff enters: reason (required) and additional time needed (in minutes, minimum 15).
- [ ] The admin receives an in-app notification with the request details.
- [ ] Admin can **Approve** (the task's end time extends, subsequent tasks shift) or **Deny** (staff is notified, no change).
- [ ] All extension requests are logged: task ID, staff ID, reason, requested amount, outcome, timestamp.

---

#### US-11.5 · Extension Reporting

| Field | Value |
|-------|-------|
| **Scope** | Advanced |
| **Priority** | Could |
| **Dependencies** | US-11.4 |
| **SRS Ref** | ADV §4.6 |

**Story:** As an administrator, I want to view reports on task extensions so that I can identify which staff or task types frequently overrun.

**Acceptance Criteria:**
- [ ] Admin can access an "Extensions Report" showing: total extensions per staff member, total extensions per task type, average extra time requested, approval rate.
- [ ] The report supports filtering by date range and staff member.

---

#### US-11.6 · Blocked Task Analytics

| Field | Value |
|-------|-------|
| **Scope** | Advanced |
| **Priority** | Should |
| **Dependencies** | US-5.7 |
| **SRS Ref** | ADV §4.7 |

**Story:** As an administrator, I want analytics on blocked tasks so that I can identify problematic clients and bottlenecks.

**Acceptance Criteria:**
- [ ] The system tracks per task: number of times blocked, total cumulative blocked duration.
- [ ] The system tracks per case: total blocked time across all tasks.
- [ ] An admin report lists: most-blocked cases, average blocked duration by task type, clients with the most blocked tasks.
- [ ] The report supports filtering by date range.

---

#### US-11.7 · Pending Cases Pool with Bulk-Assign

| Field | Value |
|-------|-------|
| **Scope** | Advanced |
| **Priority** | Should |
| **Dependencies** | US-2.4, US-5.3 |
| **SRS Ref** | ADV §4.5 |

**Story:** As an administrator, I want a dedicated view of all unassigned cases with bulk-assign capability so that I can efficiently distribute work.

**Acceptance Criteria:**
- [ ] A "Pending Pool" page lists all cases with at least one unassigned task.
- [ ] Each entry shows: case reference, client name, application type, number of unassigned tasks, urgency flag.
- [ ] Admin can select multiple cases and bulk-assign all their unassigned tasks to a single staff member.
- [ ] Bulk assignment respects conflict prevention (US-5.5) — if a conflict is detected, the operation halts and identifies the conflicting items.

---

### Epic 12 — Appointment Safety Net

---

#### US-12.1 · Document Upload Auto-Scheduling

| Field | Value |
|-------|-------|
| **Scope** | Advanced |
| **Priority** | Should |
| **Dependencies** | US-3.1 (Task 11, 13) |
| **SRS Ref** | ADV §4.8 |

**Story:** As the system, I want to automatically schedule Task 13 (Document Review & Upload) three working days before the appointment so that the upload window is never missed.

**Acceptance Criteria:**
- [ ] When an appointment date is set on Task 11, the system calculates 3 working days prior (excluding weekends and any configured public holidays).
- [ ] Task 13 is automatically scheduled to start on that calculated date.
- [ ] If the assigned staff member is unavailable on that date (leave, fully booked), the system alerts the admin to manually reschedule.
- [ ] If the appointment date is changed, Task 13's schedule is automatically recalculated.

---

#### US-12.2 · Document Collection Escalating Alerts

| Field | Value |
|-------|-------|
| **Scope** | Advanced |
| **Priority** | Should |
| **Dependencies** | US-12.1 |
| **SRS Ref** | ADV §4.8 |

**Story:** As the system, I want to send escalating alerts if document collection is not complete before the upload window so that there is sufficient warning to act.

**Acceptance Criteria:**
- [ ] Alert at 7 days before the upload window: information-level notification to assigned staff.
- [ ] Alert at 3 days before: warning-level notification to staff and admin.
- [ ] Alert at 1 day before: critical notification to staff and admin.
- [ ] No alerts are sent if Task 12 (Document Collection) is already marked `Completed`.

---

#### US-12.3 · Live Appointment Countdown

| Field | Value |
|-------|-------|
| **Scope** | Advanced |
| **Priority** | Could |
| **Dependencies** | US-3.1 (Task 11) |
| **SRS Ref** | ADV §4.9.1 |

**Story:** As a user, I want to see a live countdown showing working days until the appointment so that the urgency is always visible.

**Acceptance Criteria:**
- [ ] Once Task 11 has an appointment date, a countdown badge appears on: the case checklist, the task board row, and the staff calendar.
- [ ] The countdown shows working days remaining (not calendar days).
- [ ] At 0 days (appointment day), the badge shows "TODAY" in red.

---

#### US-12.4 · Progressive Appointment Alert Escalation

| Field | Value |
|-------|-------|
| **Scope** | Advanced |
| **Priority** | Should |
| **Dependencies** | US-12.1 |
| **SRS Ref** | ADV §4.9.3 |

**Story:** As the system, I want to send progressive alerts as the appointment approaches so that nothing falls through the cracks.

**Acceptance Criteria:**
- [ ] 14 days before: information alert to staff.
- [ ] 7 days before: warning alert to staff and admin.
- [ ] 3 working days before (upload window): critical alert to staff and admin.
- [ ] 1 working day before: emergency alert to admin only.
- [ ] Morning of appointment: final confirmation alert — admin must acknowledge.
- [ ] Alerts are not sent for tasks that are already completed.

---

#### US-12.5 · Pre-Appointment Completion Confirmation

| Field | Value |
|-------|-------|
| **Scope** | Advanced |
| **Priority** | Should |
| **Dependencies** | US-12.4 |
| **SRS Ref** | ADV §4.9.4 |

**Story:** As an administrator, I want to perform a final confirmation check before the appointment so that I can verify all prerequisites are met.

**Acceptance Criteria:**
- [ ] The system presents a confirmation checklist: Task 12 completed ✓, Task 13 completed ✓, appointment details confirmed (date, time, location).
- [ ] The admin or senior staff member must explicitly confirm each item.
- [ ] The confirmation is recorded in the audit trail with timestamp and user.
- [ ] If any prerequisite is not met, the system blocks confirmation and highlights the outstanding items.

---

### Epic 13 — Overtime Tracking & Reporting

---

#### US-13.1 · Automated Overtime Detection

| Field | Value |
|-------|-------|
| **Scope** | Advanced |
| **Priority** | Should |
| **Dependencies** | US-5.2 |
| **SRS Ref** | ADV §7.1 |

**Story:** As the system, I want to automatically detect when a task is scheduled outside a staff member's working hours so that overtime is flagged without manual tracking.

**Acceptance Criteria:**
- [ ] When an admin assigns a task to a time slot outside the staff member's configured timetable, the task is automatically tagged as `is_overtime = true`.
- [ ] The overtime flag is visible on the scheduling grid (e.g., a distinct border or icon).
- [ ] The assignment flow warns the admin: "This task falls outside [staff name]'s working hours and will be classified as overtime."

---

#### US-13.2 · Overtime Proposal & Approval

| Field | Value |
|-------|-------|
| **Scope** | Advanced |
| **Priority** | Should |
| **Dependencies** | US-13.1 |
| **SRS Ref** | ADV §7.2 |

**Story:** As an administrator, I want to include a compensation proposal when assigning overtime so that the staff member can accept or reject it.

**Acceptance Criteria:**
- [ ] When assigning an overtime task, the admin must enter: compensation amount (£) or rate (£/hour).
- [ ] The staff member receives a notification with the overtime proposal details.
- [ ] Staff can **Accept** (task is confirmed) or **Reject** (admin is notified, task remains unconfirmed).
- [ ] Rejected overtime proposals remain visible to the admin for renegotiation.

---

#### US-13.3 · Staff Earnings Dashboard

| Field | Value |
|-------|-------|
| **Scope** | Advanced |
| **Priority** | Should |
| **Dependencies** | US-13.2 |
| **SRS Ref** | ADV §7.3 |

**Story:** As a staff member, I want to view my accumulated overtime hours and expected compensation for the current month so that I can track my earnings.

**Acceptance Criteria:**
- [ ] A "My Earnings" section on the staff profile shows: total overtime hours (current month), total expected compensation, breakdown by date and task.
- [ ] Only accepted (not rejected) overtime is included in the totals.
- [ ] Data refreshes in real time as new overtime tasks are completed.

---

#### US-13.4 · Monthly Overtime Reporting (Admin)

| Field | Value |
|-------|-------|
| **Scope** | Advanced |
| **Priority** | Should |
| **Dependencies** | US-13.1 |
| **SRS Ref** | ADV §7.4 |

**Story:** As an administrator, I want monthly reports showing total regular and overtime hours per staff member so that I can manage payroll.

**Acceptance Criteria:**
- [ ] The report displays: staff name, total regular hours, total overtime hours, total compensation, for the selected month.
- [ ] Admin can select any past month to view.
- [ ] The report includes a summary row with team totals.

---

#### US-13.5 · CSV Data Export

| Field | Value |
|-------|-------|
| **Scope** | Advanced |
| **Priority** | Should |
| **Dependencies** | US-13.4 |
| **SRS Ref** | ADV §7.5 |

**Story:** As an administrator, I want to export reports to CSV so that I can send the data to external payroll systems.

**Acceptance Criteria:**
- [ ] An "Export CSV" button is available on: the monthly overtime report, the task completion report, and the scheduling report.
- [ ] The CSV includes all visible columns with proper headers.
- [ ] The file is named with the report type and date range (e.g., `overtime_july_2026.csv`).
- [ ] The export completes within 10 seconds for up to 12 months of data.

---

## 5. Assumptions

1. **Single-tenant deployment** — the system serves one firm. Multi-tenancy is not required.
2. **No payment gateway integration** — "Application Payment" (Task 10) tracks whether payment was collected, not the transaction itself.
3. **No document storage** — all documents live in Google Docs/Drive/email. The system only tracks whether documents have been collected/uploaded.
4. **Working days = Monday–Saturday** by default unless a staff member's timetable specifies otherwise. The 6-day week (Mon–Sat, 09:00–17:00) is the firm's standard operating schedule.
5. **Public holidays** are not automatically handled in MVP — admins mark non-working days via staff timetable configuration. Phase 2 leave management and a future holiday calendar may automate this.
6. **"Senior" is a staff sub-role**, not a separate role — seniors have staff-level data access but can be assigned to Task 8 (Senior Review). The database uses a three-value enum: `admin`, `staff`, `senior`.

---

## 6. Open Questions

| # | Question | Impact | Status |
|---|----------|--------|--------|
| OQ-1 | Should Task 8 (Senior Review) loop back to Task 5 indefinitely until approved, or is there a maximum number of revision cycles? | US-3.5 — determines whether to cap revision loops | **Resolved** — Unlimited loops; admin alerted after 3 revisions (configurable). See [ADR-0006](./adr/0006-task-8-unlimited-revisions-with-admin-alert.md). |
| OQ-2 | What is the exact logic for "approaching deadline" colour (amber)? Is it a fixed number of days (e.g., 3) or a percentage of the allocated time? | US-4.2 — determines amber threshold | **Resolved** — Hybrid (3 calendar days OR 50% time elapsed). DU uses 3 working days + escalation. See [ADR-0007](./adr/0007-hybrid-amber-and-du-escalation.md). |
| OQ-3 | When a case is flagged urgent, should all 13 tasks turn red or only the tasks currently in progress / not started? | US-5.6, US-4.2 — visual scope of urgency | **Resolved** — Active tasks only (in progress + not started). See [ADR-0008](./adr/0008-urgent-flag-active-tasks-only.md). |
| OQ-4 | Should leave requests support half-day leave, or only full days? | US-8.2 — form design and allowance calculation | **Resolved** — Full days only at Phase 2 launch. Half-day deferred to Future phase. |
| OQ-5 | Is there a concept of "public holidays" that should auto-block all staff schedules, or are holidays handled per-individual via leave? | US-5.2, US-12.1 — working day calculation | **Resolved** — Per-individual via leave in Phase 2. MVP uses timetable. See [ADR-0001](./adr/0001-leave-management-deferred-to-phase-2.md). |
| OQ-6 | For the automated reference format (`MMYYNO/TYPE/ABC`), should the sequential number be global across all types or per-type within the month? | US-2.3 — reference uniqueness | **Resolved** — Global per month. Editable with conflict-aware sync. See [ADR-0009](./adr/0009-global-reference-counter-with-edit-sync.md). |
| OQ-7 | Should staff be able to view other staff members' schedules (read-only), or is that strictly admin-only? | US-5.4, US-6.2 — access scope | **Resolved** — Admin only. Staff see own schedule. See [ADR-0010](./adr/0010-staff-schedules-admin-only.md). |
| OQ-8 | What configurable retention period should be the default for permanent purge of soft-deleted records — 30, 60, or 90 days? | US-10.1 — data retention policy | **Resolved** — 90 days default. See [ADR-0011](./adr/0011-ninety-day-purge-retention.md). |

---

## 7. Story Summary

| Scope | Must | Should | Could | Total |
|-------|:----:|:------:|:-----:|:-----:|
| **MVP** | 31 | 1 | 0 | **32** |
| **Advanced** | 0 | 18 | 4 | **22** |
| **Total** | **31** | **19** | **4** | **54** |

---

*— End of Document —*
