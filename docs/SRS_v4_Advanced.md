# Software Requirements Specification — Advanced (Phase 2)

**Project Title:** Team Scheduling & Task Management System  
**Document Version:** 4.0-ADV  
**Date:** 4 July 2026  
**Status:** Approved  
**Source:** Split from original SRS v4.0 (July 2026). Canonical parent document removed at implementation handoff.  
**Prerequisite:** [SRS_v4_MVP.md](./SRS_v4_MVP.md) must be fully implemented before these features are developed.

---

## Revision History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 4.0-ADV | 04/07/2026 | — | Advanced features extraction from SRS v4.0 — Phase 2 enhancements to be built on top of the MVP |

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Enhanced Roles & Access Management](#2-enhanced-roles--access-management)
3. [Enhanced Case & Task Management](#3-enhanced-case--task-management)
4. [Advanced Scheduling & Automation](#4-advanced-scheduling--automation)
5. [Advanced Notifications & Engagement](#5-advanced-notifications--engagement)
6. [Enhanced Staff Management & Leave](#6-enhanced-staff-management--leave)
7. [Overtime Tracking & Reporting](#7-overtime-tracking--reporting)
8. [Enhanced Security & Audit](#8-enhanced-security--audit)

---

## 1. Introduction

### 1.1 Purpose

This document defines the **Phase 2 (Advanced)** features for the Team Scheduling & Task Management application. These features enhance the MVP with deeper automation, analytics, real-time capabilities, and workflow refinements. They should be implemented **after** the MVP is stable and in active use.

### 1.2 Dependency

All features in this document assume the MVP ([SRS_v4_MVP.md](./SRS_v4_MVP.md)) is fully functional.

### 1.3 Notifications Policy

All notifications across this document remain **in-app only**. SMS and email notification channels are explicitly excluded from this phase and would be considered a future Phase 3 if ever needed.

---

## 2. Enhanced Roles & Access Management

*Builds on MVP Section 2.*

### 2.1 Admin Priority List Editing

Administrators can view and edit each staff member's priority list — reordering tasks via drag-and-drop, applying urgency flags, or overriding automatically calculated priorities. This gives admins fine-grained control beyond the auto-calculated priority queue delivered in the MVP.

*Original ref: SRS v4 §2.1*

### 2.2 Week View Calendar

The staff dashboard gains a **Week View** — a weekly overview of all scheduled tasks with colour-coded urgency indicators. This supplements the Day View delivered in the MVP.

*Original ref: SRS v4 §2.2*

### 2.3 Overall View (Monthly / Quarterly)

A high-level **monthly or quarterly view** of workload and upcoming deadlines. This provides strategic planning capability for both staff and administrators.

*Original ref: SRS v4 §2.2*

---

## 3. Enhanced Case & Task Management

*Builds on MVP Section 3.*

### 3.1 Fee Agreement Recording

Initial fee agreements may optionally be recorded at the lead stage, prior to case acceptance. This allows administrators to track expected revenue from the earliest stage of the pipeline.

*Original ref: SRS v4 §3.1*

### 3.2 Enhanced Task Board Colours

Additional colour-coded row statuses for the tracker view:

| Colour | Meaning |
|--------|---------|
| **Teal / Highlighted** | Elevated priority (administrator-flagged) |
| **Grey** | Separator rows for visual grouping (e.g., by week, batch, or priority tier) |

*Original ref: SRS v4 §3.4.2*

### 3.3 Drag-and-Drop Task Reordering

Tasks on the task board can be **reordered via drag-and-drop** or by administrator priority override. This replaces manual priority numbering used in the MVP.

*Original ref: SRS v4 §3.4.3*

### 3.4 Real-Time Live Updates

The tracker updates in **real time** — when a task is completed, blocked, or rescheduled, the board reflects the change instantly without requiring a page refresh. Powered by Supabase Realtime subscriptions.

*Original ref: SRS v4 §3.4.3*

### 3.5 Advanced Filtering & Grouping

Administrators can filter the task board by staff member, task type, urgency level, deadline range, or blocked status. Grouping options include by week, by staff member, or by case. This extends the basic search delivered in the MVP.

*Original ref: SRS v4 §3.4.3*

### 3.6 Bulk Actions

Selecting multiple tasks and reassigning, reprioritising, or flagging them as urgent in a single operation. This improves administrative efficiency for large-scale workload management.

*Original ref: SRS v4 §3.4.3*

### 3.7 Linked Cases

The system supports linking related cases — for example, when a client requires a follow-up service, the new case is clearly linked to the client's previous applications. This provides full client history visibility.

*Original ref: SRS v4 §3.5*

---

## 4. Advanced Scheduling & Automation

*Builds on MVP Section 4.*

### 4.1 Automatic Overtime Classification

Any tasks assigned **outside** a staff member's configured working hours are automatically classified as **overtime**. For example, if a staff member's timetable is set to 09:00–17:00, any task scheduled before 09:00 or after 17:00 is flagged as overtime.

*Original ref: SRS v4 §4.1*

### 4.2 Admin Manual Priority Reordering

Administrators can **manually edit and reorder** any staff member's priority list at any time — overriding the auto-calculated order for exceptional circumstances.

*Original ref: SRS v4 §4.2*

### 4.3 Urgent Flag Auto-Reshuffling

When an administrator flags a case as **Urgent**, the priority lists of all affected staff are **immediately and automatically reshuffled**. This eliminates the need for manual communication of priority changes.

*Original ref: SRS v4 §4.2*

### 4.4 Timezone Intelligence

The system automatically handles diverse timezones (e.g., UK and India) so that administrators always view schedules in their local time. Staff in different timezones see tasks in their own local time without manual conversion.

*Original ref: SRS v4 §4.4*

### 4.5 Pending Cases Pool with Bulk-Assign

Administrators have a dedicated view of all unassigned or pending cases, with the ability to bulk-assign or individually allocate tasks from a single consolidated pool.

*Original ref: SRS v4 §4.5*

### 4.6 Task Extension Workflow

When a staff member requires more time than originally allocated:

1. The staff member clicks **"Request Extension"** on the active task.
2. The staff member enters a reason and the amount of additional time requested.
3. The administrator receives a real-time in-app notification and can **Approve** or **Deny** the request.
4. If approved, the task's time slot is extended and the staff member's schedule auto-adjusts accordingly.
5. All extensions are logged — administrators can generate reports on which staff members or task types frequently overrun.

*Original ref: SRS v4 §4.6*

### 4.7 Blocked Task Analytics

The system tracks:
* The number of times each task has been blocked or rescheduled.
* Total wait time per case (for reporting purposes and to identify problematic clients).
* When a client responds, the staff member or administrator **reschedules** the task to a new available time slot via a streamlined workflow.

*Original ref: SRS v4 §4.7*

### 4.8 Document Upload Auto-Scheduling

When an appointment date is set (Task 11 — Appointment Booking), the system **automatically schedules Task 13 (Document Review & Upload) for three working days before the appointment**.

The system alerts staff if document collection (Task 12) has not been completed in time for the upload window to commence. Escalating alerts are dispatched:
* Seven days before the upload window opens.
* Three days before.
* One day before.

*Original ref: SRS v4 §4.8*

### 4.9 Appointment & Critical Deadline Safety Net

#### 4.9.1 Countdown & Visibility

Once an appointment is booked, a **live countdown** is displayed on the case checklist, the task board, and the staff calendar — showing exactly how many working days remain until the appointment. The appointment date is **prominently pinned** at the top of the case view.

*Original ref: SRS v4 §4.9.1*

#### 4.9.2 Automated Prerequisite Enforcement

The system enforces a **dependency chain:** before the appointment date, Tasks 12 (Document Collection) and 13 (Document Review & Upload) must be completed. If Task 12 is not marked complete by the time the three-working-day upload window is due to begin, the system:

* Sends an **urgent escalation** to the assigned staff member and administrator.
* Flags the case as **At Risk** on the task board and all dashboards.
* Blocks Task 13 from being marked as complete until Task 12 is resolved.

*Original ref: SRS v4 §4.9.2*

#### 4.9.3 Progressive Alert Escalation

| Trigger | Alert Level | Recipients |
|---------|-------------|------------|
| 14 days before appointment | Information — gentle reminder | Assigned staff |
| 7 days before appointment | Warning — ensure documents are collected | Assigned staff and administrator |
| 3 working days before appointment (upload window opens) | Critical — upload must begin | Assigned staff and administrator |
| 1 working day before appointment | Emergency — final check | Administrator (direct notification) |
| Morning of appointment day | Final confirmation required | Administrator (must acknowledge) |

*Original ref: SRS v4 §4.9.3*

#### 4.9.4 Completion Confirmation

Before the appointment date, the system requires a **final confirmation check** — the administrator or a senior staff member must explicitly confirm that:
* All documents have been collected (Task 12 ✓)
* All documents have been reviewed and uploaded (Task 13 ✓)
* Appointment details are confirmed (date, time, location)

This final confirmation is recorded in the audit trail.

*Original ref: SRS v4 §4.9.4*

#### 4.9.5 Last Date / Expiry Date Escalation

Cases may have a **"Last Date"** (an absolute deadline — e.g., visa expiry). The system escalates progressively if an appointment has not been booked and the last date is approaching — following the same alert pattern described in §4.9.3. The task board supports filtering and sorting by "last date" to surface the most time-critical cases first.

*Original ref: SRS v4 §4.9.5*

### 4.10 Extended Staff Calendar Views

Staff members can access weekly and overall (monthly/quarterly) task itineraries through the calendar productivity view, supplementing the Day View delivered in the MVP. The calendar highlights: **next action**, **urgent items**, **approaching deadlines**, and **blocked tasks**.

*Original ref: SRS v4 §4.10*

---

## 5. Advanced Notifications & Engagement

*Builds on MVP Section 5. All notifications remain in-app only.*

### 5.1 Enhanced Notification UX

New task notifications gain **configurable sound alerts** and **persist until acknowledged** (badge remains visible until the staff member explicitly dismisses it).

*Original ref: SRS v4 §5.1*

### 5.2 Approaching Deadline Warnings

Staff receive progressive warnings as a task approaches its allocated end time:
* One hour before the deadline.
* Thirty minutes before the deadline.

*Original ref: SRS v4 §5.3*

### 5.3 Blocked Task Periodic Reminders

Periodic in-app reminders are sent for tasks that have been in **Blocked** status for an extended period, prompting staff to follow up with the client. Administrators receive aggregate reports on long-blocked tasks.

*Original ref: SRS v4 §5.4*

### 5.4 Psychology-Driven Design

Notifications should cultivate a sense of **momentum and purpose** — not anxiety:
* Use warm, motivating language (e.g., "You have a new task ready — let's keep the momentum going.").
* Colour-coding must be consistent and intuitive: green (on track), amber (approaching deadline), red (overdue/urgent).
* The notification centre should surface **positive reinforcement** (e.g., "3 tasks completed today — great progress.").

*Original ref: SRS v4 §5.5*

---

## 6. Enhanced Staff Management & Leave

*Builds on MVP Section 6.*

### 6.1 Status Change Logging

All online status changes (Online, Break, Offline) are logged in the database for reporting and accountability purposes.

*Original ref: SRS v4 §6.1*

### 6.2 Leave Management

> **Note:** Leave Management is a Phase 2 feature. It was moved from the MVP scope to Advanced to prioritise core scheduling and task management in the initial release.

Staff can request leave through the system. Upon administrator approval, the corresponding days are automatically blocked out (greyed out) on the scheduling grid.

* **Leave Request Workflow:** Staff submit leave requests specifying: leave type (Holiday, Sick), start date, end date, and optional reason. Requests go to the administrator for approval. Staff cannot submit overlapping leave requests.
* **Leave Allowances:** The system supports configurable allowances (e.g., 12 days of holiday and 12 days of sick leave per year, accruing at one day per month). Administrators have full authority to customise these accrual rules per staff member.
* **Over-Limit Leave:** If a staff member exceeds their allotted leave, administrators can manually review the request and mark the additional leave as approved (paid) or flag it for a salary deduction.
* **Schedule Integration:** When leave is approved, the scheduling grid automatically blocks out those days. If tasks are already scheduled on approved leave dates, the administrator receives a conflict warning.

*Original ref: SRS v4 §6.2*

### 6.3 Staff Profiles

Administrators can access a staff member's profile to instantly view:
* Current online status.
* Total active cases.
* All assigned tasks.
* Real-time progress of each case.
* Any blocked or overdue items.

*Original ref: SRS v4 §6.3*

### 6.4 Weekly & Full Calendar Team Views

In addition to the daily team view delivered in the MVP, administrators gain:
* **Weekly view** showing all staff across a full week.
* **Full calendar view** for monthly planning and capacity assessment.

*Original ref: SRS v4 §6.3*

---

## 7. Overtime Tracking & Reporting

*Entirely new module — no MVP prerequisite beyond staff timetable configuration.*

### 7.1 Automated Overtime Detection

The system automatically flags any task scheduled outside a staff member's configured working hours as overtime. Detection is based on the individual timetable assigned to each staff member.

*Original ref: SRS v4 §7.1*

### 7.2 Overtime Proposal & Approval Workflow

When an administrator assigns a task to an overtime slot, they must include the proposed compensation amount or rate. The staff member reviews the proposal and may accept or reject it. If rejected, the administrator is immediately notified.

*Original ref: SRS v4 §7.2*

### 7.3 Staff Earnings Dashboard

Staff members can view their accumulated overtime hours for the current month, along with the total expected compensation for those hours.

*Original ref: SRS v4 §7.3*

### 7.4 Monthly Reporting

Comprehensive dashboards display total regular and overtime hours per staff member.

*Original ref: SRS v4 §7.4*

### 7.5 Data Export

The system supports exporting overtime, scheduling, and task completion reports to CSV format for external payroll processing.

*Original ref: SRS v4 §7.5*

---

## 8. Enhanced Security & Audit

*Builds on MVP Section 7.*

### 8.1 Full Audit Trails

The system maintains detailed logs of who completed a task, who requested or approved extensions, who flagged urgency — all with timestamps. This extends the basic logging in the MVP to a comprehensive, searchable audit trail.

*Original ref: SRS v4 §8.2*

### 8.2 Completion Reversal Control

Once a task is marked complete, reversing the completion requires **administrator confirmation** with a reason logged in the audit trail. This prevents accidental or unauthorized status changes.

*Original ref: SRS v4 §8.3*

### 8.3 Full Change History

Every edit to a task or case (status change, date change, reassignment, note edit) is logged with a full change history — recording who changed what, when, and the previous value. This replaces the fragility of Excel where changes are untracked and irreversible.

*Original ref: SRS v4 §8.3*

---

*— End of Advanced Document —*
