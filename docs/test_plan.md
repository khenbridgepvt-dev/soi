# Test Plan & Test Cases

**Project:** Team Scheduling & Task Management System  
**Version:** 1.0  
**Date:** 4 July 2026  
**Sources:**
- [SRS_v4_MVP.md](./SRS_v4_MVP.md)
- [SRS_v4_Advanced.md](./SRS_v4_Advanced.md)
- [user_stories.md](./user_stories.md)
- [api_specification.md](./api_specification.md)
- [database_schema.md](./database_schema.md)
- [ui_wireframe_spec.md](./ui_wireframe_spec.md)

---

## 1. Test Strategy

### 1.1 Approach

Testing follows a **progressive-depth strategy**: unit → integration → end-to-end → UAT. Each layer catches a different class of defect.

| Layer | Tool | Runner | Responsibility |
|-------|------|--------|----------------|
| Unit tests | Vitest | Automated, CI | Isolated business logic: reference generation, prerequisite checks, priority sorting, date/time calculations |
| Integration tests | Vitest + Supabase local | Automated, CI | API routes against a real PostgreSQL instance: transactions, RLS policies, constraint enforcement |
| E2E tests | Playwright | Automated, CI + manual | Full browser flows: login → create case → assign → complete. Cross-browser. |
| Manual testing | — | Manual, QA | Exploratory, visual, responsive, edge cases not covered by automation |
| UAT | — | Manual, stakeholders | Business acceptance against user stories |

### 1.2 Test Execution Cadence

| Event | Tests Run |
|-------|-----------|
| Every commit (CI) | Unit + Integration |
| Every PR merge to main | Unit + Integration + E2E |
| Pre-release | Full suite + Manual regression + Performance |
| UAT | Selected user stories with stakeholder sign-off |

### 1.3 Test Data Strategy

| Environment | Data |
|-------------|------|
| Unit tests | In-memory mocks, no database |
| Integration tests | Supabase local (Docker). Seeded with fixture data before each suite. Cleaned between test runs. |
| E2E tests | Supabase local or dedicated test project. Seeded with representative data (5 staff, 20 cases, 200+ tasks). |
| UAT | Production-like data (anonymised if real data is available). |

---

## 2. Scope of Testing

### 2.1 In Scope — MVP

| Area | Coverage |
|------|----------|
| Authentication (login, logout, session persistence) | Functional, security |
| Role-based access (admin vs staff data isolation) | Functional, security |
| Case lifecycle (create lead → accept → tasks generated → complete) | Functional, integration |
| Task lifecycle (not_started → in_progress → completed/blocked) | Functional, integration |
| Task prerequisites and gates (Task 8 approval, Task 10 prereqs) | Functional, edge cases |
| Task assignment with conflict detection | Functional, integration |
| Scheduling grid (availability, blocking) | Functional, UI |
| Notifications (creation, delivery, read/unread) | Functional, integration |
| Global search | Functional, performance |
| Application type configuration | Functional |
| Staff management and timetables | Functional |
| Soft-delete and restore | Functional |
| Auto-save | Functional, UX |
| Responsive design (desktop, tablet, mobile) | Visual, UX |
| Data integrity (constraints, validations, immutability rules) | Integration, security |

### 2.2 In Scope — Advanced (Phase 2)

| Area | Coverage |
|------|----------|
| Drag-and-drop reordering | Functional, UX |
| Real-time live updates | Functional, performance |
| Task extension workflow | Functional |
| Overtime proposals | Functional |
| Audit log / change history | Functional, security |
| Appointment safety net alerts | Functional |
| Linked cases | Functional |
| CSV export | Functional |
| Bulk actions | Functional |
| Leave management (request, approve, reject, allowance, scheduling overlay) | Functional, integration |

### 2.3 Out of Scope

| Item | Reason |
|------|--------|
| Email/SMS notifications | Explicitly deferred beyond advanced features |
| Document upload/storage | System does not store documents |
| Payment processing | No financial transactions in-app |
| Multi-tenant / multi-firm | Single-tenant deployment |
| Browser support below Chromium 100, Firefox 100, Safari 15 | Minimum supported versions |
| Accessibility audit (WCAG AAA) | Target is WCAG AA |
| Load testing beyond 50 concurrent users | Free-tier infrastructure limit |
| Native mobile app testing | Web-only application |

---

## 3. Test Environments

| Environment | Infrastructure | Database | Purpose |
|-------------|---------------|----------|---------|
| **Local** | `next dev` + Supabase local (Docker) | Supabase local PostgreSQL | Developer testing |
| **CI** | GitHub Actions runner | Supabase local (Docker in CI) | Automated test suite |
| **Preview** | Vercel preview deployment | Supabase test project (cloud) | PR review, manual testing |
| **Staging** | Vercel staging deployment | Supabase staging project | UAT, regression |
| **Production** | Vercel production | Supabase production project | Smoke tests only |

### 3.1 Browser Matrix

| Browser | Versions | Priority |
|---------|----------|----------|
| Chrome (desktop) | Latest 2 | P1 |
| Chrome (mobile/Android) | Latest 2 | P2 |
| Safari (desktop) | Latest 2 | P2 |
| Safari (iOS) | Latest 2 | P2 |
| Firefox (desktop) | Latest 2 | P3 |
| Edge (desktop) | Latest 2 | P3 |

---

## 4. Test Types

### 4.1 Functional Testing

Verify each feature behaves as specified in the SRS and user stories. Covers happy paths, alternative paths, and negative paths.

### 4.2 Integration Testing

Verify API routes interact correctly with PostgreSQL (via Supabase), including:
- Multi-step transactions (case acceptance)
- RLS policy enforcement
- Database constraint enforcement (overlaps, unique, check)
- Trigger execution (updated_at, profile creation)

### 4.3 Regression Testing

After any code change, re-run the full automated suite (unit + integration + E2E) to detect unintended side effects. Critical paths are always included:
- Case acceptance transaction
- Task assignment conflict detection
- Notification delivery

> **Phase 2:** Leave approval + schedule blocking added to regression suite when leave management ships. See [ADR-0001](./adr/0001-leave-management-deferred-to-phase-2.md).

### 4.4 Security Testing

| Test | Method |
|------|--------|
| RLS policy enforcement | Integration tests: verify staff cannot access other staff's data via direct Supabase queries |
| API role enforcement | Integration tests: call admin endpoints with staff JWT, expect 403 |
| JWT manipulation | Manual: tamper with JWT payload, verify rejection |
| SQL injection | Automated: pass injection payloads in all text inputs, verify parameterised queries prevent execution |
| XSS | Automated: inject `<script>` tags in notes/names, verify escaping in rendered output |
| IDOR (Insecure Direct Object Reference) | Integration: staff A attempts to access staff B's tasks via direct UUID |
| Session expiry | Manual: verify redirect to login after token expires |

### 4.5 Usability Testing

| Test | Method |
|------|--------|
| Keyboard navigation | Manual: tab through all interactive elements on every page |
| Screen reader | Manual: VoiceOver (macOS/iOS) or NVDA (Windows) on critical flows |
| Colour contrast | Automated: Lighthouse accessibility audit on all pages |
| Touch targets (mobile) | Manual: verify 44×44px minimum on mobile breakpoints |
| Empty states | Manual: verify all empty state messages and CTAs |
| Error states | Manual: trigger every validation error, verify messages are helpful |

### 4.6 Performance Testing

| Test | Target | Tool |
|------|--------|------|
| Task board load (100 tasks) | < 3 seconds | Lighthouse + custom timing |
| Case list pagination (500 cases) | < 2 seconds per page | Custom timing |
| Schedule grid render (10 staff, 1 day) | < 2 seconds | Custom timing |
| Global search response | < 500ms | API timing |
| Notification delivery (Realtime) | < 5 seconds end-to-end | Manual timing |
| Lighthouse Performance score | ≥ 80 | Lighthouse |
| Lighthouse Accessibility score | ≥ 90 | Lighthouse |

---

## 5. Requirement-to-Test Traceability

### 5.1 MVP Traceability Matrix

