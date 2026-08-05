# UI/UX Wireframe Specification

**Project:** Team Scheduling & Task Management System  
**Version:** 1.0  
**Date:** 4 July 2026  
**Sources:**
- [SRS_v4_MVP.md](./SRS_v4_MVP.md)
- [SRS_v4_Advanced.md](./SRS_v4_Advanced.md)
- [user_stories.md](./user_stories.md)

---

## 1. Product Overview

A web application that replaces an Excel-based tracker for a legal/immigration firm. Two user roles — **Admin** and **Staff** — interact with cases, tasks, schedules, and notifications. The admin-side is a command centre for assigning work and monitoring the team. The staff-side is a focused productivity dashboard showing what to do next.

**Design Principles:**
- Dense but scannable — this replaces a spreadsheet, so information density matters
- Colour-coded urgency is the primary visual language (Green / Amber / Red / White)
- No decorative UI — every element must serve an operational purpose
- Mobile-functional but desktop-primary (most work happens on laptops)

---

## 2. Screen Inventory

### MVP Screens

| # | Screen | Role | Type | Primary User Story |
|---|--------|------|------|-------------------|
| S-01 | Login | Both | Page | US-1.1, US-1.2 |
| S-02 | Admin Dashboard | Admin | Page | US-2.6, US-5.6 |
| S-03 | Task Board (Tracker View) | Admin | Page | US-4.1, US-4.2 |
| S-04 | Scheduling Grid | Admin | Page | US-5.4 |
| S-05 | Case List | Admin | Page | US-9.1 |
| S-06 | Case Detail | Both | Page | US-2.6, US-3.2 |
| S-07 | Create Case (Lead) | Admin | Modal | US-2.1 |
| S-08 | Accept / Reject Lead | Admin | Modal | US-2.4 |
| S-09 | Assign Task | Admin | Modal/Drawer | US-5.3 |
| S-10 | Staff Dashboard | Staff | Page | US-6.1 |
| S-11 | Staff Day View Calendar | Staff | Page | US-6.2 |
| S-12 | Team Overview | Admin | Page | US-8.5 |
| S-14 | Notification Centre | Both | Drawer | US-7.1, US-7.2, US-7.3 |
| S-15 | Application Type Settings | Admin | Page | US-2.2 |
| S-16 | Staff Member Settings | Admin | Page | US-5.1, US-5.2 |
| S-17 | Blocked Tasks Pool | Admin | Page/Panel | US-5.7 |
| S-18 | Archive (Soft-Deleted) | Admin | Page | US-10.1 |

### Advanced Screens (Phase 2)

| # | Screen | Role | Type | Primary User Story |
|---|--------|------|------|-------------------|
| S-13 | Leave Management | Both | Page | US-8.2, US-8.3, US-8.4 |
| S-19 | Staff Week View Calendar | Staff | Page | US-6.3 |
| S-20 | Staff Overall View (Month/Quarter) | Staff | Page | US-6.4 |
| S-21 | Task Extension Request | Staff | Modal | US-11.4 |
| S-22 | Extension Approval | Admin | Modal | US-11.4 |
| S-23 | Staff Profile (Admin) | Admin | Page | US-8.7 |
| S-24 | Overtime Assignment | Admin | Modal | US-13.2 |
| S-25 | Staff Earnings Dashboard | Staff | Page | US-13.3 |
| S-26 | Monthly Overtime Report | Admin | Page | US-13.4 |
| S-27 | Pending Cases Pool | Admin | Page | US-11.7 |
| S-28 | Appointment Safety Net Dashboard | Admin | Panel | US-12.4 |
| S-29 | Pre-Appointment Confirmation | Admin | Modal | US-12.5 |
| S-30 | Change History | Both | Drawer | US-10.6 |
| S-31 | Admin Weekly/Monthly Team Calendar | Admin | Page | US-9.2 |

---

## 3. Global Components

These components appear on every page and are specified once here.

### 3.1 App Shell / Layout

```
┌──────────────────────────────────────────────────────────┐
│  HEADER BAR                                              │
│  [Logo] [Global Search ____________________] [🔔 3] [👤] │
├──────────┬───────────────────────────────────────────────┤
│ SIDEBAR  │                                               │
│          │  MAIN CONTENT AREA                            │
│ Nav      │                                               │
│ Links    │                                               │
│          │                                               │
│          │                                               │
│          │                                               │
├──────────┴───────────────────────────────────────────────┤
│  STATUS BAR (auto-save indicator, connection status)     │
└──────────────────────────────────────────────────────────┘
```

**Header Bar:**
- **Logo** — app name, links to dashboard
- **Global Search** — persistent search input (US-9.1). Dropdown results as user types (min 2 chars). Results show: case reference, client name, status badge. Clicking a result navigates to case detail.
- **Notification Bell** — icon with unread count badge. Red badge for urgent unread. Click opens Notification Centre drawer (S-14).
- **User Menu** — avatar/initials dropdown: profile, status toggle (staff only), settings, logout.

**Sidebar Navigation (Admin):**
- Dashboard
- Task Board
- Scheduling
- Cases
- Team
- Blocked Tasks
- Settings (Application Types, Staff Members)
- Archive

> **Phase 2:** Leave (S-13) added to sidebar when leave management ships. See [ADR-0001](./adr/0001-leave-management-deferred-to-phase-2.md).

**Sidebar Navigation (Staff):**
- Dashboard
- My Calendar
- My Cases
- Notifications

> **Phase 2:** Leave (S-13) added to sidebar when leave management ships.

**Status Bar:**
- Left: auto-save indicator ("Saved ✓" / "Saving..." / "⚠ Not saved")
- Right: connection status (online/offline indicator)

### 3.2 Global Search (Component)

| Element | Detail |
|---------|--------|
| Input | Text field, placeholder: "Search by reference, client name, or staff..." |
| Trigger | Results appear after 2+ characters, with 300ms debounce |
| Dropdown | Max 8 results. Each result row: `[Status Badge] Reference · Client Name · Staff Name` |
| Empty state | "No results found for '[query]'" |
| Staff restriction | Staff only see cases assigned to them |
| Keyboard | ↑↓ to navigate, Enter to select, Esc to close |

### 3.3 Notification Bell (Component)

| Element | Detail |
|---------|--------|
| Icon | Bell icon with badge count (unread notifications) |
| Badge colour | Grey = standard unread, Red = urgent unread |
| Click action | Opens Notification Centre drawer (S-14) |
| Empty state | Badge hidden when count = 0 |

### 3.4 Online Status Toggle (Staff Only)

| Element | Detail |
|---------|--------|
| Location | User menu dropdown, top section |
| Options | Online (green dot), On a Break (amber dot), Offline (grey dot) |
| Behaviour | Selection persists until changed. Default on login: Offline |
| Visual | Colour dot appears next to user avatar in header and on all admin views |

---

## 4. User Flow Maps

### 4.1 Case Lifecycle Flow (Admin)

```
Login → Admin Dashboard
  ↓
  Create Lead (S-07)
  ↓
  Case List (S-05) → Accept Lead (S-08)
  ↓                         ↓ [Reject → case archived]
  Case Detail (S-06) ← 13 tasks auto-generated
  ↓
  Assign Task (S-09) → Select Staff → Set Time → Confirm
  ↓
  Task Board (S-03) — monitor progress
  ↓
  Task completed by staff → Checklist updates
  ↓
  All 13 tasks complete → Case closed
```

### 4.2 Daily Staff Workflow

```
Login → Staff Dashboard (S-10)
  ↓
  View prioritised task list → "Next Action" highlighted
  ↓
  Click task → Case Detail (S-06) → Work on task
  ↓
  Update status: Not Started → In Progress → Completed
  ↓                              ↓
  If blocked → Mark "Blocked" → Time slot released
  ↓
  Return to dashboard → Next task
```

### 4.3 Scheduling Flow (Admin)

```
Scheduling Grid (S-04)
  ↓
  Select staff member → View day schedule
  ↓
  Click available slot → Assign Task modal (S-09)
  ↓
  Select case → Select task → Set duration → Confirm
  ↓
  Slot consumed, greyed out → Staff notified
```

### 4.4 Leave Request Flow *(Phase 2 — Advanced)*

> Not in MVP. Admins handle absences by editing staff timetables. See [ADR-0001](./adr/0001-leave-management-deferred-to-phase-2.md).

```
Staff: Leave Management (S-13) → "Request Leave" → Fill form → Submit
  ↓
Admin: Leave Management (S-13) → Pending tab → Review → Approve/Reject
  ↓
  If approved → Days blocked on scheduling grid
  If rejected → Staff notified with reason
```

---

