# Software Requirements Specification — MVP

**Project Title:** Team Scheduling & Task Management System  
**Document Version:** 4.0-MVP  
**Date:** 4 July 2026  
**Status:** Approved  
**Source:** Split from original SRS v4.0 (July 2026). Canonical parent document removed at implementation handoff.

---

## Revision History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 4.0-MVP | 04/07/2026 | — | MVP extraction from SRS v4.0 — contains only features required for initial launch |

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [User Roles & Access Management](#2-user-roles--access-management)
3. [Core Case & Task Management](#3-core-case--task-management)
4. [Team Scheduling & Task Management](#4-team-scheduling--task-management)
5. [Staff Notifications](#5-staff-notifications)
6. [Staff Management, Attendance & Leave](#6-staff-management-attendance--leave)
7. [Security, Privacy & Compliance](#7-security-privacy--compliance)
8. [Technology Stack](#8-technology-stack)
9. [Glossary](#9-glossary)

---

## 1. Introduction

### 1.1 Purpose

This document defines the **MVP** (Minimum Viable Product) requirements for the Team Scheduling & Task Management application. These are the features required for initial launch — replacing the current Excel-based workflow with a functional, production-ready system.

### 1.2 Scope

The MVP covers team management, case management, staff scheduling, task tracking, and notifications. It does **not** include leave management, overtime tracking, payroll reporting, or advanced automation (see [SRS_v4_Advanced.md](./SRS_v4_Advanced.md) for Phase 2 features).

No documents are stored within the application itself — all document handling is managed externally through Google Docs, email, and shared drives.

### 1.3 Data Minimisation Principle

The system collects the minimum data necessary to fulfil its operational purpose. This approach reduces liability and architectural complexity.

---

## 2. User Roles & Access Management

### 2.1 Administrator / Management

Administrators have unrestricted access to all cases, system settings, staff schedules, and reporting.

* **Task Assignment & Time Allocation:** Administrators assign tasks to staff members and explicitly define the time allocation for each task per individual. During assignment, the system displays the staff member's available schedule and automatically reserves the required time slot.

* **Staff Workload Visibility:** Administrators have a consolidated view of:
    * All cases currently assigned to each staff member.
    * A pool of unassigned or pending cases.
    * A pool of blocked tasks awaiting client responses.

### 2.2 Staff / Caseworker

Staff members have access to their assigned tasks, case notes, and individual scheduling.

* **Prioritised Dashboard:** The staff dashboard automatically orders assigned tasks by priority. Priority is determined by critical deadlines, urgency flags set by administrators, and the task's position within the case lifecycle. Only accepted cases appear on the staff dashboard; pre-acceptance cases remain invisible to staff.

* **Day View Calendar:** A detailed, hour-by-hour breakdown of the day's tasks, highlighting the next item to action. The interface must clearly surface: **what to do next**, **what is urgent**, and **what is approaching its deadline**.

---

## 3. Core Case & Task Management

The application serves as the central hub for all cases, tracking progress from intake through to completion via an automatically generated task lifecycle.

### 3.1 Case Creation & Acceptance

* Cases are created exclusively by administrators. Only **accepted cases** generate tasks and become visible on staff dashboards.
* Administrators can view incoming leads, and explicitly accept or reject them. Rejected leads halt all further progression.

### 3.2 Auto-Generated Task Lifecycle

When a case is accepted, the following **13 default tasks** are **automatically generated** as a structured checklist. Each task is a schedulable, assignable unit of work with an administrator-defined time allocation.

| No. | Task | Description |
|-----|------|-------------|
| 1 | **CCL (Client Care Letter)** | Draft and dispatch the Client Care Letter to the client. |
| 2 | **LOA (Letter of Authority)** | Draft and dispatch the Letter of Authority to the client. |
| 3 | **Send Google Form** | Send the intake form (Google Form) to the client for completion. This is an instruction assigned by the administrator to a staff member. |
| 4 | **Google Form Received** | Confirm receipt of the completed intake form from the client. If the client does not respond, this task may be marked as **Blocked — Awaiting Client Response**. |
| 5 | **Application Preparation** | Core casework commences — drafting, compiling information, and preparing the application. This may involve iterative information gathering from the client. |
| 6 | **Pending Detail Collection** | Staff follows up with the client to obtain any missing information required for the application. May trigger **Blocked** status if the client is unresponsive. |
| 7 | **Review by Client** | The prepared application is sent to the client for review and approval. May trigger **Blocked** status if the client is unresponsive. |
| 8 | **Review by Senior** | A senior caseworker reviews the application. This is a **separate task** requiring its own dedicated time slot. Progression is contingent upon explicit senior approval; otherwise, the assigned staff member must address any required revisions. |
| 9 | **Disclaimer Email Sent** | Following senior review approval, a disclaimer email is dispatched to the client. |
| 10 | **Application Payment** | Collection of the application payment from the client. Payment may only be processed once the disclaimer email has been sent and returned, the CCL has been signed, and the LOA has been signed. |
| 11 | **Appointment Booking** | Staff books the required appointment (e.g., biometrics). The selected appointment date determines the scheduling of subsequent tasks. |
| 12 | **Document Collection** | The client submits all required documents (via email or Google Docs) as requested by staff. This must be completed **before** the three-working-day upload window. |
| 13 | **Document Review & Upload** | Staff reviews received documents, organises file structures, and uploads all materials to the relevant external platform. Should be scheduled for three working days before the appointment date. |

#### 3.2.1 Custom Tasks

While the 13 default tasks cover the majority of cases, some cases may require additional steps. Administrators can **add custom tasks** to any active case to accommodate exceptions.

* Custom tasks are created by administrators and behave identically to default tasks — they appear on the case checklist, can be assigned to staff, scheduled with time allocations, and tracked through the same status workflow.
* A maximum of **5 custom tasks** may be added per case (hard limit).
* Custom tasks are assigned sequence numbers starting from 14 onwards and are clearly labelled as custom on the checklist and task board.
* Custom tasks do **not** affect the prerequisite logic of the default 13 tasks (e.g., Task 10 payment gate, Task 8 senior review gate).
* The case checklist and all views across the system (task board, dashboards, calendars) automatically reflect any custom tasks added to a case.

### 3.3 Case Checklist

Each case displays a **visual checklist** of all auto-generated tasks. As each task is marked complete, the corresponding checklist item is automatically ticked. This provides both administrators and staff with an instant, at-a-glance view of case progress.

### 3.4 Task Board — Tracker View (Excel Replacement)

The system must provide a **grid-based task tracker view** that replaces the current Excel-based workflow. This is the **single most critical MVP feature** and must be clear, simple, and resilient against data loss.

#### 3.4.1 Layout & Structure

* A **multi-column grid** where each column represents a staff member's active task queue — mirroring the current Excel layout in which tasks are listed per person.
* Each row represents a single task, displaying the following at a glance:
    * **Task type abbreviation** (e.g., App, DU, CCL/LOA, Appt Booking, Review)
    * **Client name** (including dependants where applicable — e.g., "Vishnu partner and child", "Rakhi Krishna + 2 children"). The client name is a **clickable link** that navigates directly to the client's case detail page.
    * **Appointment date & time** (prominently displayed — e.g., "appt 19 (3:30)", "appt June 22 (01:30)")
    * **Last date / deadline** (critical deadline — e.g., "last date 28 July", "F last date 22 June 2026")
    * **Assigned staff member** (e.g., "Asha", "Bless")
    * **Inline notes** (e.g., "no rep", "CoS pending", "new client", "expiry 20", "to complete by this week", "submit before Friday")

#### 3.4.2 Colour-Coded Status Rows

| Colour | Meaning |
|--------|---------|
| **Green** | Task in progress or on track |
| **Red** | Urgent or overdue — demands immediate attention |
| **Amber** | Approaching deadline — within 3 calendar days OR 50% of allocated time elapsed (whichever comes first). Document Upload tasks use working days; see §5.4. |
| **White** | Standard task with no immediate urgency |

#### 3.4.3 Centralised Priority Queue & Acknowledgement

Red-coloured tasks (urgent or overdue) are treated as a **centralised priority queue**. When a task enters the red state, the system:

* Sends a **priority notification** to both the assigned staff member and all administrators.
* The notification requires an explicit **acknowledgement** from the assigned staff member — a deliberate action separate from marking the notification as read.
* When staff acknowledges the notification, administrators can see the acknowledgement status and timestamp on the task board and in the notification centre.
* If staff has **not acknowledged** a red-priority notification within a configurable timeframe, the administrator can see that the task is unattended — providing visibility into which urgent tasks have not been acted upon.
* This creates a closed-loop accountability system: admin flags urgency → staff acknowledges → admin confirms attention is given.

### 3.5 Client & Dependant Management

* Cases are associated with primary clients and their dependants.
* The system must accommodate diverse application types, including but not limited to: Skilled Worker Visa (extending, switching, adding dependants, change of employment), Graduate Visa, Spouse Visa, Indefinite Leave to Remain, Naturalisation, Fee Waiver, Further Leave to Remain, and others. **Application types must be admin-configurable** — administrators can add, edit, and remove application types from the system settings.

### 3.6 Search & Filtering

The system shall provide efficient retrieval of cases using reference numbers, client names, case status, assigned staff member, urgency level, or blocked status.

### 3.7 Automated Reference Generation

The system automatically generates case reference numbers using a specific, customisable format: **MMYYNO/TYPE/ABC**. For example, the fourth case accepted in May 2026 (any application type) for a client named Mariya on a Skilled Worker case would be assigned the reference `052604/SKW/MAR`. Sequential numbers are **global per month** across all application types.

The auto-generated reference is **editable by administrators** after generation. This is necessary because the reference is also used in external software where the ordering does not necessarily follow the sequence of cases within this system. Administrators can modify the reference at any time from the case detail page. The system validates that edited references remain unique across all cases. If an edit would create a duplicate sequence number, the system assigns the next available number and updates the monthly counter accordingly.

---

## 4. Team Scheduling & Task Management

This is the core module of the system — an intuitive scheduling engine that provides administrators with full control over staff workloads and gives staff a clear, productive view of their responsibilities.

### 4.1 Staff Timetable & Working Hours

* Administrators can **add and remove staff members** from the system.
* Each staff member has a **customisable daily timetable** defining their standard working hours (e.g., 09:00–17:00). Timetables are configured in **team settings** or during the process of adding a new staff member. Timetables are configured per individual — different staff members may have different working hour patterns.
* The default working pattern is a **6-day work week** (Monday to Saturday), which can be customised per staff member. The timetable remains constant once set, but administrators can modify it at any time if working patterns change in the future.
* The scheduling interface displays **available time slots per day** for each staff member. When an administrator assigns a task to a specific time slot, the slot is consumed for the duration defined by the administrator and visually **greyed out** to indicate unavailability.

### 4.2 Staff Priority Lists

* Each staff member maintains a **personal priority queue** of all assigned tasks, ordered by urgency and deadline.
* Priority is automatically calculated based on: task deadline, case urgency flag, and task position within the case lifecycle.
* The priority list is **visually linked to the colour-coded status system** defined in §3.4.2 — tasks in the priority queue use the same green/amber/red/white colour scheme so that staff immediately see which tasks are urgent, approaching deadline, on track, or standard.

### 4.3 Administrator-Controlled Time Allocation

* When assigning a task to a staff member, the administrator **explicitly sets the time allocation** for that specific task for that specific individual.
* The system displays the staff member's current schedule and available slots to inform the administrator's decision.
* Different staff members may be allocated different amounts of time for the same type of task, at the administrator's discretion.

### 4.4 Visual Schedule Grid & Calendar

* A **calendar-style grid** allows administrators to assign tasks to staff members within available time slots.
* **Conflict Prevention:** Built-in logic prevents double-booking of staff members. The system alerts the administrator if a proposed assignment overlaps with an existing commitment.

> **UI Design Note:** The time slot selection interface should draw visual inspiration from the **TLS appointment booking website** — clean, slot-based layout with clear availability indicators. This reference should be consulted during the UI design phase.

### 4.5 Urgent Case Flagging

Administrators can flag any case as urgent at any time. This action immediately:
* Visually highlights **active tasks** (`In Progress` and `Not Started`) in red on the task board. Completed tasks retain normal colouring.
* Highlights the case across dashboards, calendars, and checklists for **all administrators** and **all staff members assigned to tasks within that case**. Staff members not assigned to the case do not see the urgent highlighting.
* Triggers an urgent task notification to the **assigned staff members** for that case (in-app). See §5.2 for notification targeting details.

### 4.6 Blocked / Reschedule Workflow (Client Unresponsive)

When a staff member cannot proceed because a client is not responding:

1. The staff member marks the task as **"Blocked — Awaiting Client Response"**.
2. The task enters a **Blocked** state. The allocated time slot is **released** so the staff member can be assigned alternative work.
3. The freed time appears as available on the administrator's scheduling grid. The administrator receives an **in-app notification** informing them that a time slot has been freed due to a blocked task — including the staff member's name, the task name, case reference, and the freed time slot details. This ensures the administrator is proactively aware of the freed capacity and can reassign work promptly.
4. **Blocked Tasks Pool:** Administrators can view all blocked tasks across all cases in a single consolidated view — providing visibility into client-side bottlenecks.

---

## 5. Staff Notifications

The notification system keeps staff informed of their responsibilities. **All notifications are in-app only** — no SMS or email notifications are required.

### 5.1 Notification Centre & History

The system provides a **notification history** accessible from the main dashboard via a **notification icon** (bell) in the header.

* A persistent **unread indicator** (coloured dot or badge with count) is displayed on the notification icon to draw attention to new notifications.
* Notifications that have been **marked as read** are visually greyed out or muted but remain accessible in the history.
* Unread notifications are styled prominently (bold text, coloured dot) to ensure they catch the staff member's attention.
* Staff can mark individual notifications as read, or mark all as read.
* The notification centre displays a scrollable history of all recent notifications, ordered by time (most recent first).

### 5.2 New Task Notifications

When a new task is assigned, the staff member receives an **immediate in-app notification** containing:
* Task name and case reference.
* Time allocated and scheduled start time.
* Urgency level.

### 5.3 Urgent Task Notifications

When an administrator flags a case or task as urgent, the **assigned staff members** for that case receive an **in-app escalation notification** that is visually distinct from standard notifications (e.g., red highlight, bold indicator). Only staff members who are assigned to tasks within the flagged case are notified — not all staff.

* If a case is flagged as urgent but **has no assigned staff** (i.e., tasks have not yet been assigned), the system **nudges the administrator** to assign staff. This nudge takes the form of a persistent visual prompt (e.g., a pulsing animation, highlighted banner, or badge on the case) indicating that an urgent case has unassigned tasks requiring immediate attention.
* Urgent notifications require **acknowledgement** from the assigned staff member (see §3.4.3). This acknowledgement is visible to administrators.

### 5.4 Overdue Task Alerts

If a task exceeds its allocated time without completion or an approved extension, it is flagged as **Overdue** with a persistent visual alert on the dashboard and calendar.

### 5.5 Document Upload Approaching Alerts

When an appointment date is set (Task 11), the system monitors Tasks 12 (Document Collection) and 13 (Document Review & Upload) against the **3-working-day upload window** before the appointment.

* At 3 working days before the upload window: in-app notification to assigned staff and administrators.
* If Tasks 12 or 13 remain incomplete thereafter: escalating notifications each working day with increasing severity, and task board rows progress from amber to red until completed.
* Working days exclude weekends; non-working days from staff timetables are excluded from the calculation.

---

## 6. Staff Management & Attendance

### 6.1 Real-Time Online Status

Staff can manually set their status (e.g., Online, On a Break, Offline). When marked "Online," staff are expected to be available for administrator calls.

### 6.2 Team Management & Workload Visibility

Administrators require a user-friendly interface to monitor team capacity:

* **Daily Schedule View:** A single page showing all staff members, their current online status, total active cases, and assigned tasks.

> **Note:** Leave Management (leave requests, allowances, approval workflows, and schedule blocking) is an **Advanced (Phase 2) feature**. See [SRS_v4_Advanced.md](./SRS_v4_Advanced.md) for full details.

---

## 7. Security, Privacy & Compliance

### 7.1 Secure Remote Access

Staff operate globally (including remote teams in India) using personal devices (BYOD). The system must enforce strict access controls via Supabase authentication with role-based access (Row-Level Security). Since no documents are stored within the application, data loss prevention primarily applies to case notes and operational data.

### 7.2 Data Integrity & Protection

The system must ensure that no data is accidentally lost or corrupted:

* **No Accidental Deletions:** All deletions are **soft-deletes**. Deleted tasks and cases are moved to a recoverable archive. Only administrators can permanently purge archived items, and only after a configurable retention period (default: **90 days**).
* **Mandatory Field Enforcement:** Critical fields (appointment date, last date, client name) cannot be left blank once a case has passed the acceptance stage.
* **Auto-Save:** All in-progress edits are automatically saved. No data is lost due to browser crashes, accidental navigation, or session timeouts.

### 7.3 Responsive Design

The application must be accessible and fully functional on both desktop and mobile devices.

---

## 8. Technology Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------| 
| Framework | Next.js (App Router) | Handles both the frontend UI and backend API routes in a single deployment, minimising infrastructure complexity. |
| Styling & UI | Tailwind CSS & Framer Motion | Tailwind CSS enables rapid, responsive styling. Framer Motion provides smooth visual transitions and progress indicators. |
| Database & Authentication | Supabase (PostgreSQL) | Supports the complex relational data model (cases, dependants, stages) and provides strict Row-Level Security (RLS) for administrator and staff roles. |
| Real-Time Communication | Supabase Realtime | Enables live in-app notifications and staff status indicators. |
| ORM | Prisma (if required) | Provides a type-safe database client for complex queries, to be introduced only if Supabase's built-in client proves insufficient. |
| Hosting | Vercel | Optimised for Next.js deployments with serverless functions, edge caching, and zero-configuration CI/CD. |

> **Note:** All services must operate within their respective **free-tier plans** during the initial development and pilot phases.

---

## 9. Glossary

| Term | Definition |
|------|-----------| 
| **BYOD** | Bring Your Own Device — staff use personal devices to access the system. |
| **CCL** | Client Care Letter — a regulatory document sent to clients at case inception. |
| **LOA** | Letter of Authority — authorisation for the firm to act on behalf of the client. |
| **RLS** | Row-Level Security — database-level access control restricting data visibility by user role. |
| **Soft-Delete** | A deletion mechanism where records are marked as inactive rather than permanently removed. |
| **Blocked** | A task state indicating that progress is halted pending an external response (typically from a client). |

---

*— End of MVP Document —*