| User Story | Epic | Test IDs | Coverage |
|-----------|------|----------|----------|
| US-1.1 Admin login | E1 | TC-001, TC-002, TC-003, TC-004 | Functional, Security |
| US-1.2 Staff login | E1 | TC-005, TC-006, TC-007 | Functional, Security |
| US-1.3 Role routing | E1 | TC-008, TC-009 | Functional |
| US-2.1 Create lead | E2 | TC-010, TC-011, TC-012 | Functional |
| US-2.2 App type config | E2 | TC-013, TC-014, TC-015, TC-016 | Functional |
| US-2.3 Reference generation | E2 | TC-017, TC-018, TC-019 | Functional, Integration |
| US-2.4 Accept/reject lead | E2 | TC-020, TC-021, TC-022, TC-023 | Functional, Integration |
| US-2.5 Dependant management | E2 | TC-024, TC-025, TC-026 | Functional |
| US-2.6 Case detail view | E2 | TC-027, TC-028 | Functional |
| US-2.7 Urgent flag | E2 | TC-029, TC-030, TC-031 | Functional |
| US-3.1 Auto-generate 13 tasks | E3 | TC-032, TC-033 | Integration |
| US-3.2 Task checklist view | E3 | TC-034, TC-035 | Functional |
| US-3.3 Status transitions | E3 | TC-036, TC-037, TC-038, TC-039 | Functional, Edge |
| US-3.4 Task 8 senior review | E3 | TC-040, TC-041, TC-042 | Functional, Integration |
| US-3.5 Task 10 prerequisites | E3 | TC-043, TC-044 | Functional, Edge |
| US-4.1 Task board display | E4 | TC-045, TC-046, TC-047 | Functional, UI |
| US-4.2 Colour coding | E4 | TC-048, TC-049 | Visual |
| US-4.3 Click navigation | E4 | TC-050 | Functional |
| US-5.1 Staff timetable | E5 | TC-051, TC-052 | Functional |
| US-5.2 Staff status toggle | E5 | TC-053, TC-054 | Functional |
| US-5.3 Task assignment | E5 | TC-055, TC-056, TC-057, TC-058, TC-059 | Functional, Integration |
| US-5.4 Scheduling grid | E5 | TC-060, TC-061 | Functional, UI |
| US-5.5 View staff schedule | E5 | TC-062 | Functional |
| US-5.6 Workload visibility | E5 | TC-063 | Functional |
| US-5.7 Blocked task release | E5 | TC-064, TC-065 | Functional, Integration |
| US-6.1 Staff dashboard | E6 | TC-066, TC-067, TC-068 | Functional |
| US-6.2 Staff day calendar | E6 | TC-069, TC-070 | Functional |
| US-7.1 Notify on assignment | E7 | TC-071, TC-072 | Integration |
| US-7.2 Notify on urgent | E7 | TC-073 | Integration |
| US-7.3 Notify on overdue | E7 | TC-074 | Integration |
| US-7.4 Mark read | E7 | TC-075, TC-076 | Functional |
| US-8.1 Set online status | E8 | TC-077a | Functional |
| US-8.2 Leave accrual config | E8 (Advanced) | TC-077, TC-078 | Functional |
| US-8.3 Leave request | E8 (Advanced) | TC-079, TC-080, TC-081 | Functional |
| US-8.4 Leave approval | E8 (Advanced) | TC-082, TC-083, TC-084, TC-085 | Functional, Integration |
| US-8.5 Leave balance display | E8 (Advanced) | TC-086, TC-087 | Functional |
| US-8.6 Team overview | E8 | TC-088 | Functional |
| US-9.1 Search | E9 | TC-089, TC-090, TC-091 | Functional, Performance |
| US-10.1 Soft-delete | E10 | TC-092, TC-093, TC-094 | Functional |
| US-10.2 Auto-save | E10 | TC-095, TC-096 | Functional |
| US-10.3 RLS enforcement | E10 | TC-097, TC-098, TC-099, TC-100 | Security |

---

## 6. Test Cases — MVP

---

### Epic 1: Authentication & Role Management

---

#### TC-001 · Admin Login — Happy Path

| Field | Value |
|-------|-------|
| ID | TC-001 |
| Requirement | US-1.1 |
| Priority | P1 — Must |
| Type | Functional |

**Preconditions:** Admin account exists with email `admin@firm.com` and valid password.

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/login` | Login page displayed with email and password fields |
| 2 | Enter `admin@firm.com` in email field | Email field populated |
| 3 | Enter valid password | Password field populated (masked) |
| 4 | Click "Sign In" | Loading spinner shown on button |
| 5 | Wait for response | Redirected to `/dashboard` (admin dashboard) |
| 6 | Verify sidebar navigation | Admin nav items visible: Dashboard, Task Board, Scheduling, Cases, Team, Blocked Tasks, Settings |

**Pass Criteria:** User lands on admin dashboard with full admin navigation.

---

#### TC-002 · Admin Login — Invalid Credentials

| Field | Value |
|-------|-------|
| ID | TC-002 |
| Requirement | US-1.1 |
| Priority | P1 — Must |
| Type | Functional, Security |

**Preconditions:** Admin account exists.

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/login` | Login page displayed |
| 2 | Enter valid email | — |
| 3 | Enter incorrect password | — |
| 4 | Click "Sign In" | Loading spinner, then error |
| 5 | Verify error message | Inline message: "Invalid email or password. Please try again." |
| 6 | Verify fields | Email field retains value. Password field cleared. |

**Pass Criteria:** Error message displayed. No redirect. No information leakage about whether email exists.

---

#### TC-003 · Login — Deactivated Account

| Field | Value |
|-------|-------|
| ID | TC-003 |
| Requirement | US-1.1, US-10.3 |
| Priority | P1 — Must |
| Type | Security |

**Preconditions:** User account exists with `is_active = false`.

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/login` | Login page displayed |
| 2 | Enter deactivated user's email and password | — |
| 3 | Click "Sign In" | Error displayed |
| 4 | Verify error | Message: "Your account has been deactivated. Contact your administrator." |

**Pass Criteria:** Deactivated users cannot log in.

---

#### TC-004 · Login — Empty Fields Validation

| Field | Value |
|-------|-------|
| ID | TC-004 |
| Requirement | US-1.1 |
| Priority | P2 — Should |
| Type | Functional |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/login` | Sign In button is disabled |
| 2 | Enter email only, leave password empty | Sign In button remains disabled |
| 3 | Clear email, enter password only | Sign In button remains disabled |
| 4 | Enter both email and password | Sign In button becomes enabled |

---

#### TC-005 · Staff Login — Happy Path

| Field | Value |
|-------|-------|
| ID | TC-005 |
| Requirement | US-1.2 |
| Priority | P1 — Must |
| Type | Functional |

**Preconditions:** Staff account exists.

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Enter staff credentials and sign in | Redirected to `/staff/dashboard` |
| 2 | Verify sidebar navigation | Staff nav items visible: Dashboard, My Calendar, My Cases, Notifications |
| 3 | Verify admin routes absent | No links to: Task Board (admin), Scheduling, Team, Settings |

---

#### TC-006 · Staff Cannot Access Admin Routes

| Field | Value |
|-------|-------|
| ID | TC-006 |
| Requirement | US-1.2, US-10.3 |
| Priority | P1 — Must |
| Type | Security |

**Preconditions:** Staff user logged in.

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Manually navigate to `/dashboard` (admin) | Redirected to `/staff/dashboard` or shown 403 page |
| 2 | Manually navigate to `/settings` | Redirected or 403 |
| 3 | Call `POST /api/cases` via browser console | 403 Forbidden response |

---

#### TC-007 · Session Persistence Across Tabs

| Field | Value |
|-------|-------|
| ID | TC-007 |
| Requirement | US-1.1 |
| Priority | P2 — Should |
| Type | Functional |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Log in on Tab 1 | Dashboard displayed |
| 2 | Open new tab, navigate to app URL | Dashboard displayed (no login required) |
| 3 | Close Tab 1 | Tab 2 remains authenticated |

---

#### TC-008 · Admin Login Routes to Admin Dashboard

| Field | Value |
|-------|-------|
| ID | TC-008 |
| Requirement | US-1.3 |
| Priority | P1 — Must |
| Type | Functional |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Log in as admin | Redirected to `/dashboard` (admin dashboard) |
| 2 | Verify page title contains "Dashboard" | Yes |
| 3 | Verify summary cards visible | Active Cases, Urgent Cases, Blocked Tasks, Overdue Tasks |

---

#### TC-009 · Staff Login Routes to Staff Dashboard

| Field | Value |
|-------|-------|
| ID | TC-009 |
| Requirement | US-1.3 |
| Priority | P1 — Must |
| Type | Functional |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Log in as staff | Redirected to `/staff/dashboard` |
| 2 | Verify greeting | "Good morning/afternoon, [Staff Name]" |
| 3 | Verify priority list visible | Task list with "Next Action" card |