## 5. Screen-by-Screen Specification

---

### S-01 · Login Page

**Scope:** MVP  
**Purpose:** Authenticate users and route them to the correct dashboard based on role.

```
┌──────────────────────────────────────┐
│                                      │
│         [App Logo & Name]            │
│                                      │
│     ┌────────────────────────┐       │
│     │  Email                 │       │
│     └────────────────────────┘       │
│     ┌────────────────────────┐       │
│     │  Password         [👁] │       │
│     └────────────────────────┘       │
│                                      │
│     [      Sign In         ]         │
│                                      │
│     Forgot password?                 │
│                                      │
└──────────────────────────────────────┘
```

**Fields:**

| Field | Type | Validation | Required |
|-------|------|-----------|----------|
| Email | email input | Valid email format | Yes |
| Password | password input (toggle visibility) | Min 8 chars | Yes |

**Actions:**

| Button | Behaviour |
|--------|-----------|
| Sign In | Submit credentials to Supabase Auth. On success → redirect to role-appropriate dashboard. On failure → inline error. |
| Forgot password? | Link → triggers Supabase password reset email flow |

**States:**

| State | Behaviour |
|-------|-----------|
| Default | Empty form, Sign In button disabled until both fields populated |
| Loading | Button shows spinner, fields disabled |
| Error (invalid credentials) | Red inline message below password: "Invalid email or password. Please try again." |
| Error (deactivated account) | Red inline message: "Your account has been deactivated. Contact your administrator." |
| Error (network) | Red banner above form: "Unable to connect. Check your internet connection." |
| Success | Redirect to dashboard (no visible success state on this page) |

---

### S-02 · Admin Dashboard

**Scope:** MVP  
**Purpose:** Landing page for admins. High-level overview of team status, urgent items, and quick-access widgets.

```
┌─────────────────────────────────────────────────────────────┐
│  Good morning, [Admin Name]                    [Date/Time]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐          │
│  │ Active  │ │ Urgent  │ │ Blocked │ │ Overdue │          │
│  │ Cases   │ │ Cases   │ │ Tasks   │ │ Tasks   │          │
│  │  24     │ │   3     │ │   7     │ │   2     │          │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘          │
│                                                             │
│  ┌─────────────────────────────┐ ┌─────────────────────────┐│
│  │ PENDING LEADS               │ │ TEAM STATUS             ││
│  │                             │ │                         ││
│  │ Mariya · Skilled Worker     │ │ ● Asha — Online (4)     ││
│  │ [Accept] [Reject]           │ │ ● Bless — Online (6)    ││
│  │                             │ │ ○ Dev — Offline (3)     ││
│  │ Rakhi · Spouse Visa         │ │ ◐ Jaya — Break (5)     ││
│  │ [Accept] [Reject]           │ │                         ││
│  │                             │ │ (n) = active task count ││
│  └─────────────────────────────┘ └─────────────────────────┘│
│                                                             │
│  ┌──────────────────────────────────────────────────────────┐│
│  │ TODAY'S SCHEDULE SUMMARY                                 ││
│  │                                                          ││
│  │ Asha    ████░░░░░░░░ 4/8 hrs booked                     ││
│  │ Bless   ██████████░░ 6/8 hrs booked                     ││
│  │ Dev     On Leave                                         ││
│  │ Jaya    ██████░░░░░░ 5/8 hrs booked                     ││
│  └──────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

**Components:**

| Component | Detail |
|-----------|--------|
| **Summary Cards** | 4 cards: Active Cases (count), Urgent Cases (count, red if >0), Blocked Tasks (count, amber), Overdue Tasks (count, red if >0). Clicking a card navigates to the relevant filtered view. |
| **Pending Leads** | List of cases with status `Lead — Pending Review`. Each row: client name, application type, [Accept] and [Reject] buttons. Accept opens S-08 modal. Max 5 shown, "View all →" link to S-05 filtered. |
| **Team Status** | List of all staff with: colour dot (green/amber/grey), name, active task count. Click navigates to S-12 or S-23 (Phase 2). |
| **Schedule Summary** | Horizontal bar per staff member showing booked vs available hours today. On Leave staff shown as a label. Click navigates to S-04. |

**States:**

| State | Behaviour |
|-------|-----------|
| Empty (no leads) | Pending Leads card shows: "No pending leads" with a [+ Create Lead] button |
| Empty (no urgent) | Urgent card shows "0" in green (positive indicator) |
| Loading | Skeleton placeholders for all components |

---

### S-03 · Task Board (Tracker View)

**Scope:** MVP (core), Advanced (drag-drop, real-time, filters, bulk)  
**Purpose:** The Excel replacement. Multi-column grid showing all active tasks per staff member. This is the most critical screen in the application.

```
┌─────────────────────────────────────────────────────────────────────┐
│  TASK BOARD                              [Filter ▾] [+ Create Lead]│
├────────────────┬────────────────┬────────────────┬──────────────────┤
│  ASHA          │  BLESS         │  JAYA          │  UNASSIGNED      │
├────────────────┼────────────────┼────────────────┼──────────────────┤
│ 🔴 App         │ 🟢 CCL/LOA     │ 🟡 DU          │ CCL              │
│ Vishnu +1      │ Sakura         │ Priya          │ New client       │
│ appt 19 (3:30) │ last date 28/7 │ appt Jun22     │ Kim Park         │
│ URGENT         │ CoS pending    │ (01:30)        │                  │
│                │                │ expiry 20      │                  │
├────────────────┤                ├────────────────┤                  │
│ 🟢 Review      │                │ 🟢 App          │                  │
│ Rahman family  ├────────────────┤ Anil + wife    │                  │
│ no rep         │ 🔴 DU          │ new client     │                  │
│                │ Li Chen        │                │                  │
├────────────────┤ last date 22/6 ├────────────────┤                  │
│ ⊘ Form Recv   │ submit by Fri  │ 🟢 Appt Booking│                  │
│ Fatima         │                │ Deepak +2      │                  │
│ BLOCKED        │                │                │                  │
│ Awaiting client│                │                │                  │
└────────────────┴────────────────┴────────────────┴──────────────────┘
```

**Components:**

| Component | Detail |
|-----------|--------|
| **Column Header** | Staff member name. UNASSIGNED column at the far right for tasks not yet assigned. |
| **Task Card** | One card per task row. Contains: status colour bar (left edge), task type abbreviation (bold), client name + dependants, appointment date/time (if set), last date (if set), inline notes, blocked label (if applicable). |
| **Colour Bar** | 4px left border: Green (on track), Red (urgent/overdue), Amber (approaching deadline), White/no colour (standard). |
| **Filter Button** | MVP: basic filters — dropdown with options: All, Urgent Only, Blocked Only, By Task Type. Advanced (S-03a): full filter panel. |
| **Create Lead Button** | Opens S-07 modal. |

**Task Card Detail:**

```
┌──────────────────────┐
│🟢│ App                │  ← task type abbreviation, bold
│  │ Vishnu partner +1  │  ← client name + dependants (clickable → S-06)
│  │ appt 19 (3:30)     │  ← appointment date/time, if set
│  │ last date 28 July  │  ← last date, if set
│  │ CoS pending        │  ← inline notes, muted text
│  │ ─── Asha ──────    │  ← assigned staff (visible in non-column contexts)
└──────────────────────┘
```

**Actions:**

| Action | Behaviour |
|--------|-----------|
| Click task card | Navigate to Case Detail (S-06), scrolled to the relevant task |
| Drag task card (Advanced) | Reorder within column or move between columns (reassign) |
| Right-click task card | Context menu: View Case, Flag Urgent, Remove Urgent, Reassign (Admin only) |
| Click column header | Navigate to staff member's schedule (S-04) |

**States:**

| State | Behaviour |
|-------|-----------|
| Default | All columns populated with active tasks |
| Empty column | Column shows: "No active tasks" in muted text |
| Empty board | Centre message: "No active tasks. Create a case to get started." with [+ Create Lead] |
| Loading | Skeleton cards in each column |
| Blocked task | Card background muted/striped, "BLOCKED" label in amber, ⊘ icon |
| Urgent task | Red left border, "URGENT" label in red, bold text |
| Overdue task | Red left border, "OVERDUE" label in red, pulsing dot indicator |

**MVP Filter Dropdown:**

| Filter | Behaviour |
|--------|-----------|
| All Tasks | Default — show everything |
| Urgent Only | Show only cards with `is_urgent = true` |
| Blocked Only | Show only cards with status = `Blocked` |
| By Task Type | Sub-menu: CCL, LOA, App, DU, etc. — filter to single type |

**Advanced additions (Phase 2):**
- Drag-and-drop reordering (US-4.4)
- Real-time live updates via Supabase Realtime (US-4.5)
- Full filter panel with multi-select: staff, task type, urgency, deadline range, blocked (US-4.6)
- Teal and grey row colours (US-4.3)
- Bulk action checkboxes and toolbar (US-4.7)
- Grouping by week/staff/case (US-4.6)

---

### S-04 · Scheduling Grid

**Scope:** MVP  
**Purpose:** Calendar-style view for admins to see all staff schedules and assign tasks to available time slots.

```
┌─────────────────────────────────────────────────────────────────────┐
│  SCHEDULING GRID           [◀ Prev Day] [Today: Mon 7 Jul] [Next ▶]│
├──────────┬─────────┬─────────┬─────────┬─────────┬─────────────────┤
│  TIME    │ ASHA    │ BLESS   │ JAYA    │ DEV     │                 │
│          │ 9-5     │ 10-6    │ 9-5     │ ON LEAVE│                 │
├──────────┼─────────┼─────────┼─────────┼─────────┤                 │
│ 09:00    │ ░░░░░░░ │ ─ ─ ─ ─│ ░░░░░░░ │ ██████  │                 │
│          │ CCL     │ (start  │ App     │ LEAVE   │                 │
│ 10:00    │ Mariya  │  10:00) │ Priya   │         │                 │
│          │ 2hrs    │ ░░░░░░░ │ 3hrs    │         │                 │
│ 11:00    │ ▓▓▓▓▓▓▓ │ DU      │         │         │                 │
│          │ AVAIL   │ Li Chen │         │         │                 │
│ 12:00    │ ▓▓▓▓▓▓▓ │ 2hrs    │ ▓▓▓▓▓▓▓ │         │                 │
│          │ AVAIL   │         │ AVAIL   │         │                 │
│ 13:00    │ ░░░░░░░ │ ▓▓▓▓▓▓▓ │ ░░░░░░░ │         │                 │
│          │ Review  │ AVAIL   │ Review  │         │                 │
│ 14:00    │ Rahman  │         │ Anil    │         │                 │
│          │ 2hrs    │ ▓▓▓▓▓▓▓ │ 1hr     │         │                 │
│ 15:00    │ ▓▓▓▓▓▓▓ │ AVAIL   │ ▓▓▓▓▓▓▓ │         │                 │
│          │ AVAIL   │         │ AVAIL   │         │                 │
│ 16:00    │ ▓▓▓▓▓▓▓ │ ░░░░░░░ │ ▓▓▓▓▓▓▓ │         │                 │
│          │ AVAIL   │ App     │ AVAIL   │         │                 │
│ 17:00    │ ─ ─ ─ ─│ Sakura  │ ─ ─ ─ ─│         │                 │
│          │ (end)   │ 2hrs    │ (end)   │         │                 │
│ 18:00    │         │ ─ ─ ─ ─│         │         │                 │
├──────────┴─────────┴─────────┴─────────┴─────────┤                 │
│  LEGEND: ░ Assigned  ▓ Available  ██ Leave  ─ Off Hours           │
└───────────────────────────────────────────────────────────────────  ┘
```

**Components:**

| Component | Detail |
|-----------|--------|
| **Date Selector** | Prev/Next day arrows + "Today" button. Clicking opens a date picker calendar. |
| **Column per Staff** | One column per active staff member. Header shows: name, working hours. |
| **Time Rows** | Hourly rows from earliest staff start time to latest staff end time. |
| **Task Block** | Spans multiple rows proportional to duration. Shows: task type, client name, duration. Colour-coded border (urgent = red, on track = green). |
| **Available Slot** | Clickable. Light green/tinted background. Cursor changes to "+" on hover. |
| **Leave Block** | Full-column block in dark grey with "ON LEAVE" label. Non-interactive. |
| **Off-Hours** | Dashed border, greyed out. Outside the staff member's configured timetable. |

**Actions:**

| Action | Behaviour |
|--------|-----------|
| Click available slot | Opens S-09 (Assign Task modal) pre-filled with the staff member and time |
| Click task block | Navigate to Case Detail (S-06) for that task's case |
| Hover task block | Tooltip: full task name, case reference, client name, remaining time |
| Prev/Next/Today | Navigate days. Date picker for jumping to specific dates. |

**States:**

| State | Behaviour |
|-------|-----------|
| Default | Current day shown |
| No staff | "No staff members configured. Go to Settings → Staff Members." |
| All staff on leave | All columns show LEAVE blocks. Message: "All staff are on leave today." |
| Conflict detected | When assigning via modal (S-09), conflicting slot flashes red briefly |
| Loading | Skeleton blocks in each column |

---

### S-05 · Case List

**Scope:** MVP  
**Purpose:** Searchable, filterable list of all cases for admin management.

```
┌─────────────────────────────────────────────────────────────────────┐
│  CASES                                              [+ Create Lead]│
├─────────────────────────────────────────────────────────────────────┤
│  [Search cases...________]  Status: [All ▾]  Type: [All ▾]        │
│                             Staff: [All ▾]   Urgency: [All ▾]     │
├──────────┬──────────┬──────────┬────────┬────────┬────────┬────────┤
│ Reference│ Client   │ Type     │ Staff  │ Status │Progress│ Urgent │
├──────────┼──────────┼──────────┼────────┼────────┼────────┼────────┤
│ 072601/  │ Vishnu   │ Skilled  │ Asha   │ Active │ ███░░  │ 🔴     │
│ SKW/VIS  │ +1 dep   │ Worker   │        │        │ 7/13   │        │
├──────────┼──────────┼──────────┼────────┼────────┼────────┼────────┤
│ 072602/  │ Sakura   │ Graduate │ Bless  │ Active │ ██░░░  │        │
│ GRD/SAK  │          │          │        │        │ 4/13   │        │
├──────────┼──────────┼──────────┼────────┼────────┼────────┼────────┤
│ —        │ Kim Park │ Spouse   │ —      │ Lead   │ —      │        │
│          │          │          │        │Pending │        │        │
├──────────┼──────────┼──────────┼────────┼────────┼────────┼────────┤
│ 062603/  │ Fatima   │ ILR      │ Asha   │ Active │ █░░░░  │        │
│ ILR/FAT  │ +2 dep   │          │        │        │ 3/13   │ BLOCKED│
└──────────┴──────────┴──────────┴────────┴────────┴────────┴────────┘
                                               Page 1 of 3  [< >]