---

### Epic 2: Case Management

---

#### TC-010 · Create Lead — Happy Path

| Field | Value |
|-------|-------|
| ID | TC-010 |
| Requirement | US-2.1, EP-01 |
| Priority | P1 — Must |
| Type | Functional |

**Preconditions:** Admin logged in. At least one active application type exists.

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "+ Create Lead" button | Create New Lead modal opens |
| 2 | Enter "Mariya" in first name | — |
| 3 | Enter "Ivanova" in last name | — |
| 4 | Select "Skilled Worker Visa" from dropdown | — |
| 5 | Enter optional notes | — |
| 6 | Click "Create Lead" | Modal closes |
| 7 | Verify toast notification | "Lead created: Mariya Ivanova — Skilled Worker Visa" |
| 8 | Navigate to Case List | New case appears with status "Lead Pending" |
| 9 | Verify reference is null | Reference column shows "—" |

---

#### TC-011 · Create Lead — Validation Errors

| Field | Value |
|-------|-------|
| ID | TC-011 |
| Requirement | US-2.1, EP-01 |
| Priority | P1 — Must |
| Type | Functional |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open Create Lead modal | Create Lead button disabled |
| 2 | Enter only first name, leave last name empty | Create Lead button remains disabled |
| 3 | Fill all required fields, then clear first name | Inline error: "Client first name is required." |
| 4 | Enter name exceeding 100 characters | Inline error or character counter warning |

---

#### TC-012 · Create Lead — Cancel with Unsaved Data

| Field | Value |
|-------|-------|
| ID | TC-012 |
| Requirement | US-2.1 |
| Priority | P3 — Could |
| Type | UX |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open Create Lead modal, enter data in fields | — |
| 2 | Click "Cancel" or press Esc | Confirmation prompt: "Discard changes?" |
| 3 | Click "Discard" | Modal closes, no case created |
| 4 | Reopen modal | Fields are empty |

---

#### TC-013 · Application Type — Create

| Field | Value |
|-------|-------|
| ID | TC-013 |
| Requirement | US-2.2, EP-36 |
| Priority | P1 — Must |
| Type | Functional |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Settings > Application Types | Application Types page loads |
| 2 | Click "+ Add Type" | Add Type modal opens |
| 3 | Enter name "Ancestry Visa", code "ANC" | — |
| 4 | Click "Save Type" | Modal closes, new type appears in list with status "Active" |

---

#### TC-014 · Application Type — Duplicate Code Rejected

| Field | Value |
|-------|-------|
| ID | TC-014 |
| Requirement | US-2.2, EP-36 |
| Priority | P1 — Must |
| Type | Functional |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open Add Type modal | — |
| 2 | Enter name "Test Visa", code "SKW" (already exists) | — |
| 3 | Click "Save Type" | Error: "The code 'SKW' is already in use by 'Skilled Worker Visa'." |

---

#### TC-015 · Application Type — Code Format Validation

| Field | Value |
|-------|-------|
| ID | TC-015 |
| Requirement | US-2.2 |
| Priority | P2 — Should |
| Type | Functional |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Enter code "sk" (lowercase, 2 chars) | Error: "Code must be exactly 3 uppercase letters." |
| 2 | Enter code "SK1" (has digit) | Same error |
| 3 | Enter code "SKWW" (4 chars) | Same error |
| 4 | Enter code "SKW" (valid) | No error |

---

#### TC-016 · Application Type — Deactivate

| Field | Value |
|-------|-------|
| ID | TC-016 |
| Requirement | US-2.2 |
| Priority | P2 — Should |
| Type | Functional |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "Deactivate" on an active type | Type status changes to "Inactive" |
| 2 | Navigate to Create Lead modal | Deactivated type not shown in dropdown |
| 3 | Existing cases with this type | Unaffected — type still displays on their case detail |

---

#### TC-017 · Reference Generation — Format

| Field | Value |
|-------|-------|
| ID | TC-017 |
| Requirement | US-2.3, EP-05 |
| Priority | P1 — Must |
| Type | Integration |

**Preconditions:** July 2026. No cases accepted this month yet.

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Create and accept a lead: "Mariya Ivanova", Skilled Worker (SKW) | Reference generated |
| 2 | Verify reference format | `072601/SKW/MAR` (MMYY + 01 + / + SKW + / + MAR) |
| 3 | Accept a second lead: "Sakura Tanaka", Graduate (GRD) | Reference: `072602/GRD/SAK` |
| 4 | Verify sequence incremented | Second case is `02` |

**Post-MVP (ticket 0036):** SKD (Skilled Worker Dependant) uses the same reference format — e.g. accept lead "Maria Santos", type SKD → `052604/SKD/MAR`.

---

#### TC-018 · Reference Generation — Concurrent Acceptance

| Field | Value |
|-------|-------|
| ID | TC-018 |
| Requirement | US-2.3 |
| Priority | P1 — Must |
| Type | Integration, Edge |

**Preconditions:** Two leads ready for acceptance.

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Simultaneously accept both leads (two API calls) | Both succeed |
| 2 | Verify references | Unique sequence numbers (e.g., `01` and `02`), no duplicates |

**Implementation:** Run via integration test with concurrent promise execution.

---

#### TC-019 · Reference Generation — Short Name (< 3 chars)

| Field | Value |
|-------|-------|
| ID | TC-019 |
| Requirement | US-2.3 |
| Priority | P2 — Should |
| Type | Edge Case |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Create lead with first name "Li" | — |
| 2 | Accept lead | Reference: `0726XX/TYPE/LIX` (padded with X) or `0726XX/TYPE/LI` (truncated) |

**Pass Criteria:** Reference generated without error. Format is consistent.

---

#### TC-020 · Accept Lead — Happy Path

| Field | Value |
|-------|-------|
| ID | TC-020 |
| Requirement | US-2.4, EP-05 |
| Priority | P1 — Must |
| Type | Functional, Integration |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Case List, find lead with status "Lead Pending" | Lead visible |
| 2 | Click lead row or "Accept" button | Accept confirmation modal opens |
| 3 | Click "Accept & Create Tasks" | Modal shows spinner |
| 4 | Wait for response | Toast: "Case [reference] created with 13 tasks." |
| 5 | Verify case status | Changed to "Active" |
| 6 | Navigate to Case Detail | 13 tasks visible in checklist, all "Not Started" |
| 7 | Verify task names | CCL, LOA, Send Google Form, Google Form Received, App Preparation, Detail Collection, Client Review, Senior Review, Disclaimer, Payment, Appt Booking, Doc Collection, Doc Review & Upload |
| 8 | Verify task sequence | Numbered 1–13 |

---

#### TC-021 · Accept Lead — Already Accepted

| Field | Value |
|-------|-------|
| ID | TC-021 |
| Requirement | US-2.4, EP-05 |
| Priority | P1 — Must |
| Type | Edge Case |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Call `POST /api/cases/:id/accept` on an active case | 400: "Case is not in lead_pending status" |

---

#### TC-022 · Reject Lead

| Field | Value |
|-------|-------|
| ID | TC-022 |
| Requirement | US-2.4, EP-06 |
| Priority | P1 — Must |
| Type | Functional |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "Reject" on a pending lead | Modal or confirmation |
| 2 | Confirm rejection | Case status changes to "Rejected" |
| 3 | Verify no tasks created | No tasks exist for this case |
| 4 | Verify case remains in database | Case visible in filtered list or archive |

---

#### TC-023 · Accept Lead — Transaction Rollback

| Field | Value |
|-------|-------|
| ID | TC-023 |
| Requirement | US-2.4, US-10.2 |
| Priority | P1 — Must |
| Type | Integration, Edge |

**Preconditions:** Simulate a database error during task creation (e.g., by invalidating a foreign key constraint temporarily).

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Attempt to accept a lead with a simulated DB failure | 500 error returned |
| 2 | Verify case status | Still "Lead Pending" (not partially accepted) |
| 3 | Verify no tasks created | Zero tasks for this case |
| 4 | Verify reference counter | Not incremented (rolled back) |

---

#### TC-024 · Add Dependant

| Field | Value |
|-------|-------|
| ID | TC-024 |
| Requirement | US-2.5, EP-09 |
| Priority | P2 — Should |
| Type | Functional |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open case detail for an active case | Client info section visible |
| 2 | Click "+ Add Dependant" | Inline form or modal appears |
| 3 | Enter name "Priya Patel", relationship "spouse" | — |
| 4 | Save | Dependant appears in list. Task board cards show "+1" suffix. |

---

#### TC-025 · Add Dependant — Validation

| Field | Value |
|-------|-------|
| ID | TC-025 |
| Requirement | US-2.5 |
| Priority | P2 — Should |
| Type | Functional |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Try to save dependant with empty name | Error: "Name is required" |
| 2 | Try to save with empty relationship | Error: "Relationship is required" |

---

#### TC-026 · Soft-Delete Dependant

| Field | Value |
|-------|-------|
| ID | TC-026 |
| Requirement | US-2.5, US-10.1 |
| Priority | P2 — Should |
| Type | Functional |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click delete on a dependant | Confirmation prompt |
| 2 | Confirm | Dependant disappears from case detail |
| 3 | Navigate to Archive | Dependant visible in deleted records |
| 4 | Restore | Dependant reappears on case |

---

#### TC-027 · Case Detail — Full View

| Field | Value |
|-------|-------|
| ID | TC-027 |
| Requirement | US-2.6 |
| Priority | P1 — Must |
| Type | Functional |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to an active case detail | All sections visible: client info, case info, task checklist, task detail panel |
| 2 | Verify client info | First name, last name, dependant list |
| 3 | Verify case info | Application type, status badge, reference, dates, assigned staff, urgent flag |
| 4 | Verify task checklist | 13 tasks with correct status icons, assigned staff names |
| 5 | Click on a task | Task detail panel opens below checklist |

---

#### TC-028 · Case Detail — Staff Restricted View

| Field | Value |
|-------|-------|
| ID | TC-028 |
| Requirement | US-2.6, US-10.3 |
| Priority | P1 — Must |
| Type | Security |

**Preconditions:** Staff A has tasks assigned on Case X. Staff B has no tasks on Case X.

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Log in as Staff A, navigate to Case X | Case detail loads |
| 2 | Log in as Staff B, navigate to Case X | 403 or "Case not found" |

---

#### TC-029 · Flag Case as Urgent

| Field | Value |
|-------|-------|
| ID | TC-029 |
| Requirement | US-2.7, EP-07 |
| Priority | P1 — Must |
| Type | Functional |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | On case detail, click "Flag Urgent" | Case header shows 🔴 URGENT badge |
| 2 | Verify task board | Card border changes to red, "URGENT" label visible |
| 3 | Check notifications | Staff assigned to case's tasks receive urgent notification |

---

#### TC-030 · Remove Urgent Flag

| Field | Value |
|-------|-------|
| ID | TC-030 |
| Requirement | US-2.7 |
| Priority | P2 — Should |
| Type | Functional |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "Remove Urgent" on an urgent case | URGENT badge removed |
| 2 | Verify task board | Card reverts to standard colour |
| 3 | Verify no notification sent | No de-escalation notification |

---

#### TC-031 · Flag Urgent — Staff Cannot

| Field | Value |
|-------|-------|
| ID | TC-031 |
| Requirement | US-2.7, US-10.3 |
| Priority | P1 — Must |
| Type | Security |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Log in as staff | — |
| 2 | Navigate to assigned case detail | "Flag Urgent" button not visible |
| 3 | Call `POST /api/cases/:id/urgent` directly | 403 Forbidden |

---

### Epic 3: Task Lifecycle & Checklist

---

#### TC-032 · 13 Tasks Auto-Created on Acceptance

| Field | Value |
|-------|-------|
| ID | TC-032 |
| Requirement | US-3.1, EP-05 |
| Priority | P1 — Must |
| Type | Integration |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Accept a lead | 13 task records created |
| 2 | Query `tasks` table for this case | 13 rows, sequences 1–13, all `not_started`, all `assigned_to = NULL` |
| 3 | Verify task names and abbreviations | Match seed data exactly |

---

#### TC-033 · No Duplicate Tasks on Double-Accept

| Field | Value |
|-------|-------|
| ID | TC-033 |
| Requirement | US-3.1 |
| Priority | P1 — Must |
| Type | Edge Case |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Accept a lead | Success, 13 tasks created |
| 2 | Call `POST /api/cases/:id/accept` again | 400: "Case is not in lead_pending status" |
| 3 | Verify task count | Still exactly 13 |

---

#### TC-033b · Add Custom Task — Happy Path

| Field | Value |
|-------|-------|
| ID | TC-033b |
| Requirement | US-3.1, EP-11b |
| Priority | P1 — Must |
| Type | Functional, Integration |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | As Admin, open case with < 5 custom tasks | Case detail view |
| 2 | Click [+ Add Custom Task] | Modal opens |
| 3 | Submit custom task (e.g., Translation Service) | Modal closes, task appended to checklist |
| 4 | Verify API response | Sequence number is 14 or higher |
| 5 | Verify Checklist | Custom task appears in checklist as 'Not Started' |

---

#### TC-033c · Custom Task Limit (Max 5)

| Field | Value |
|-------|-------|
| ID | TC-033c |
| Requirement | US-3.1, EP-11b |
| Priority | P1 — Must |
| Type | Functional |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Create a case and add 5 custom tasks | 5 tasks added successfully |
| 2 | Try to add a 6th custom task | Error: "Maximum of 5 custom tasks allowed per case." |
| 3 | Verify task count | Remains at 13 default + 5 custom = 18 total |

---

#### TC-034 · Task Checklist — Progress Display

| Field | Value |
|-------|-------|
| ID | TC-034 |
| Requirement | US-3.2 |
| Priority | P1 — Must |
| Type | Functional |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open case with 7 of 13 tasks completed | Progress counter shows "7 / 13 complete" |
| 2 | Verify status icons | 7 × ✅, 1 × ◐ (in progress), 4 × ○ (not started), 1 × ⊘ (blocked) |

---

#### TC-035 · Task Checklist — Click to Expand Detail

| Field | Value |
|-------|-------|
| ID | TC-035 |
| Requirement | US-3.2 |
| Priority | P2 — Should |
| Type | Functional |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click on Task 5 in the checklist | Task detail panel opens showing: status dropdown, assigned staff, time, notes |
| 2 | Click on Task 8 | Panel switches to Task 8, showing `senior_approval` field |

---

#### TC-036 · Status Transition: Not Started → In Progress

| Field | Value |
|-------|-------|
| ID | TC-036 |
| Requirement | US-3.3, EP-12 |
| Priority | P1 — Must |
| Type | Functional |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | As staff, open assigned task with status "Not Started" | Status dropdown shows "Not Started" |
| 2 | Change to "In Progress" | Status updates, icon changes to ◐ |
| 3 | Verify API response | 200 OK, status = "in_progress" |

---

#### TC-037 · Status Transition: In Progress → Completed

| Field | Value |
|-------|-------|
| ID | TC-037 |
| Requirement | US-3.3, EP-12 |
| Priority | P1 — Must |
| Type | Functional |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Change status from "In Progress" to "Completed" | Status updates, icon changes to ✅ |
| 2 | Verify `completed_at` is set | Non-null timestamp |
| 3 | Verify `completed_by` is set | Current user's UUID |

---

#### TC-038 · Status Transition: Completed Cannot Be Reverted by Staff

| Field | Value |
|-------|-------|
| ID | TC-038 |
| Requirement | US-3.3 |
| Priority | P1 — Must |
| Type | Security |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | As staff, view a completed task | Status dropdown disabled or "Completed" is not changeable |
| 2 | Call `PATCH /api/tasks/:id/status` with `{ "status": "in_progress" }` | 400: "INVALID_STATE_TRANSITION" |

---

#### TC-039 · Status Transition: Invalid (Not Started → Completed)

| Field | Value |
|-------|-------|
| ID | TC-039 |
| Requirement | US-3.3 |
| Priority | P2 — Should |
| Type | Edge Case |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Call API to change status directly from "not_started" to "completed" | 400: "INVALID_STATE_TRANSITION" |

---

#### TC-040 · Task 8 Senior Review — Approved

| Field | Value |
|-------|-------|
| ID | TC-040 |
| Requirement | US-3.4, EP-17 |
| Priority | P1 — Must |
| Type | Functional, Integration |

**Preconditions:** Task 8 is `in_progress`.

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | As senior/admin, open Task 8 detail | "Mark Approved" and "Request Revisions" buttons visible |
| 2 | Click "Mark Approved" | Task 8 status → completed, `senior_approval` = "approved" |
| 3 | Verify Task 9 | Can now be started (no longer gated) |