```

**Fields (Filter Bar):**

| Field | Type | Options |
|-------|------|---------|
| Search | text input | Searches reference, client name |
| Status | dropdown | All, Lead — Pending, Active, Rejected, Completed |
| Type | dropdown | All, + all configured application types |
| Staff | dropdown | All, + all active staff members, Unassigned |
| Urgency | dropdown | All, Urgent, Blocked, Overdue |

**Table Columns:**

| Column | Content |
|--------|---------|
| Reference | Auto-generated reference. "—" for leads not yet accepted. |
| Client | Client name + dependant count (e.g., "+1 dep"). Clickable link to S-06. |
| Type | Application type name |
| Staff | Primary assigned staff or "—" if unassigned |
| Status | Badge: Lead Pending (grey), Active (blue), Rejected (red), Completed (green) |
| Progress | Mini progress bar + fraction (e.g., "7/13"). Not shown for leads. |
| Urgent | 🔴 icon if flagged urgent. "BLOCKED" text if any task is blocked. |

**Actions:**

| Action | Behaviour |
|--------|-----------|
| Click row | Navigate to Case Detail (S-06) |
| [+ Create Lead] | Opens S-07 modal |
| Filter change | Instantly filters the table (client-side for <500 rows, server-side beyond) |
| Sort column header | Click to sort ascending, click again for descending |

**States:**

| State | Behaviour |
|-------|-----------|
| Empty (no cases) | "No cases yet. Click '+ Create Lead' to add your first case." |
| Empty (filtered) | "No cases match your filters." with [Clear Filters] link |
| Loading | Skeleton rows |

---

### S-06 · Case Detail

**Scope:** MVP  
**Purpose:** Full case view with checklist, client details, and all task information.

```
┌─────────────────────────────────────────────────────────────────────┐
│  ← Back to Cases            072601/SKW/VIS              🔴 URGENT  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─── CLIENT INFO ─────────────────┐ ┌─── CASE INFO ──────────────┐│
│  │ Client: Vishnu Patel            │ │ Type: Skilled Worker        ││
│  │ Dependants:                     │ │ Status: Active              ││
│  │  · Priya Patel (spouse)         │ │ Created: 01/07/2026         ││
│  │  [+ Add Dependant]              │ │ Accepted: 01/07/2026        ││
│  │                                 │ │ Last Date: 28 July 2026     ││
│  │                                 │ │ Appointment: 19 Jul (3:30p) ││
│  └─────────────────────────────────┘ │ Staff: Asha                 ││
│                                      │ [Flag Urgent] [Edit Case]   ││
│                                      └─────────────────────────────┘│
│                                                                     │
│  ┌─── TASK CHECKLIST ─────────────────────── 7 / 13 complete ──────┐│
│  │                                                                  ││
│  │  ✅ 1. CCL (Client Care Letter)              Asha · Completed   ││
│  │  ✅ 2. LOA (Letter of Authority)             Asha · Completed   ││
│  │  ✅ 3. Send Google Form                      Asha · Completed   ││
│  │  ✅ 4. Google Form Received                  Asha · Completed   ││
│  │  ✅ 5. Application Preparation               Asha · Completed   ││
│  │  ✅ 6. Pending Detail Collection              Asha · Completed   ││
│  │  ✅ 7. Review by Client                      Asha · Completed   ││
│  │  ◐  8. Review by Senior                     Bless · In Progress ││
│  │  ○  9. Disclaimer Email Sent                 —    · Not Started ││
│  │  ○  10. Application Payment                  —    · Not Started ││
│  │  ○  11. Appointment Booking                  —    · Not Started ││
│  │  ○  12. Document Collection                  —    · Not Started ││
│  │  ○  13. Document Review & Upload             —    · Not Started ││
│  │                                                                  ││
│  │                         [+ Add Custom Task]                      ││
│  │                                                                  ││
│  └──────────────────────────────────────────────────────────────────┘│
│                                                                     │
│  ┌─── SELECTED TASK: 8. Review by Senior ───────────────────────────┐│
│  │                                                                   ││
│  │  Status: [In Progress ▾]     Assigned: Bless                     ││
│  │  Time Allocated: 2 hours     Scheduled: 7 Jul 13:00-15:00       ││
│  │                                                                   ││
│  │  Notes: [________________________________]                       ││
│  │                                                                   ││
│  │  [Mark Approved] [Request Revisions]    (admin/senior only)      ││
│  │                                                                   ││
│  └───────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
```

**Components:**

| Component | Detail |
|-----------|--------|
| **Breadcrumb** | "← Back to Cases" link |
| **Case Header** | Reference number, urgent flag badge (if set). Reference is editable by admin. |
| **Client Info Card** | Client name, dependant list with [+ Add Dependant] button, [Edit] link |
| **Case Info Card** | Application type, status badge, dates (created, accepted, last date, appointment), assigned staff, [Flag Urgent] toggle, [Edit Case] button, [Edit Reference] button |
| **Task Checklist** | Ordered list of 13+ tasks. Each row: status icon (✅ ◐ ○ ⊘), task number + name, assigned staff name, status text. Progress counter at top. [+ Add Custom Task] button below tasks (admin only). |
| **Task Detail Panel** | Appears below the checklist when a task is clicked. Shows: status dropdown, assigned staff, time allocation, scheduled slot, notes field, action buttons. |

**Checklist Status Icons:**

| Icon | Status |
|------|--------|
| ✅ | Completed |
| ◐ | In Progress |
| ○ | Not Started |
| ⊘ | Blocked — Awaiting Client Response |

**Task Detail Panel Actions (varies by role):**

| Action | Role | Behaviour |
|--------|------|-----------|
| Change Status dropdown | Staff (own tasks) | Options: Not Started → In Progress → Completed, or → Blocked |
| Mark Approved (Task 8) | Admin/Senior | Marks Task 8 as approved, unlocks Task 9 |
| Request Revisions (Task 8) | Admin/Senior | Reopens Task 5 with revision note |
| Assign Task button | Admin | Opens S-09 modal for this task |
| Notes field | Both | Free text, auto-saves on 1s debounce |
| Flag Urgent | Admin | Toggles urgent flag on the case |

**Validation:**

| Rule | Message |
|------|---------|
| Task 10 prerequisites | "Cannot complete: Tasks 1 (CCL), 2 (LOA), and 9 (Disclaimer) must be completed first." |
| Task 8 approval gate | "Cannot start Task 9 until Task 8 is approved by a senior reviewer." |
| Mandatory fields on save | "Client name cannot be blank." / "Appointment date cannot be cleared once set." |
| Status regression (staff) | Staff cannot change a Completed task. Message: "Completed tasks can only be reopened by an administrator." |

**States:**

| State | Behaviour |
|-------|-----------|
| Default | All sections populated |
| No tasks assigned | Checklist shows all tasks as ○ Not Started, assigned = "—". Message above checklist: "No tasks have been assigned yet. Assign tasks from the scheduling grid." |
| All tasks complete | Checklist fully ticked. Case status auto-changes to "Completed". A green banner: "All tasks completed. This case is now closed." |
| Case rejected | Grey page overlay with "REJECTED" banner. Read-only. |

---

### S-07 · Create Case (Lead) Modal

**Scope:** MVP  
**Purpose:** Quick form to create a new case/lead.

```
┌────────────────────────────────────────┐
│  Create New Lead                   [✕] │
├────────────────────────────────────────┤
│                                        │
│  Client First Name *                   │
│  [________________________]            │
│                                        │
│  Client Last Name *                    │
│  [________________________]            │
│                                        │
│  Application Type *                    │
│  [Skilled Worker Visa       ▾]         │
│                                        │
│  Notes                                 │
│  [________________________]            │
│  [________________________]            │
│                                        │
│         [Cancel]  [Create Lead]        │
│                                        │
└────────────────────────────────────────┘
```

**Fields:**

| Field | Type | Validation | Required |
|-------|------|-----------|----------|
| Client First Name | text input | Min 1 char, max 100 | Yes |
| Client Last Name | text input | Min 1 char, max 100 | Yes |
| Application Type | select dropdown | Must select from configured types | Yes |
| Notes | textarea | Max 500 chars | No |

**Actions:**

| Button | Behaviour |
|--------|-----------|
| Cancel | Close modal, discard input. If fields have content, show "Discard changes?" confirmation. |
| Create Lead | Validate → create case with status `Lead — Pending Review` → close modal → show success toast → case appears in Case List |

**States:**

| State | Behaviour |
|-------|-----------|
| Default | Empty form, Create Lead button disabled until all required fields filled |
| Validation error | Red border on invalid field + inline message below field |
| Submitting | Button shows spinner, fields disabled |
| Success | Modal closes, toast: "Lead created: [Client Name] — [Application Type]" |
| Error (server) | Red banner inside modal: "Failed to create lead. Please try again." |

---

### S-08 · Accept / Reject Lead Modal

**Scope:** MVP  
**Purpose:** Confirm acceptance or rejection of a lead. On acceptance, auto-generates reference and 13 tasks.

```
┌────────────────────────────────────────────────┐
│  Accept Lead?                              [✕] │
├────────────────────────────────────────────────┤
│                                                │
│  Client: Mariya Ivanova                        │
│  Type: Skilled Worker Visa                     │
│  Notes: New client via referral                │
│                                                │
│  Accepting this lead will:                     │
│  • Generate case reference: 072604/SKW/MAR     │
│  • Create 13 tasks for the case lifecycle      │
│  • Make the case visible on the task board      │
│                                                │
│       [Reject Lead]  [Accept & Create Tasks]   │
│                                                │
└────────────────────────────────────────────────┘
```

**Actions:**

| Button | Behaviour |
|--------|-----------|
| Reject Lead | Sets status to `Rejected`. Toast: "Lead rejected: [Client Name]". Modal closes. |
| Accept & Create Tasks | Sets status to `Active`, generates reference, creates 13 tasks. Toast: "Case [reference] created with 13 tasks." Modal closes, navigates to S-06. |
| [✕] | Close modal without action |

**States:**

| State | Behaviour |
|-------|-----------|
| Default | Both buttons enabled |
| Submitting | Selected button shows spinner, both buttons disabled |
| Error | Red banner: "Failed to process. Please try again." Buttons re-enabled. |

---

### S-09 · Assign Task Modal / Drawer

**Scope:** MVP  
**Purpose:** Assign a task to a staff member with explicit time allocation and time slot selection.

**Entry paths:**

| Entry | Case / task picker |
|-------|-------------------|
| Schedule grid (unscoped) | Case search → case select → task select |
| Case detail / blocked pool / checklist (task known) | Read-only task + case header; picker hidden |
| Case detail (case known, task not) | Task select only (`case_id` prefill) |

```
┌─────────────────────────────────────────────────────┐
│  Assign Task                                    [✕] │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Task: Application Preparation                      │
│  Case: 072601/SKW/VIS — Vishnu Patel                │
│                                                     │
│  Find case                                          │
│  [Search by reference or client name…            ]  │
│                                                     │
│  Case *                                             │
│  [072601/SKW/VIS — Vishnu Patel · Skilled Worker ▾] │
│                                                     │
│  Task *                                             │
│  [Application Preparation                       ▾]  │
│                                                     │
│  Assign to *                                        │
│  [Asha                          ▾]                  │
│                                                     │
│  Time Allocation *                                  │
│  [ 2 ] hours [ 00 ] minutes                         │
│                                                     │
│  Date *                                             │
│  [📅 7 July 2026              ]                     │
│                                                     │
│  ┌─── ASHA'S SCHEDULE — 7 Jul ──────────────────┐   │
│  │ 09:00 ░░░░░░░ CCL (Mariya) — 2hrs            │   │
│  │ 11:00 ▓▓▓▓▓▓▓ AVAILABLE                      │   │
│  │ 12:00 ▓▓▓▓▓▓▓ AVAILABLE ← [Select]           │   │
│  │ 13:00 ░░░░░░░ Review (Rahman) — 2hrs          │   │
│  │ 15:00 ▓▓▓▓▓▓▓ AVAILABLE                      │   │
│  │ 16:00 ▓▓▓▓▓▓▓ AVAILABLE                      │   │
│  └───────────────────────────────────────────────┘   │
│                                                     │
│  Start Time: 11:00                                  │
│  End Time:   13:00 (auto-calculated)                │
│                                                     │
│              [Cancel]  [Assign Task]                │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Fields:**

| Field | Type | Validation | Required |
|-------|------|-----------|----------|
| Find case | search input | Filters case dropdown by reference or client name | No (unscoped entry only) |
| Case | select dropdown | Active cases with assignable tasks; shows reference, client, type, unassigned count | Yes (unscoped entry only) |
| Task | select dropdown | Tasks for selected case; disabled until case chosen | Yes (unless task pre-filled) |
| Assign to | select dropdown | Must be active staff member | Yes |
| Time Allocation | number inputs (hours + minutes) | Min 15 min, max 8 hours | Yes |
| Date | date picker | Must be today or future. Cannot be a leave day. | Yes |
| Start Time | selected from schedule (click available slot) | Must be within working hours and available | Yes |

**Components:**

| Component | Detail |
|-----------|--------|
| **Task & Case Summary** | Read-only header showing the task being assigned and its parent case |
| **Case Picker** | Search + dropdown of active cases (EP-60). Hidden when task or case is pre-filled. |
| **Task Picker** | Dropdown of tasks for the selected case. Hidden when task is pre-filled. |
| **Staff Selector** | Dropdown of active staff members. Changing selection refreshes the schedule preview below. |
| **Schedule Preview** | Mini version of S-04 for the selected staff member on the selected date. Shows assigned (grey) and available (green) slots. Clicking an available slot selects it as the start time. |
| **Calculated End Time** | Auto-calculated: Start Time + Time Allocation. Displayed read-only. |