---

#### TC-041 · Task 8 Senior Review — Revisions Required

| Field | Value |
|-------|-------|
| ID | TC-041 |
| Requirement | US-3.4, EP-17 |
| Priority | P1 — Must |
| Type | Functional, Integration |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "Request Revisions" on Task 8 | Revision notes field required |
| 2 | Enter revision notes, confirm | Task 8: `senior_approval` = "revisions_required" |
| 3 | Verify Task 5 | Status reverted to "In Progress" (reopened) |
| 4 | Verify notification | Staff assigned to Task 5 receives notification |

---

#### TC-042 · Task 9 Blocked by Task 8 Approval

| Field | Value |
|-------|-------|
| ID | TC-042 |
| Requirement | US-3.4 |
| Priority | P1 — Must |
| Type | Functional, Edge |

**Preconditions:** Task 8 is `not_started` or `in_progress` (no approval yet).

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Try to change Task 9 status to `in_progress` | 400: "PREREQUISITE_NOT_MET — Task 8 must be approved by a senior reviewer." |

---

#### TC-043 · Task 10 Prerequisites Met

| Field | Value |
|-------|-------|
| ID | TC-043 |
| Requirement | US-3.5, EP-12 |
| Priority | P1 — Must |
| Type | Functional, Integration |

**Preconditions:** Tasks 1, 2, 9 are all `completed`.

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Change Task 10 status to `completed` | Success (200 OK) |

---

#### TC-044 · Task 10 Prerequisites Not Met

| Field | Value |
|-------|-------|
| ID | TC-044 |
| Requirement | US-3.5, EP-12 |
| Priority | P1 — Must |
| Type | Functional, Edge |

**Preconditions:** Task 1 is `completed`, Task 2 is `completed`, Task 9 is `not_started`.

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Attempt to change Task 10 to `completed` | 400: "PREREQUISITE_NOT_MET — Tasks 1 (CCL), 2 (LOA), and 9 (Disclaimer) must be completed first." Details list outstanding tasks. |

---

### Epic 4: Task Board

---

#### TC-045 · Task Board — Columns Per Staff

| Field | Value |
|-------|-------|
| ID | TC-045 |
| Requirement | US-4.1 |
| Priority | P1 — Must |
| Type | Functional |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Task Board | One column per active staff member + "Unassigned" column |
| 2 | Verify each column header | Shows staff member name |
| 3 | Verify task cards | Each card in the correct staff column based on `assigned_to` |
| 4 | Verify unassigned tasks | Tasks with `assigned_to = NULL` appear in "Unassigned" column |

---

#### TC-046 · Task Board — Card Content

| Field | Value |
|-------|-------|
| ID | TC-046 |
| Requirement | US-4.1, US-4.2 |
| Priority | P1 — Must |
| Type | Functional |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Inspect a task card | Shows: task abbreviation (bold), client name + dependants, appointment date/time (if set), last date (if set), inline notes |
| 2 | Verify colour bar | Green for on-track, Red for urgent/overdue, Amber for approaching deadline |

---

#### TC-047 · Task Board — Empty State

| Field | Value |
|-------|-------|
| ID | TC-047 |
| Requirement | US-4.1 |
| Priority | P2 — Should |
| Type | Functional |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | With no active tasks | Centre message: "No active tasks. Create a case to get started." with [+ Create Lead] button |

---

#### TC-048 · Colour Coding — Urgent

| Field | Value |
|-------|-------|
| ID | TC-048 |
| Requirement | US-4.2 |
| Priority | P1 — Must |
| Type | Visual |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Flag a case as urgent | All task cards for that case have red left border + "URGENT" label |
| 2 | Remove urgent flag | Cards revert to green/amber/standard |

---

#### TC-049 · Colour Coding — Blocked

| Field | Value |
|-------|-------|
| ID | TC-049 |
| Requirement | US-4.2 |
| Priority | P1 — Must |
| Type | Visual |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Block a task | Card background muted/striped, ⊘ icon, "BLOCKED" label in amber |

---

#### TC-050 · Task Board — Click Navigates to Case

| Field | Value |
|-------|-------|
| ID | TC-050 |
| Requirement | US-4.3 |
| Priority | P1 — Must |
| Type | Functional |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click a task card on the board | Navigate to Case Detail page, scrolled to the clicked task |

---

### Epic 5: Scheduling

---

#### TC-051 · Staff Timetable — Configure Working Hours

| Field | Value |
|-------|-------|
| ID | TC-051 |
| Requirement | US-5.1, EP-22 |
| Priority | P1 — Must |
| Type | Functional |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Settings > Staff Members, click a staff row | Timetable editor opens |
| 2 | Set Monday: 10:00–18:00 | — |
| 3 | Uncheck Saturday | Saturday shows as non-working |
| 4 | Save | Timetable updated. Scheduling grid reflects new hours. |

---

#### TC-052 · Timetable Validation — End Before Start

| Field | Value |
|-------|-------|
| ID | TC-052 |
| Requirement | US-5.1 |
| Priority | P2 — Should |
| Type | Functional |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Set Monday start: 17:00, end: 09:00 | Error: "End time must be after start time." |

---

#### TC-053 · Staff Status Toggle

| Field | Value |
|-------|-------|
| ID | TC-053 |
| Requirement | US-5.2, EP-21 |
| Priority | P2 — Should |
| Type | Functional |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | As staff, click status dropdown in header | Options: Online, On a Break, Offline |
| 2 | Select "Online" | Green dot appears next to avatar |
| 3 | Verify admin Team Overview | Staff shows as "Online" with green dot |

---

#### TC-054 · Status Toggle — Cannot Set Other Staff

| Field | Value |
|-------|-------|
| ID | TC-054 |
| Requirement | US-5.2, US-10.3 |
| Priority | P1 — Must |
| Type | Security |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | As Staff A, call `PATCH /api/staff/{Staff B's ID}/status` | 403 Forbidden |

---

#### TC-055 · Assign Task — Happy Path

| Field | Value |
|-------|-------|
| ID | TC-055 |
| Requirement | US-5.3, EP-13 |
| Priority | P1 — Must |
| Type | Functional, Integration |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open Assign Task modal (from scheduling grid or case detail) | Modal opens with task and case info |
| 2 | Select staff "Asha" | Asha's schedule for the selected date loads |
| 3 | Set time allocation: 2 hours | — |
| 4 | Select date: 7 Jul | — |
| 5 | Click available slot at 11:00 | Start time: 11:00, End time: 13:00 (auto-calculated) |
| 6 | Click "Assign Task" | Modal closes. Toast: "Task assigned to Asha at 11:00." |
| 7 | Verify scheduling grid | Asha's 11:00–13:00 slot now shows the task |
| 8 | Verify task board | Task card moves from "Unassigned" to Asha's column |
| 9 | Verify Asha's notifications | New task notification received |

---

#### TC-056 · Assign Task — Conflict Detection

| Field | Value |
|-------|-------|
| ID | TC-056 |
| Requirement | US-5.3, EP-13 |
| Priority | P1 — Must |
| Type | Integration, Edge |

**Preconditions:** Asha has a task assigned 11:00–13:00 on 7 Jul.

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open Assign Task modal for a different task | — |
| 2 | Select Asha, 7 Jul, 12:00 start, 2 hours | End time: 14:00 (overlaps with 11:00–13:00) |
| 3 | Click "Assign Task" | Error: "Conflict: Asha already has 'CCL (Mariya)' scheduled from 11:00 to 13:00." |
| 4 | Verify Assign button | Disabled while conflict exists |

---

#### TC-057 · Assign Task — Staff on Non-Working Day *(Advanced: Staff on Leave)*

| Field | Value |
|-------|-------|
| ID | TC-057 |
| Requirement | US-5.3, EP-13 |
| Priority | P2 — Advanced (Phase 2) |
| Type | Functional, Edge |

> **MVP variant:** Test with staff timetable marking the day as non-working (no leave module). **Phase 2 variant:** Asha has approved leave on 8 Jul.

**Preconditions (MVP):** Asha's timetable marks 8 Jul as non-working.

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Try to assign a task to Asha on 8 Jul | Error: "Cannot assign: Asha is not available on 8 Jul." |

**Preconditions (Phase 2):** Asha has approved leave on 8 Jul.

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Try to assign a task to Asha on 8 Jul | Error: "Cannot assign: Asha is on leave on 8 Jul." |

---

#### TC-058 · Assign Task — Outside Working Hours

| Field | Value |
|-------|-------|
| ID | TC-058 |
| Requirement | US-5.3, EP-13 |
| Priority | P2 — Should |
| Type | Functional |

**Preconditions:** Asha works 09:00–17:00.

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Try to assign 16:00 start, 2 hours (ends 18:00) | Warning: "This slot extends outside Asha's working hours (09:00–17:00)." |

---

#### TC-059 · Assign Task — Past Date Rejected

| Field | Value |
|-------|-------|
| ID | TC-059 |
| Requirement | US-5.3 |
| Priority | P2 — Should |
| Type | Functional |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Select a past date in the date picker | Error: "Cannot assign tasks in the past." |

---

#### TC-060 · Scheduling Grid — Day View

| Field | Value |
|-------|-------|
| ID | TC-060 |
| Requirement | US-5.4 |
| Priority | P1 — Must |
| Type | Functional |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Scheduling Grid | Today's date shown by default |
| 2 | Verify columns | One per active staff member |
| 3 | Verify task blocks | Positioned at correct time slots, spanning correct duration |
| 4 | Verify available slots | Green/tinted background, clickable |
| 5 | Verify off-hours regions | Non-working hours from timetable shown as blocked |
| 6 | Click Next Day | Date advances, grid refreshes |

> **Phase 2:** Step 5 also verifies leave blocks — full-column grey block with "ON LEAVE" label.

---

#### TC-061 · Scheduling Grid — Click Available Slot

| Field | Value |
|-------|-------|
| ID | TC-061 |
| Requirement | US-5.4 |
| Priority | P1 — Must |
| Type | Functional |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click an available slot in Asha's column at 14:00 | Assign Task modal opens, pre-filled with staff = Asha, date = current, start = 14:00 |

---

#### TC-062 · Staff Can View Own Schedule

| Field | Value |
|-------|-------|
| ID | TC-062 |
| Requirement | US-5.5, EP-25 |
| Priority | P1 — Must |
| Type | Functional |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Log in as staff, navigate to My Calendar | Day view calendar displayed |
| 2 | Verify only own tasks visible | No other staff's assignments shown |

---

#### TC-063 · Admin Dashboard — Schedule Summary

| Field | Value |
|-------|-------|
| ID | TC-063 |
| Requirement | US-5.6, EP-42 |
| Priority | P2 — Should |
| Type | Functional |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | View admin dashboard schedule summary | Per-staff horizontal bars: booked hours / total hours |
| 2 | Staff with no working hours today (timetable) | Shows "Off" label instead of bar |

> **Phase 2:** Staff on approved leave shows "On Leave" label instead of bar.

---

#### TC-064 · Blocked Task Releases Time Slot

| Field | Value |
|-------|-------|
| ID | TC-064 |
| Requirement | US-5.7, EP-14 |
| Priority | P1 — Must |
| Type | Integration |

**Preconditions:** Task assigned to Asha at 11:00–13:00 on 7 Jul.

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Mark task as Blocked | Task status → blocked |
| 2 | Verify scheduling grid | 11:00–13:00 slot for Asha is now available (released) |
| 3 | Verify `task_assignments` table | Record has `is_released = true` |
| 4 | Verify admin can assign a new task to Asha at 11:00 | No conflict (slot is free) |

---

#### TC-065 · Unblock Task Requires Rescheduling

| Field | Value |
|-------|-------|
| ID | TC-065 |
| Requirement | US-5.7, EP-15 |
| Priority | P2 — Should |
| Type | Functional |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Unblock a previously blocked task | Status → in_progress |
| 2 | Check response | `requires_rescheduling: true` |
| 3 | Verify scheduling grid | No slot auto-assigned. Admin must manually assign. |

---

### Epic 6: Staff Dashboard & Calendar

---

#### TC-066 · Staff Dashboard — Priority List Order

| Field | Value |
|-------|-------|
| ID | TC-066 |
| Requirement | US-6.1, EP-43 |
| Priority | P1 — Must |
| Type | Functional |

**Preconditions:** Staff has: 1 urgent task, 1 overdue task, 2 on-track tasks, 1 blocked task.

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | View staff dashboard | Priority list shows 5 tasks |
| 2 | Verify order | Urgent first, then overdue, then on-track (by scheduled time), then blocked last |
| 3 | Verify "Next Action" | First task highlighted with prominent card |

---

#### TC-067 · Staff Dashboard — Summary Cards

| Field | Value |
|-------|-------|
| ID | TC-067 |
| Requirement | US-6.1 |
| Priority | P2 — Should |
| Type | Functional |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | View summary cards | Today's Tasks: 4, Overdue: 1 (red), Blocked: 1 (amber), Due This Week: 8 |

---

#### TC-068 · Staff Dashboard — Empty State

| Field | Value |
|-------|-------|
| ID | TC-068 |
| Requirement | US-6.1 |
| Priority | P2 — Should |
| Type | Functional |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Staff with no assigned tasks | "You have no assigned tasks. Your administrator will assign tasks to you." |

---

#### TC-069 · Staff Day Calendar

| Field | Value |
|-------|-------|
| ID | TC-069 |
| Requirement | US-6.2 |
| Priority | P1 — Must |
| Type | Functional |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to My Calendar | Hour-by-hour day view |
| 2 | Verify task blocks | Positioned correctly by time, colour-coded |
| 3 | Verify current time marker | Red "NOW" line at current time |
| 4 | Click task block | Navigate to case detail |

---

#### TC-070 · Staff Calendar — Navigate Days

| Field | Value |
|-------|-------|
| ID | TC-070 |
| Requirement | US-6.2 |
| Priority | P2 — Should |
| Type | Functional |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "Next" | Calendar shows tomorrow's schedule |
| 2 | Click "Prev" | Returns to today |
| 3 | Click "Today" button | Returns to current day from any date |

---

### Epic 7: Notifications

---

#### TC-071 · Notification Created on Task Assignment

| Field | Value |
|-------|-------|
| ID | TC-071 |
| Requirement | US-7.1, EP-13 |
| Priority | P1 — Must |
| Type | Integration |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Admin assigns a task to Asha | — |
| 2 | Verify `notifications` table | Record with `user_id = Asha's ID`, `type = 'new_task'` |
| 3 | Log in as Asha | Bell icon shows unread badge |
| 4 | Open notification drawer | "New Task Assigned" notification visible |

---

#### TC-072 · Notification — Click Navigates

| Field | Value |
|-------|-------|
| ID | TC-072 |
| Requirement | US-7.1 |
| Priority | P2 — Should |
| Type | Functional |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click [View Task] on a notification | Navigate to case detail for that task |

---

#### TC-073 · Notification on Urgent Flag

| Field | Value |
|-------|-------|
| ID | TC-073 |
| Requirement | US-7.2, EP-07 |
| Priority | P1 — Must |
| Type | Integration |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Admin flags case as urgent | — |
| 2 | Verify notifications created | One per staff member assigned to tasks in this case |
| 3 | Verify notification type | `urgent_case` |
| 4 | Verify bell badge | Red badge (urgent) |

---

#### TC-074 · Notification on Overdue Detection

| Field | Value |
|-------|-------|
| ID | TC-074 |
| Requirement | US-7.3 |
| Priority | P1 — Must |
| Type | Integration |

**Preconditions:** Task has `allocated_end_time` in the past, status = `in_progress`.

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Run `detect-overdue` edge function | Task marked `is_overdue = true` |
| 2 | Verify notification | Created for assigned staff, type = `task_overdue` |

---

#### TC-075 · Mark Notification Read

| Field | Value |
|-------|-------|
| ID | TC-075 |
| Requirement | US-7.4, EP-33 |
| Priority | P2 — Should |
| Type | Functional |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open notification drawer with 3 unread | Unread count badge: 3 |
| 2 | Click a notification | Notification marked as read, unread count: 2 |

---

#### TC-075b · Acknowledge Urgent Notification

| Field | Value |
|-------|-------|
| ID | TC-075b |
| Requirement | US-7.4, EP-34b |
| Priority | P1 — Must |
| Type | Functional, Integration |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Staff receives urgent case notification | Bell icon red badge |
| 2 | Open notification drawer | Urgent notification visible with [Acknowledge] button |
| 3 | Click [Acknowledge] | Acknowledged_at recorded, implicit read_at set |
| 4 | Verify API response | 200 OK |

---

#### TC-076 · Mark All Read