**Validation:**

| Rule | Message |
|------|---------|
| Overlap / double-booking | "Conflict: [Staff name] already has '[Task name]' scheduled from [time] to [time]." Assign button disabled. |
| Outside working hours | "Warning: This slot is outside [Staff name]'s working hours (09:00–17:00)." (MVP: warning only. Advanced: triggers overtime flow.) |
| Staff on leave | "Cannot assign: [Staff name] is on leave on [date]." |
| No slot selected | Assign button disabled. Message: "Select an available time slot." |
| Past date | "Cannot assign tasks in the past." |

**States:**

| State | Behaviour |
|-------|-----------|
| Default | Staff selector populated, schedule preview empty until staff + date selected |
| Slot selected | Selected slot highlighted in blue, start/end times populated |
| Conflict | Conflicting slot flashes red, error message shown |
| Submitting | Button spinner, fields disabled |
| Success | Modal closes, toast: "Task assigned to [Staff] at [Time]." Task appears on board and staff dashboard. |
| Error | Red banner: "Failed to assign task. The time slot may no longer be available." |

---

### S-10 · Staff Dashboard

**Scope:** MVP  
**Purpose:** Landing page for staff. Shows prioritised task list with clear "next action" highlighting.

```
┌─────────────────────────────────────────────────────────────────────┐
│  Good morning, Asha                          Status: [● Online ▾]  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐                  │
│  │ Today's │ │ Overdue │ │ Blocked │ │ Due This│                  │
│  │ Tasks   │ │         │ │         │ │ Week    │                  │
│  │   4     │ │   1     │ │   1     │ │   8     │                  │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘                  │
│                                                                     │
│  ┌─── YOUR PRIORITY LIST ──────────────────────────────────────────┐│
│  │                                                                  ││
│  │  ➤ NEXT ACTION                                                  ││
│  │  ┌──────────────────────────────────────────────────────────┐    ││
│  │  │ 🔴 Application Preparation · 072601/SKW/VIS             │    ││
│  │  │    Vishnu Patel +1 · URGENT                              │    ││
│  │  │    Scheduled: 11:00–13:00 today                          │    ││
│  │  │    [Open Case] [Mark In Progress]                        │    ││
│  │  └──────────────────────────────────────────────────────────┘    ││
│  │                                                                  ││
│  │  2. 🟡 Review · 072603/ILR/RAH                                  ││
│  │     Rahman family · Approaching deadline                        ││
│  │     Scheduled: 13:00–15:00 today                                ││
│  │                                                                  ││
│  │  3. 🟢 CCL/LOA · 072604/SKW/MAR                                 ││
│  │     Mariya Ivanova · On track                                   ││
│  │     Scheduled: 15:00–16:00 today                                ││
│  │                                                                  ││
│  │  4. ⊘ Google Form Received · 072605/GRD/FAT                    ││
│  │     Fatima Ali · BLOCKED — Awaiting client                      ││
│  │     (no scheduled time)                                         ││
│  │                                                                  ││
│  └──────────────────────────────────────────────────────────────────┘│
│                                                                     │
│  [View Day Calendar →]                                             │
└─────────────────────────────────────────────────────────────────────┘
```

**Components:**

| Component | Detail |
|-----------|--------|
| **Greeting & Status** | "Good morning/afternoon, [Name]" with online status toggle dropdown |
| **Summary Cards** | Today's Tasks, Overdue (red if >0), Blocked (amber if >0), Due This Week |
| **Priority List** | Ordered list of all assigned tasks. First item is "Next Action" with a highlighted card. Remaining items are compact rows. |
| **Next Action Card** | Prominent card with: colour indicator, task name, case reference, client, urgency label, scheduled time, quick action buttons. |
| **Compact Task Row** | For items 2+: colour dot, task name, case reference, client, status label, scheduled time |
| **Calendar Link** | "View Day Calendar →" navigates to S-11 |

**Priority Ordering Logic:**
1. Urgent-flagged tasks (red)
2. Overdue tasks (red)
3. Approaching deadline (amber) — sorted by deadline ascending
4. On-track tasks — sorted by scheduled time today, then by deadline
5. Blocked tasks (always at bottom, since staff can't action them)

**States:**

| State | Behaviour |
|-------|-----------|
| No tasks | "You have no assigned tasks. Your administrator will assign tasks to you." |
| All tasks complete today | "All tasks for today are complete. Great work! 🎉 Check tomorrow's tasks in your calendar." |
| Single task | Next Action card only, no numbered list |

---

### S-11 · Staff Day View Calendar

**Scope:** MVP  
**Purpose:** Hour-by-hour view of the staff member's day.

```
┌─────────────────────────────────────────────────────────────────────┐
│  MY CALENDAR — DAY VIEW     [◀ Prev] [Today: Mon 7 Jul] [Next ▶]  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  09:00  ┌─────────────────────────────────────────────────┐         │
│         │ 🟢 CCL · Mariya Ivanova · 072604/SKW/MAR       │         │
│  10:00  │     2 hours allocated                           │         │
│         └─────────────────────────────────────────────────┘         │
│                                                                     │
│  11:00  ┌─────────────────────────────────────────────────┐         │
│  ──NOW──│ 🔴 Application Preparation · Vishnu Patel      │         │
│  12:00  │     072601/SKW/VIS · URGENT                     │         │
│         │     2 hours allocated                           │         │
│  13:00  └─────────────────────────────────────────────────┘         │
│                                                                     │
│  13:00  ┌─────────────────────────────────────────────────┐         │
│         │ 🟡 Review · Rahman family · 072603/ILR/RAH      │         │
│  14:00  │     Approaching deadline                        │         │
│         │     2 hours allocated                           │         │
│  15:00  └─────────────────────────────────────────────────┘         │
│                                                                     │
│  15:00  ┌─────────────────────────────────────────────────┐         │
│         │ 🟢 CCL/LOA · Mariya Ivanova · 072604/SKW/MAR   │         │
│  16:00  │     1 hour allocated                            │         │
│         └─────────────────────────────────────────────────┘         │
│                                                                     │
│  16:00  ░░░░░░░░░ Available ░░░░░░░░░░░░░░░░░░░░░░        │
│  17:00  ─── End of working hours ───                               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Components:**

| Component | Detail |
|-----------|--------|
| **Date Navigation** | Same as S-04: Prev, Today, Next, date picker |
| **Current Time Marker** | Horizontal red line labelled "NOW" at the current time position |
| **Task Blocks** | Colour-coded blocks spanning their allocated hours. Shows: colour dot, task name, client, case reference, urgency/status label, duration. |
| **Available Slots** | Dotted/hatched background indicating unbooked time |
| **Off-Hours** | Below the working hours end time, greyed out with label |

**Actions:**

| Action | Behaviour |
|--------|-----------|
| Click task block | Navigate to Case Detail (S-06) scrolled to that task |
| Hover task block | Tooltip with notes and full case details |

---

### S-12 · Team Overview

**Scope:** MVP  
**Purpose:** Admin view showing all staff at a glance with status, case counts, and quick indicators.

```
┌─────────────────────────────────────────────────────────────────────┐
│  TEAM OVERVIEW                                           [7 Jul]   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ ● ASHA              Online   │ 4 cases │ 3 today │ 1 overdue │ │
│  │   Tasks due: App (Vishnu), Review (Rahman), CCL (Mariya)      │ │
│  │                                                    [View →]   │ │
│  ├────────────────────────────────────────────────────────────────┤ │
│  │ ● BLESS             Online   │ 6 cases │ 4 today │ 0 overdue │ │
│  │   Tasks due: DU (Li Chen), Review (Vishnu), App (Sakura)...   │ │
│  │                                                    [View →]   │ │
│  ├────────────────────────────────────────────────────────────────┤ │
│  │ ○ DEV               On Leave │ 3 cases │ — today │ —         │ │
│  │   Returns: 10 July                                            │ │
│  │                                                    [View →]   │ │
│  ├────────────────────────────────────────────────────────────────┤ │
│  │ ◐ JAYA              Break    │ 5 cases │ 2 today │ 0 overdue │ │
│  │   Tasks due: DU (Priya), Appt Booking (Deepak)               │ │
│  │                                                    [View →]   │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Per Staff Row:**

| Element | Detail |
|---------|--------|
| Status dot | Green (Online), Amber (Break), Grey (Offline), Dark Grey (Leave) |
| Name | Staff name, bold |
| Status label | "Online" / "On a Break" / "Offline" / "On Leave" |
| Case count | Total active cases assigned |
| Today count | Tasks scheduled for today |
| Overdue count | Red text if >0 |
| Tasks due | Comma-separated list of today's tasks (max 3, then "...") |
| [View →] | Navigate to S-04 filtered to that staff member (or S-23 in Phase 2) |

---

### S-13 · Leave Management

**Scope:** MVP  
**Purpose:** Staff request leave; admins approve/reject and manage allowances.

**Staff View:**

```
┌─────────────────────────────────────────────────────────────────────┐
│  LEAVE                                          [+ Request Leave]  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─── MY ALLOWANCE ────────────────────────────────────────────────┐│
│  │  Holiday: 8 remaining / 12 total    Sick: 10 remaining / 12    ││
│  │  Accrual: 1 day/month               Next accrual: 1 Aug 2026  ││
│  └──────────────────────────────────────────────────────────────────┘│
│                                                                     │
│  ┌─── MY REQUESTS ─────────────────────────────────────────────────┐│
│  │ Date Range     │ Type    │ Status    │ Reason                   ││
│  │ 8–10 Jul       │ Holiday │ ✅ Approved│ Family visit             ││
│  │ 25 Jul         │ Holiday │ ⏳ Pending │ Personal                 ││
│  │ 3 Jun          │ Sick    │ ✅ Approved│ —                        ││
│  └──────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
```

**Admin View (additional sections):**

```
┌─────────────────────────────────────────────────────────────────────┐
│  LEAVE MANAGEMENT                        [Configure Allowances]    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─── PENDING REQUESTS ────────────────────────────────────────────┐│
│  │ Staff  │ Date Range │ Type    │ Days │ Remaining │ Action       ││
│  │ Asha   │ 25 Jul     │ Holiday │ 1    │ 7 left    │ [✓] [✗]     ││
│  │ Bless  │ 1-5 Aug    │ Holiday │ 5    │ 3 left    │ [✓] [✗]     ││
│  │        │            │         │      │ ⚠ OVER    │              ││
│  └──────────────────────────────────────────────────────────────────┘│
│                                                                     │
│  ┌─── ALL LEAVE ─── [Filter: Staff ▾] [Type ▾] [Status ▾] ────────┐│
│  │ Staff  │ Date Range  │ Type    │ Status    │ Notes              ││
│  │ Asha   │ 8–10 Jul    │ Holiday │ Approved  │ Family visit       ││
│  │ Dev    │ 7–10 Jul    │ Holiday │ Approved  │ —                  ││
│  │ ...                                                             ││
│  └──────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
```

**Leave Request Modal (Staff):**

```
┌────────────────────────────────────────┐
│  Request Leave                     [✕] │
├────────────────────────────────────────┤
│                                        │
│  Leave Type *                          │
│  [Holiday                     ▾]       │
│                                        │
│  Start Date *     End Date *           │
│  [📅 25/07/26]    [📅 25/07/26]        │
│                                        │
│  Reason                                │
│  [________________________]            │
│                                        │
│  Days requested: 1                     │
│  Remaining after: 7 of 12 Holiday      │
│                                        │
│         [Cancel]  [Submit Request]     │
│                                        │
└────────────────────────────────────────┘
```

**Fields (Leave Request):**

| Field | Type | Validation | Required |
|-------|------|-----------|----------|
| Leave Type | select | Holiday, Sick | Yes |
| Start Date | date picker | Must be today or future | Yes |
| End Date | date picker | Must be ≥ Start Date | Yes |
| Reason | text input | Max 200 chars | No |

**Validation:**

| Rule | Message |
|------|---------|
| Overlapping dates | "You already have leave from [date] to [date]." |
| End before start | "End date must be on or after start date." |
| Past date | "Cannot request leave for past dates." |

**Approve/Reject Actions (Admin):**

| Action | Behaviour |
|--------|-----------|
| [✓] Approve | If within allowance → approve, block schedule. If over limit → show over-limit modal. |
| [✗] Reject | Prompt for reason (required) → reject, notify staff |

**Over-Limit Modal (Admin):**

```
┌────────────────────────────────────────────────┐
│  Leave Exceeds Allowance                   [✕] │
├────────────────────────────────────────────────┤
│                                                │
│  Bless is requesting 5 days of Holiday.        │
│  Remaining allowance: 3 days.                  │
│  Excess: 2 days.                               │
│                                                │
│  How should the excess be handled?             │
│                                                │
│  ○ Approve as paid leave                       │
│  ○ Flag for salary deduction                   │
│                                                │
│         [Cancel]  [Approve Leave]              │
│                                                │
└────────────────────────────────────────────────┘
```

---

### S-14 · Notification Centre (Drawer)

**Scope:** MVP  
**Purpose:** Slide-out panel showing all notifications for the logged-in user.

```
                          ┌──────────────────────────────────┐
                          │  NOTIFICATIONS              [✕]  │
                          │  [All] [Unread (3)]              │
                          ├──────────────────────────────────┤
                          │                                  │
                          │  🔴 URGENT                  2m   │
                          │  Case 072601/SKW/VIS flagged     │
                          │  urgent by Admin                 │
                          │  [View Case] [Acknowledge]       │
                          │  ──────────────────────────────  │
                          │  🔵 New Task Assigned       15m  │
                          │  CCL · Mariya Ivanova            │
                          │  Scheduled: 15:00–16:00          │
                          │  [View Task]                     │
                          │  ──────────────────────────────  │
                          │  🔴 Task Overdue            1h   │
                          │  Review · Rahman family          │
                          │  Was due at 15:00                │
                          │  [View Task]                     │
                          │  ──────────────────────────────  │
                          │  🔵 New Task Assigned    Yesterday│
                          │  App · Vishnu Patel              │
                          │  Scheduled: tomorrow 11:00       │
                          │  [View Task]         [read ✓]    │
                          │                                  │
                          │  ──────────────────────────────  │
                          │  [Mark All as Read]              │
                          │                                  │
                          └──────────────────────────────────┘
```

**Components:**

| Component | Detail |
|-----------|--------|
| **Tabs** | "All" and "Unread (n)" — toggle between views |
| **Notification Item** | Icon (🔴 urgent, 🔵 standard, 🟡 warning), title, description, relative timestamp, [View Case/Task] action |
| **Unread Indicator** | Unread notifications have a blue left border or bold text |
| **Mark All as Read** | Bulk action at the bottom of the list |
| **Relative Time** | "2m", "15m", "1h", "Yesterday", "3 Jul" |

**States:**

| State | Behaviour |
|-------|-----------|
| No notifications | "You're all caught up. No new notifications." |
| All read | Unread tab shows "(0)", badge on bell icon hidden |
| Many notifications | Virtual scroll / lazy load beyond 50 items |

---

### S-15 · Application Type Settings

**Scope:** MVP  
**Purpose:** Admin configures the list of application types used in case creation and reference generation.

```
┌─────────────────────────────────────────────────────────────────────┐
│  SETTINGS > APPLICATION TYPES                      [+ Add Type]    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌────────────┬────────────┬──────────┬─────────────────────────┐   │
│  │ Name       │ Code       │ Status   │ Actions                 │   │
│  ├────────────┼────────────┼──────────┼─────────────────────────┤   │
│  │ Skilled    │ SKW        │ ✅ Active │ [Edit] [Deactivate]     │   │
│  │ Worker     │            │          │                         │   │
│  ├────────────┼────────────┼──────────┼─────────────────────────┤   │
│  │ Graduate   │ GRD        │ ✅ Active │ [Edit] [Deactivate]     │   │
│  ├────────────┼────────────┼──────────┼─────────────────────────┤   │
│  │ Spouse     │ SPV        │ ✅ Active │ [Edit] [Deactivate]     │   │
│  ├────────────┼────────────┼──────────┼─────────────────────────┤   │
│  │ ILR        │ ILR        │ ✅ Active │ [Edit] [Deactivate]     │   │
│  ├────────────┼────────────┼──────────┼─────────────────────────┤   │
│  │ Fee Waiver │ FWV        │ ⛔ Inact. │ [Edit] [Activate]       │   │
│  └────────────┴────────────┴──────────┴─────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Add/Edit Type Modal:**

```
┌────────────────────────────────────────┐
│  Add Application Type              [✕] │
├────────────────────────────────────────┤
│                                        │
│  Full Name *                           │
│  [Skilled Worker Visa      ]           │
│                                        │
│  Abbreviation Code *                   │
│  [SKW] (3 chars, used in references)   │
│                                        │
│         [Cancel]  [Save Type]         │
│                                        │
└────────────────────────────────────────┘
```

**Fields:**

| Field | Type | Validation | Required |
|-------|------|-----------|----------|
| Full Name | text input | Min 2 chars, max 100, unique | Yes |
| Abbreviation Code | text input | Exactly 3 uppercase letters, unique | Yes |

**Validation:**

| Rule | Message |
|------|---------|
| Duplicate name | "An application type with this name already exists." |
| Duplicate code | "The code '[CODE]' is already in use by '[Existing Type Name]'." |
| Code format | "Code must be exactly 3 uppercase letters (e.g., SKW)." |

---

### S-16 · Staff Member Settings

**Scope:** MVP  
**Purpose:** Admin adds/removes staff members and configures their timetables.

```
┌─────────────────────────────────────────────────────────────────────┐
│  SETTINGS > STAFF MEMBERS                          [+ Add Staff]   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌───────────┬──────────────┬──────────┬──────────┬────────────┐   │
│  │ Name      │ Email        │ Role     │ Hours    │ Status     │   │
│  ├───────────┼──────────────┼──────────┼──────────┼────────────┤   │
│  │ Asha      │ asha@firm    │ Staff    │ 09–17    │ ✅ Active   │   │
│  │ Bless     │ bless@firm   │ Staff    │ 10–18    │ ✅ Active   │   │
│  │ Jaya      │ jaya@firm    │ Senior   │ 09–17    │ ✅ Active   │   │
│  │ Dev       │ dev@firm     │ Staff    │ 09–17    │ ⛔ Inactive │   │
│  └───────────┴──────────────┴──────────┴──────────┴────────────┘   │
│                                                                     │
│  Click a row to edit timetable and details.                        │
└─────────────────────────────────────────────────────────────────────┘
```

**Add Staff Modal:**

| Field | Type | Validation | Required |
|-------|------|-----------|----------|
| Full Name | text | Min 2 chars | Yes |
| Email | email | Valid email, unique | Yes |
| Role | select | Staff, Senior | Yes |
| Default Working Hours | time range | Start < End | Yes |

**Timetable Editor (expanded on row click):**

```
┌─── TIMETABLE: Asha ────────────────────────────────────────────────┐
│                                                                     │
│  Monday      [09:00] – [17:00]   ☑ Working day                    │
│  Tuesday     [09:00] – [17:00]   ☑ Working day                    │
│  Wednesday   [09:00] – [17:00]   ☑ Working day                    │
│  Thursday    [09:00] – [17:00]   ☑ Working day                    │
│  Friday      [09:00] – [17:00]   ☑ Working day                    │
│  Saturday    [ — ]  – [ — ]      ☐ Working day                    │
│  Sunday      [ — ]  – [ — ]      ☐ Working day                    │
│                                                                     │
│  Total weekly hours: 40                                            │
│                                                                     │
│              [Cancel]  [Save Timetable]                            │
└─────────────────────────────────────────────────────────────────────┘
```

---

### S-17 · Blocked Tasks Pool

**Scope:** MVP  
**Purpose:** Admin consolidated view of all tasks currently blocked across all cases.

```
┌─────────────────────────────────────────────────────────────────────┐
│  BLOCKED TASKS                                    [7 tasks blocked]│
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────┬──────────────┬──────────┬──────────┬────────────────┐ │
│  │ Task     │ Case / Client│ Staff    │ Blocked  │ Action         │ │
│  │          │              │          │ Since    │                │ │
│  ├──────────┼──────────────┼──────────┼──────────┼────────────────┤ │
│  │ Form Recv│ 072605/GRD   │ Asha     │ 3 days   │ [Unblock]      │ │
│  │          │ Fatima Ali   │          │          │ [Reassign]     │ │
│  ├──────────┼──────────────┼──────────┼──────────┼────────────────┤ │
│  │ Detail   │ 072602/SPV   │ Bless    │ 1 day    │ [Unblock]      │ │
│  │ Collect  │ Sakura       │          │          │ [Reassign]     │ │
│  ├──────────┼──────────────┼──────────┼──────────┼────────────────┤ │
│  │ Review by│ 072601/SKW   │ Jaya     │ 5 days   │ [Unblock]      │ │
│  │ Client   │ Vishnu +1    │          │          │ [Reassign]     │ │
│  └──────────┴──────────────┴──────────┴──────────┴────────────────┘ │
│                                                                     │
│  Sort: [Blocked Since ▾]   Filter Staff: [All ▾]                   │
└─────────────────────────────────────────────────────────────────────┘
```

**Actions:**

| Action | Behaviour |
|--------|-----------|
| [Unblock] | Changes status back to `In Progress`. Toast: "Task unblocked. Reassign a time slot in the scheduling grid." |
| [Reassign] | Opens S-09 to reassign the task to a new staff member and time slot |
| Click row | Navigate to Case Detail (S-06) |

---

### S-18 · Archive (Soft-Deleted Records)

**Scope:** MVP  
**Purpose:** Admin view of all soft-deleted records with restore/purge options.

```
┌─────────────────────────────────────────────────────────────────────┐
│  ARCHIVE                                                           │
│  Type: [All ▾]  Deleted: [Last 90 days ▾]                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────┬──────────────┬────────────┬──────────┬──────────────┐ │
│  │ Type     │ Name / Ref   │ Deleted By │ Deleted  │ Action       │ │
│  ├──────────┼──────────────┼────────────┼──────────┼──────────────┤ │
│  │ Task     │ CCL · 072601 │ Admin      │ 2 Jul    │ [Restore]    │ │
│  │ Case     │ 062601/FWV   │ Admin      │ 28 Jun   │ [Restore]    │ │
│  │ Dependant│ Ravi (dep)   │ Admin      │ 25 Jun   │ [Restore]    │ │
│  └──────────┴──────────────┴────────────┴──────────┴──────────────┘ │
│                                                                     │
│  Records older than 90 days: [Purge All Expired] (destructive)     │
└─────────────────────────────────────────────────────────────────────┘
```

**Actions:**

| Action | Behaviour |
|--------|-----------|
| [Restore] | Removes soft-delete flag. Item reappears in active views. Toast: "[Item] restored." |
| [Purge All Expired] | Confirmation: "Permanently delete X records older than 90 days? This cannot be undone." → hard-delete. |

---

## 6. Advanced Screens (Phase 2 — Textual Specs)

These screens are specified at the structure level for Phase 2 planning. They are not needed for MVP.

---

### S-19 · Staff Week View Calendar

**Scope:** Advanced  
**Purpose:** Weekly view of staff member's schedule.

**Layout:** 5-column grid (Mon–Fri). Each column is a day with task blocks stacked vertically. Colour-coded by urgency. Click any block → S-06. Non-working days greyed out. Current day column highlighted.

---

### S-20 · Staff Overall View (Month/Quarter)

**Scope:** Advanced  
**Purpose:** High-level monthly/quarterly workload view.

**Layout:** Standard month calendar grid. Each day cell shows: count of tasks, dot indicators for urgency (red/amber/green). Click any day → S-11 for that day. Side panel shows: upcoming deadlines, overdue count, task summary for the month.

---

### S-21 · Task Extension Request Modal (Staff)

**Scope:** Advanced  
**Purpose:** Staff requests more time for a task.

**Fields:** Reason (textarea, required), Additional Time (number input: hours + minutes, min 15 min). Shows current allocation and new total. Submit → notification to admin.

---

### S-22 · Extension Approval Modal (Admin)

**Scope:** Advanced  
**Purpose:** Admin approves or denies a time extension request.

**Content:** Task name, case reference, staff name, current allocation, requested additional time, reason. Approve → extends slot, auto-adjusts schedule. Deny → notifies staff with optional reason. Shows schedule preview to visualise the extension impact.

---

### S-23 · Staff Profile (Admin Detail View)

**Scope:** Advanced  
**Purpose:** Deep-dive into a single staff member's workload.

**Sections:** Online status, total active cases (with case list), all assigned tasks grouped by case, progress bar per case, blocked tasks list, overdue tasks list, mini 3-day schedule preview, extension history, overtime summary (if overtime module active).

---

### S-24 · Overtime Assignment Modal

**Scope:** Advanced  
**Purpose:** Admin assigns overtime with compensation proposal.

**Additional fields beyond S-09:** Compensation type (fixed amount or hourly rate), compensation value (£), overtime justification. Warning banner: "This task falls outside [Staff]'s working hours." Staff notification includes compensation details with Accept/Reject options.

---

### S-25 · Staff Earnings Dashboard

**Scope:** Advanced  
**Purpose:** Staff views their overtime hours and expected compensation.

**Sections:** Current month summary (total OT hours, total £), breakdown table (date, task, hours, rate, amount), historical month selector.

---

### S-26 · Monthly Overtime Report (Admin)

**Scope:** Advanced  
**Purpose:** Admin payroll report.

**Table:** Staff name, regular hours, overtime hours, OT compensation, total. Summary row. Month selector. [Export CSV] button.

---

### S-27 · Pending Cases Pool

**Scope:** Advanced  
**Purpose:** Dedicated pool of cases with unassigned tasks.

**Table:** Case reference, client, type, unassigned task count, urgency. Checkboxes for multi-select. [Bulk Assign] action opens a staff selector to assign all selected. Replaces the "Unassigned" column on S-03 with a richer workflow.

---

### S-28 · Appointment Safety Net Dashboard

**Scope:** Advanced  
**Purpose:** Admin view of all upcoming appointments with prerequisite status.

**Table:** Case reference, client, appointment date, countdown (working days), Task 12 status, Task 13 status, alert level (info/warning/critical/emergency). Sorted by appointment date ascending. Red rows for cases where prerequisites are not met and appointment is <3 days away.

---

### S-29 · Pre-Appointment Confirmation Modal

**Scope:** Advanced  
**Purpose:** Admin confirms all prerequisites are met before an appointment.

**Checklist:** ☐ Task 12 (Document Collection) — Completed. ☐ Task 13 (Document Review & Upload) — Completed. ☐ Appointment details confirmed (date, time, location). [Confirm All] button. If any unchecked, blocked with message: "Cannot confirm — outstanding items above."

---

### S-30 · Change History Drawer

**Scope:** Advanced  
**Purpose:** View full edit history of a case or task.

**Layout:** Side drawer. Chronological list (newest first). Each entry: "[User] changed [field] from '[old value]' to '[new value]' — [timestamp]". Immutable records. Filter by field name.

---

### S-31 · Admin Weekly / Monthly Team Calendar

**Scope:** Advanced  
**Purpose:** Extended scheduling views beyond the day view.

**Weekly:** Same as S-04 but showing Mon–Fri columns with day headers. Tasks shown as compact blocks. **Monthly:** Calendar grid. Each cell shows per-staff task counts. Click day → S-04 for that day.

---

## 7. Responsive Behaviour Notes

| Screen | Desktop (>1024px) | Tablet (768–1024px) | Mobile (<768px) |
|--------|-------------------|---------------------|-----------------|
| **App Shell** | Sidebar always visible (240px) | Sidebar collapsible (icon-only mode) | Sidebar hidden, hamburger menu |
| **Task Board (S-03)** | All staff columns visible side-by-side, horizontal scroll if needed | 2-3 columns visible, horizontal scroll | Single column at a time, swipe or tab selector for staff |
| **Scheduling Grid (S-04)** | Full grid: all staff columns + time rows | 2 staff columns visible, horizontal scroll | Single staff view with day schedule only |
| **Case Detail (S-06)** | Two-column layout (client info + case info side by side), checklist below | Stacked: client info, then case info, then checklist | Fully stacked, single column |
| **Modals** | Centred, 480–600px wide | Centred, same size | Full-screen slide-up sheet |
| **Notification Drawer** | 400px right-side drawer | Same | Full-screen overlay |
| **Tables (S-05, S-17, S-18)** | Full table | Horizontal scroll | Card layout: one card per row, stacked vertically |

**General Responsive Rules:**
- Minimum touch target: 44×44px on mobile
- Font size minimum: 14px body text on all screens
- Modals become bottom sheets on mobile (<768px)
- Date pickers use native mobile pickers where available
- Task cards on mobile show only: task type, client name, urgency indicator. Tap to expand full details.

---

## 8. Accessibility Notes

| Requirement | Implementation |
|-------------|----------------|
| **Colour alone is not sufficient** | All colour-coded statuses (Green/Amber/Red) must also have text labels or icons. E.g., red row also says "URGENT" or "OVERDUE". |
| **Keyboard navigation** | All interactive elements must be reachable via Tab. Modals trap focus. Esc closes modals/drawers. |
| **Screen reader labels** | All icons have `aria-label`. Status dots have labels (e.g., `aria-label="Online"`). Progress bars have `aria-valuenow`. |
| **Contrast ratios** | Minimum 4.5:1 for normal text, 3:1 for large text (WCAG AA). Colour-coded rows must maintain contrast with text. |
| **Form labels** | All inputs have visible labels (not just placeholders). Required fields marked with `*` and `aria-required="true"`. |
| **Error messages** | Linked to fields via `aria-describedby`. Announced to screen readers via `role="alert"`. |
| **Focus management** | When modals open, focus moves to first input. When modals close, focus returns to trigger element. |
| **Skip links** | "Skip to main content" link at the top of every page for keyboard users. |
| **Drag-and-drop (Advanced)** | Must have a keyboard alternative (e.g., arrow keys + Enter to reorder, or a "Move to position" input). |

---

## 9. Resolved UX decisions

| # | Decision | Screens |
|---|----------|---------|
| UX-1 | Task board shows **all staff columns**; empty columns show muted placeholder | S-03 |
| UX-2 | Scheduling grid uses **30-minute** slot rows | S-04, S-09 |
| UX-3 | Checklist allows **inline status change** on row; detail panel opens on row click for notes/assignment | S-06 |
| UX-4 | Mobile task board uses **staff tabs**, not swipe carousel | S-03 |
| UX-5 | Notification drawer **stays open** after clicking a notification (user closes manually) | S-14 |
| UX-6 | Scheduling grid defaults to **combined all-staff day view** | S-04 |
| UX-7 | Blocked tasks appear on **both** task board (muted) and Blocked Tasks Pool | S-03, S-17 |
| UX-8 | Staff column remains visible; non-working days shown via timetable (Phase 2: "On Leave" badge) | S-03 |

See [design_system.md](./design_system.md) §11 for visual tokens.

---

*— End of Document —*