| Field | Value |
|-------|-------|
| ID | TC-076 |
| Requirement | US-7.4, EP-34 |
| Priority | P2 — Should |
| Type | Functional |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "Mark All as Read" | All notifications marked read, badge hidden |

---

### Epic 8: Staff Management

> **Note:** Leave Management (TC-077 through TC-087) has been moved to the **Advanced (Phase 2)** test scope. Leave allowances, leave requests, and leave approvals are not part of the MVP. Online status management and team overview remain in MVP.

---

#### TC-077a · Set Online Status

| Field | Value |
|-------|-------|
| ID | TC-077a |
| Requirement | US-8.1 |
| Priority | P2 — Should |
| Type | Functional |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Staff clicks status indicator | Dropdown: Online, On Break, Offline |
| 2 | Select "On Break" | Status dot changes to amber. Admin team view updates. |

---

#### TC-077 · Leave Allowance Configuration

| Field | Value |
|-------|-------|
| ID | TC-077 |
| Requirement | US-8.1, EP-31 |
| Priority | P1 — Must |
| Type | Functional |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Leave Management > Configure Allowances | Allowance settings for each staff member |
| 2 | Set Asha: holiday_total = 15, accrual_rate = 1.25 | — |
| 3 | Save | Updated values persist |
| 4 | Verify Asha's leave balance recalculated | Remaining reflects new total |

---

#### TC-078 · Default Allowances on Staff Creation

| Field | Value |
|-------|-------|
| ID | TC-078 |
| Requirement | US-8.1 |
| Priority | P2 — Should |
| Type | Integration |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Create a new staff member | — |
| 2 | Query `leave_allowances` for the new staff | Record exists: holiday = 12, sick = 12, accrual = 1.0 |

---

#### TC-079 · Submit Leave Request — Happy Path

| Field | Value |
|-------|-------|
| ID | TC-079 |
| Requirement | US-8.2, EP-26 |
| Priority | P1 — Must |
| Type | Functional |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | As staff, click "+ Request Leave" | Request Leave modal opens |
| 2 | Select type: Holiday, start: 25 Jul, end: 25 Jul | — |
| 3 | Enter reason | — |
| 4 | Verify summary | "Days requested: 1. Remaining after: 7 of 12 Holiday" |
| 5 | Submit | Modal closes. Toast: "Leave request submitted." Request appears in "My Requests" with status "Pending". |
| 6 | Verify admin notification | Admin receives `leave_requested` notification |

---

#### TC-080 · Submit Leave — Overlapping Dates Rejected

| Field | Value |
|-------|-------|
| ID | TC-080 |
| Requirement | US-8.2 |
| Priority | P1 — Must |
| Type | Functional, Edge |

**Preconditions:** Staff already has a pending request for 25 Jul.

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Submit another request that includes 25 Jul | Error: "You already have leave from 25 Jul to 25 Jul." |

---

#### TC-081 · Submit Leave — Past Date Rejected

| Field | Value |
|-------|-------|
| ID | TC-081 |
| Requirement | US-8.2 |
| Priority | P2 — Should |
| Type | Functional |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Select a past start date | Error: "Cannot request leave for past dates." |

---

#### TC-082 · Approve Leave — Within Allowance

| Field | Value |
|-------|-------|
| ID | TC-082 |
| Requirement | US-8.3, EP-28 |
| Priority | P1 — Must |
| Type | Functional |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | As admin, navigate to Leave Management > Pending tab | Pending requests listed |
| 2 | Click ✓ (Approve) on a request within allowance | Status → Approved |
| 3 | Verify scheduling grid | Leave dates blocked for that staff |
| 4 | Verify staff notification | Staff receives `leave_approved` notification |

---

#### TC-083 · Approve Leave — Over Limit

| Field | Value |
|-------|-------|
| ID | TC-083 |
| Requirement | US-8.3, EP-28 |
| Priority | P1 — Must |
| Type | Functional |

**Preconditions:** Staff requests 5 holiday days but has only 3 remaining.

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click ✓ Approve | Over-limit modal opens |
| 2 | Verify modal content | Shows excess: 2 days. Options: "Approve as paid leave" or "Flag for salary deduction" |
| 3 | Select an option and approve | Leave approved with `excess_handling` set |

---

#### TC-084 · Reject Leave

| Field | Value |
|-------|-------|
| ID | TC-084 |
| Requirement | US-8.3, EP-29 |
| Priority | P1 — Must |
| Type | Functional |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click ✗ (Reject) on a pending request | Reason field appears (required) |
| 2 | Enter reason, confirm rejection | Status → Rejected |
| 3 | Verify staff notification | `leave_rejected` notification with reason |

---

#### TC-085 · Approve Leave — Scheduling Conflict Warning

| Field | Value |
|-------|-------|
| ID | TC-085 |
| Requirement | US-8.3 |
| Priority | P2 — Should |
| Type | Functional, Edge |

**Preconditions:** Staff has task assignments on the requested leave dates.

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Approve leave | Approval succeeds, response includes `scheduling_conflicts` list |
| 2 | Verify warning | Admin informed which tasks need rescheduling |

---

#### TC-086 · Leave Balance Display — Staff View

| Field | Value |
|-------|-------|
| ID | TC-086 |
| Requirement | US-8.4 |
| Priority | P1 — Must |
| Type | Functional |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | As staff, navigate to Leave page | "My Allowance" section visible |
| 2 | Verify balance | Holiday: X remaining / Y total. Sick: X remaining / Y total. Next accrual date shown. |

---

#### TC-087 · Leave Balance Calculation — Accuracy

| Field | Value |
|-------|-------|
| ID | TC-087 |
| Requirement | US-8.4, EP-30 |
| Priority | P1 — Must |
| Type | Integration |

**Preconditions:** Staff has: `holiday_total = 12`, `accrual_rate = 1.0`, `accrual_start_date = 2026-01-01`, 3 approved holiday requests totalling 5 days. Current date: July 2026 (7 months elapsed).

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Call `GET /api/leave/allowance/:staffId` | `accrued = 7`, `used = 5`, `remaining = 2` |

---

#### TC-088 · Team Overview

| Field | Value |
|-------|-------|
| ID | TC-088 |
| Requirement | US-8.5 |
| Priority | P2 — Should |
| Type | Functional |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Team Overview | All staff listed with status dot, case count, today's task count, overdue count |
| 2 | Staff with offline status | Shows grey status dot |

> **Phase 2:** Staff on approved leave shows "On Leave" status, no task counts.

---

### Epic 9: Search

---

#### TC-089 · Global Search — By Client Name

| Field | Value |
|-------|-------|
| ID | TC-089 |
| Requirement | US-9.1, EP-38 |
| Priority | P1 — Must |
| Type | Functional |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Type "Mar" in global search bar | Dropdown appears after 300ms debounce |
| 2 | Verify results | Cases with client name matching "Mar" (e.g., Mariya) shown |
| 3 | Verify result format | `[Status Badge] Reference · Client Name · Staff Name` |

---

#### TC-090 · Global Search — By Reference

| Field | Value |
|-------|-------|
| ID | TC-090 |
| Requirement | US-9.1, EP-38 |
| Priority | P1 — Must |
| Type | Functional |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Type "072601" in search | Case 072601/SKW/VIS appears in results |
| 2 | Click result | Navigate to case detail |

---

#### TC-091 · Global Search — Staff Restriction

| Field | Value |
|-------|-------|
| ID | TC-091 |
| Requirement | US-9.1, US-10.3 |
| Priority | P1 — Must |
| Type | Security |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Log in as staff who has tasks on Case A but not Case B | — |
| 2 | Search for Case B's client name | Case B does NOT appear in results |

---

### Epic 10: Security & Data Integrity

---

#### TC-092 · Soft-Delete Case

| Field | Value |
|-------|-------|
| ID | TC-092 |
| Requirement | US-10.1, EP-08 |
| Priority | P1 — Must |
| Type | Functional |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Delete an active case | Confirmation prompt |
| 2 | Confirm | Case disappears from Case List |
| 3 | Verify database | `is_deleted = true`, `deleted_at` set |
| 4 | Verify child records | Tasks and dependants also soft-deleted |

---

#### TC-093 · Restore Deleted Case

| Field | Value |
|-------|-------|
| ID | TC-093 |
| Requirement | US-10.1, EP-40 |
| Priority | P1 — Must |
| Type | Functional |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Archive | Deleted case visible |
| 2 | Click "Restore" | Case reappears in Case List with tasks and dependants |

---

#### TC-094 · Purge Expired Records

| Field | Value |
|-------|-------|
| ID | TC-094 |
| Requirement | US-10.1, EP-41 |
| Priority | P2 — Should |
| Type | Functional |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Soft-delete a case (set `deleted_at` to 31+ days ago via DB for testing) | — |
| 2 | Click "Purge All Expired" with retention = 90 days | Case permanently removed |
| 3 | Query database | No record exists |

---

#### TC-095 · Auto-Save — Notes Field

| Field | Value |
|-------|-------|
| ID | TC-095 |
| Requirement | US-10.2 |
| Priority | P1 — Must |
| Type | Functional |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Edit task notes field | Status bar shows "Saving..." |
| 2 | Stop typing for 1 second | Status bar shows "Saved ✓" |
| 3 | Refresh the page | Notes value persisted |

---

#### TC-096 · Auto-Save — Network Failure Handling

| Field | Value |
|-------|-------|
| ID | TC-096 |
| Requirement | US-10.2 |
| Priority | P2 — Should |
| Type | Functional, Edge |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Edit notes field, then disconnect network | — |
| 2 | Wait for save attempt | Status bar shows "⚠ Not saved" (persistent) |
| 3 | Reconnect network | Auto-retry. Status bar shows "Saved ✓" on success. |

---

#### TC-096b · Auto-Save — Exponential Backoff Retry

| Field | Value |
|-------|-------|
| ID | TC-096b |
| Requirement | US-10.2, system_design §5.3 |
| Priority | P2 — Should |
| Type | Functional, Edge |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Edit notes field, disconnect network | Status bar shows "⚠ Not saved" |
| 2 | Observe retry attempts (network tab or console) | First retry at ~5s, second at ~15s, third at ~30s (exponential backoff) |
| 3 | Remain disconnected for all 3 retries | Status bar shows "Check your connection" after 3 failures |
| 4 | Reconnect network | Next retry succeeds. Status bar shows "Saved ✓" |

---

#### TC-097 · RLS — Staff Cannot See Other Staff's Tasks

| Field | Value |
|-------|-------|
| ID | TC-097 |
| Requirement | US-10.3 |
| Priority | P1 — Must |
| Type | Security |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | As Staff A, query `tasks` table via Supabase client | Only tasks where `assigned_to = Staff A's ID` returned |

---

#### TC-098 · RLS — Staff Cannot See Other Staff's Schedule

| Field | Value |
|-------|-------|
| ID | TC-098 |
| Requirement | US-10.3 |
| Priority | P1 — Must |
| Type | Security |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | As Staff A, query `task_assignments` for Staff B | Zero rows returned |

---

#### TC-099 · RLS — Staff Cannot See Other Staff's Leave

| Field | Value |
|-------|-------|
| ID | TC-099 |
| Requirement | US-10.3 |
| Priority | P1 — Must |
| Type | Security |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | As Staff A, query `leave_requests` for Staff B | Zero rows returned |

---

#### TC-100 · RLS — Admin Has Full Access

| Field | Value |
|-------|-------|
| ID | TC-100 |
| Requirement | US-10.3 |
| Priority | P1 — Must |
| Type | Security |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | As admin, query `tasks` table | All tasks returned (across all staff) |
| 2 | As admin, query `task_assignments` | All assignments returned |
| 3 | As admin, query `leave_requests` | All requests returned |

---

## 7. Case Completion — Full Lifecycle Test

This end-to-end test covers the entire case lifecycle. It serves as both a regression test and a UAT acceptance test.

#### TC-E2E-001 · Full Case Lifecycle

| Field | Value |
|-------|-------|
| ID | TC-E2E-001 |
| Priority | P1 — Must |
| Type | E2E, Regression |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Admin creates lead: "Vishnu Patel", Skilled Worker | Lead created, status = lead_pending |
| 2 | Admin adds dependant: "Priya Patel", spouse | Dependant added |
| 3 | Admin accepts lead | Reference generated, 13 tasks created, status = active |
| 4 | Admin assigns Task 1 to Asha, 09:00–11:00 | Assignment created, Asha notified |
| 5 | Asha changes Task 1: not_started → in_progress | Status updated |
| 6 | Asha changes Task 1: in_progress → completed | Task completed |
| 7 | Repeat steps 4–6 for Tasks 2–7 | Tasks 2–7 completed |
| 8 | Admin assigns Task 8 to Senior | — |
| 9 | Senior completes and approves Task 8 | senior_approval = approved |
| 10 | Complete Tasks 9 | Prerequisite gate passes (Task 8 approved) |
| 11 | Complete Task 10 | Prerequisite gate passes (Tasks 1, 2, 9 completed) |
| 12 | Complete Tasks 11–13 | — |
| 13 | After Task 13 completed | Case status auto-changes to "completed". Case disappears from active task board. |

---

## 8. Defect Handling Process

### 8.1 Severity Classification

| Severity | Definition | SLA |
|----------|-----------|-----|
| **S1 — Blocker** | System unusable. Data loss. Security breach. | Fix within 4 hours |
| **S2 — Critical** | Core feature broken but workaround exists. | Fix within 24 hours |
| **S3 — Major** | Feature partially broken, non-core impact. | Fix within current sprint |
| **S4 — Minor** | Cosmetic, UX inconsistency, typo. | Fix in next sprint |

### 8.2 Defect Lifecycle

```
Open → Triaged → Assigned → In Progress → Fixed → Verified → Closed
                     ↓                        ↓
                  Deferred                 Reopened
```

### 8.3 Defect Report Template

| Field | Description |
|-------|-------------|
| ID | Auto-generated |
| Title | Short, descriptive |
| Severity | S1–S4 |
| Steps to reproduce | Numbered steps |
| Expected result | What should happen |
| Actual result | What actually happens |
| Screenshots/recordings | Attached |
| Environment | Browser, OS, deployment URL |
| Related test case | TC-XXX |
| Assignee | Developer |

---

## 9. Exit Criteria

### 9.1 MVP Release Exit Criteria

| Criterion | Threshold |
|-----------|-----------|
| All P1 test cases pass | 100% |
| All P2 test cases pass | ≥ 95% (remaining have documented workarounds) |
| No open S1 defects | 0 |
| No open S2 defects | 0 |
| Open S3 defects | ≤ 3 (with documented workarounds) |
| E2E full lifecycle test passes | TC-E2E-001 passes |
| Security tests pass | TC-097 through TC-100 pass |
| Performance targets met | Task board < 3s, API < 1s |
| Lighthouse Accessibility | ≥ 90 |
| UAT sign-off | Admin stakeholder and 1 staff user approve |

### 9.2 UAT Sign-Off Process

1. Stakeholders execute selected user stories in staging environment
2. Each story marked: ✅ Accepted, ❌ Rejected (with defect), ⚠ Accepted with notes
3. All Must stories must be ✅ Accepted
4. Sign-off recorded in a UAT sign-off document with signatures and date

---

## 10. Open Risks

| # | Risk | Impact | Mitigation |
|---|------|--------|------------|
| TR-1 | Supabase free-tier rate limits may affect integration test runs | Tests flaky or slow | Use Supabase local (Docker) for CI; avoid cloud project for automated tests |
| TR-2 | RLS policies are difficult to test exhaustively — edge cases may slip through | Data leakage | Dedicated security test suite (TC-097–100). Manual penetration testing before release. |
| TR-3 | Concurrent reference generation (TC-018) is hard to reproduce reliably in tests | Duplicate references in production | Database-level UPSERT guarantees atomicity. Test with explicit concurrent promises. |
| TR-4 | Real-time notification delivery timing (< 5s) depends on Supabase Realtime, which is third-party | Notifications delayed | Add fallback polling (every 30s) for cases where Realtime disconnects. |
| TR-5 | Browser-specific rendering differences for scheduling grid (time-based layout) | Visual bugs on Safari/Firefox | Include Safari and Firefox in E2E browser matrix. Manual spot-check on first deployment. |
| TR-6 | Leave accrual calculation edge cases (mid-month starts, partial months) | Incorrect remaining balance | Comprehensive unit tests for date arithmetic. Document rounding rules. |
| TR-7 | No staging environment with production-scale data | Performance issues discovered post-launch | Seed staging with 500+ cases. Run performance tests pre-release. |
| TR-8 | UAT conducted by small team — may miss usability issues | Users find app confusing | Plan UAT with at least 2 distinct users (1 admin, 1 staff). Include task completion timing. |

---

*— End of Document —*
