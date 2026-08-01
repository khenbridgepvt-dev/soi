# API Specification

**Project:** Team Scheduling & Task Management System  
**Version:** 1.0  
**Date:** 4 July 2026  
**Framework:** Next.js App Router (Route Handlers)  
**Base URL:** `/api`  
**Sources:**
- [SRS_v4_MVP.md](./SRS_v4_MVP.md)
- [SRS_v4_Advanced.md](./SRS_v4_Advanced.md)
- [system_design.md](./system_design.md)
- [database_schema.md](./database_schema.md)

---

## 1. API Overview

### 1.1 Architecture

This API is implemented as **Next.js Route Handlers** (App Router `route.ts` files), not a standalone REST server. All endpoints live under `/api/` and execute as Vercel serverless functions.

**Two data access patterns coexist:**

| Pattern | Used For | Auth |
|---------|----------|------|
| **API Routes** (`/api/*`) | Multi-step transactions, business logic, server-side validation, writes requiring service-role access | Supabase JWT verified server-side |
| **Direct Supabase Client** | Simple reads, real-time subscriptions, client-side queries protected by RLS | Supabase anon key + JWT (RLS enforced) |

This specification covers **API Routes only**. Direct Supabase reads are protected by RLS policies documented in [database_schema.md](./database_schema.md).

### 1.2 Conventions

| Convention | Detail |
|-----------|--------|
| Content-Type | `application/json` for all requests and responses |
| IDs | All entity IDs are `uuid` strings |
| Timestamps | ISO 8601 format, UTC: `2026-07-04T15:30:00.000Z` |
| Dates | ISO 8601 date: `2026-07-04` |
| Times | 24-hour format: `09:00`, `17:30` |
| Booleans | JSON `true`/`false` |
| Null | JSON `null` for absent optional values |
| Enums | Lowercase snake_case strings matching PostgreSQL enum values |

---

## 2. Authentication

### 2.1 Auth Flow

All API routes (except health check) require a valid Supabase session.

```
Client                      API Route                    Supabase
  │                            │                            │
  │  Request + Authorization   │                            │
  │  header (Bearer JWT)       │                            │
  │ ─────────────────────────▶ │                            │
  │                            │  Verify JWT                │
  │                            │ ──────────────────────────▶│
  │                            │       user { id, role }    │
  │                            │ ◀──────────────────────────│
  │                            │                            │
  │                            │  Execute with service-role │
  │                            │  (bypasses RLS for         │
  │                            │   admin operations)        │
  │                            │ ──────────────────────────▶│
  │                            │                            │
  │        Response            │                            │
  │ ◀───────────────────────── │                            │
```

### 2.2 Auth Header

```
Authorization: Bearer <supabase_access_token>
```

The access token is a JWT issued by Supabase Auth on login. The API route verifies it using `createRouteHandlerClient` from `@supabase/ssr`.

### 2.3 Role Enforcement

Each endpoint specifies a **Required Role**. The API route checks `user.role` from the JWT custom claim:

| Check | Behaviour |
|-------|-----------|
| Role matches | Proceed |
| Role insufficient | Return `403 Forbidden` |
| No valid session | Return `401 Unauthorized` |
| User deactivated (`is_active = false`) | Return `403 Forbidden` with message |

---

## 3. Common Error Format

All error responses follow this structure:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable description of the error.",
    "details": [
      {
        "field": "client_first_name",
        "message": "Client first name is required."
      }
    ]
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `error.code` | string | Yes | Machine-readable error code (see §3.1) |
| `error.message` | string | Yes | Human-readable summary |
| `error.details` | array | No | Field-level errors for validation failures |
| `error.details[].field` | string | When present | The request field that failed validation |
| `error.details[].message` | string | When present | Specific validation failure message |

### 3.1 Error Codes

| HTTP Status | Code | Meaning |
|-------------|------|---------|
| 400 | `VALIDATION_ERROR` | Request body failed validation |
| 400 | `INVALID_STATE_TRANSITION` | Status change not allowed (e.g., completed → not_started) |
| 400 | `PREREQUISITE_NOT_MET` | Business rule prerequisite unsatisfied |
| 401 | `UNAUTHORIZED` | Missing or invalid auth token |
| 403 | `FORBIDDEN` | Valid token but insufficient role |
| 403 | `ACCOUNT_DEACTIVATED` | User account is deactivated |
| 404 | `NOT_FOUND` | Resource does not exist or is soft-deleted |
| 409 | `CONFLICT` | Schedule conflict (double-booking) or duplicate record |
| 409 | `OVERLAP` | Leave dates overlap with existing request |
| 422 | `UNPROCESSABLE` | Request is well-formed but semantically invalid |
| 429 | `RATE_LIMITED` | Too many requests (Supabase/Vercel limit) |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

---

## 4. Pagination, Filtering & Sorting

### 4.1 Pagination

List endpoints support cursor-based or offset-based pagination:

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | integer | `1` | Page number (1-indexed) |
| `limit` | integer | `25` | Items per page. Max: `100`. |

**Response Envelope:**

```json
{
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 25,
    "total": 142,
    "total_pages": 6,
    "has_next": true,
    "has_prev": false
  }
}
```

### 4.2 Filtering

List endpoints accept filter parameters as query strings:

```
GET /api/cases?status=active&is_urgent=true&assigned_to=uuid-here
```

Filter values:
- Enums: exact match (e.g., `status=active`)
- Booleans: `true` or `false`
- UUIDs: exact match
- Dates: `date_from=2026-07-01&date_to=2026-07-31` (range)
- Text: partial match / trigram search (for `q` search param)

### 4.3 Sorting

```
GET /api/cases?sort_by=created_at&sort_order=desc
```

| Param | Type | Default | Values |
|-------|------|---------|--------|
| `sort_by` | string | `created_at` | Varies per endpoint (documented below) |
| `sort_order` | string | `desc` | `asc`, `desc` |

---

## 5. Endpoint List

### 5.1 MVP Endpoints

| # | Method | Path | Purpose | Role |
|---|--------|------|---------|------|
| **Cases** | | | | |
| 1 | POST | `/api/cases` | Create a new lead | admin |
| 2 | GET | `/api/cases` | List cases (paginated, filtered) | admin, staff |
| 3 | GET | `/api/cases/:id` | Get case detail with tasks and dependants | admin, staff |
| 4 | PATCH | `/api/cases/:id` | Update case fields | admin, staff (limited) |
| 5 | POST | `/api/cases/:id/accept` | Accept lead → generate ref + create tasks | admin |
| 6 | POST | `/api/cases/:id/reject` | Reject lead | admin |
| 7 | POST | `/api/cases/:id/urgent` | Toggle urgent flag | admin |
| 8 | DELETE | `/api/cases/:id` | Soft-delete a case | admin |
| **Dependants** | | | | |
| 9 | POST | `/api/cases/:id/dependants` | Add dependant to case | admin |
| 10 | PATCH | `/api/dependants/:id` | Update dependant | admin |
| 11 | DELETE | `/api/dependants/:id` | Soft-delete dependant | admin |
| **Tasks** | | | | |
| 11b| POST | `/api/cases/:id/tasks/custom` | Add a custom task to a case | admin |
| 12 | PATCH | `/api/tasks/:id/status` | Update task status | admin, staff (own) |
| 13 | POST | `/api/tasks/:id/assign` | Assign task to staff + time slot | admin |
| 14 | POST | `/api/tasks/:id/block` | Mark task as blocked | admin, staff (own) |
| 15 | POST | `/api/tasks/:id/unblock` | Unblock task | admin, staff (own) |
| 16 | PATCH | `/api/tasks/:id` | Update task notes | admin, staff (own) |
| 17 | POST | `/api/tasks/:id/senior-review` | Submit senior review outcome (Task 8) | admin, senior |
| **Staff / Profiles** | | | | |
| 18 | POST | `/api/staff` | Create staff member (+ Supabase Auth account) | admin |
| 19 | GET | `/api/staff` | List all staff members | admin |
| 20 | PATCH | `/api/staff/:id` | Update staff profile (name, role, active) | admin |
| 21 | PATCH | `/api/staff/:id/status` | Update online status | self only |
| 22 | PUT | `/api/staff/:id/timetable` | Update staff timetable | admin |
| 23 | GET | `/api/staff/:id/timetable` | Get staff timetable | admin, self |
| **Scheduling** | | | | |
| 24 | GET | `/api/schedule` | Get schedule grid data for a date | admin |
| 25 | GET | `/api/schedule/:staffId` | Get single staff schedule for a date | admin, self |
| **Leave** | | | | |
| 26 | POST | `/api/leave` | Submit leave request | staff |
| 27 | GET | `/api/leave` | List leave requests (filtered) | admin, staff (own) |
| 28 | POST | `/api/leave/:id/approve` | Approve leave request | admin |
| 29 | POST | `/api/leave/:id/reject` | Reject leave request | admin |
| 30 | GET | `/api/leave/allowance/:staffId` | Get leave allowance and balance | admin, self |
| **Leave Allowances** | | | | |
| 31 | PUT | `/api/leave/allowance/:staffId` | Update leave allowance config | admin |
| **Notifications** | | | | |
| 32 | GET | `/api/notifications` | List notifications for current user | all |
| 33 | POST | `/api/notifications/mark-read` | Mark notification(s) as read | all |
| 34 | POST | `/api/notifications/mark-all-read` | Mark all notifications as read | all |
| 34b| POST | `/api/notifications/:id/acknowledge`| Acknowledge urgent notification | staff |
| **Application Types** | | | | |
| 35 | GET | `/api/application-types` | List all application types | all |
| 36 | POST | `/api/application-types` | Create application type | admin |
| 37 | PATCH | `/api/application-types/:id` | Update application type | admin |
| **Search** | | | | |
| 38 | GET | `/api/search` | Global search across cases | admin, staff |
| **Archive** | | | | |
| 39 | GET | `/api/archive` | List soft-deleted records | admin |
| 40 | POST | `/api/archive/:id/restore` | Restore soft-deleted record | admin |
| 41 | DELETE | `/api/archive/purge` | Permanently delete expired records | admin |
| **Dashboard** | | | | |
| 42 | GET | `/api/dashboard/admin` | Admin dashboard summary data | admin |
| 43 | GET | `/api/dashboard/staff` | Staff dashboard priority list | staff |

### 5.2 Advanced Endpoints (Phase 2)

| # | Method | Path | Purpose | Role |
|---|--------|------|---------|------|
| 44 | POST | `/api/tasks/:id/extend` | Request time extension | staff |
| 45 | POST | `/api/extensions/:id/respond` | Approve/deny extension | admin |
| 46 | GET | `/api/extensions` | List extension requests | admin |
| 47 | POST | `/api/overtime/:taskId/propose` | Attach overtime proposal | admin |
| 48 | POST | `/api/overtime/:id/respond` | Accept/reject overtime proposal | staff |
| 49 | GET | `/api/overtime/earnings` | Staff earnings dashboard | staff |
| 50 | GET | `/api/reports/overtime` | Monthly overtime report | admin |
| 51 | GET | `/api/reports/export` | CSV export | admin |
| 52 | GET | `/api/reports/blocked` | Blocked task analytics | admin |
| 53 | GET | `/api/reports/extensions` | Extension analytics | admin |
| 54 | POST | `/api/cases/:id/link` | Link two cases | admin |
| 55 | GET | `/api/cases/:id/history` | Full change history | admin |
| 56 | POST | `/api/tasks/:id/reverse-completion` | Reverse completed task (admin) | admin |
| 57 | POST | `/api/appointments/:caseId/confirm` | Pre-appointment confirmation | admin |
| 58 | POST | `/api/leave` | Submit leave request | staff |
| 59 | GET | `/api/leave` | List leave requests (filtered) | admin, staff (own) |
| 60 | POST | `/api/leave/:id/approve` | Approve leave request | admin |
| 61 | POST | `/api/leave/:id/reject` | Reject leave request | admin |
| 62 | GET | `/api/leave/allowance/:staffId` | Get leave allowance and balance | admin, self |
| 63 | PUT | `/api/leave/allowance/:staffId` | Update leave allowance config | admin |

---

## 6. Endpoint Details — MVP

---

### EP-01 · Create Case (Lead)

| Field | Value |
|-------|-------|
| Method | `POST` |
| Path | `/api/cases` |
| Role | `admin` |
| Scope | MVP |

**Request Body:**

```json
{
  "client_first_name": "Mariya",
  "client_last_name": "Ivanova",
  "application_type_id": "uuid-of-skilled-worker",
  "notes": "Referred by existing client"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `client_first_name` | string | Yes | 1–100 chars |
| `client_last_name` | string | Yes | 1–100 chars |
| `application_type_id` | uuid | Yes | Must exist in `application_types` and be `is_active = true` |
| `notes` | string | No | Max 2000 chars |

**Response — `201 Created`:**

```json
{
  "data": {
    "id": "uuid",
    "client_first_name": "Mariya",
    "client_last_name": "Ivanova",
    "application_type_id": "uuid",
    "application_type_name": "Skilled Worker Visa",
    "status": "lead_pending",
    "reference": null,
    "is_urgent": false,
    "notes": "Referred by existing client",
    "created_by": "admin-uuid",
    "created_at": "2026-07-04T15:30:00.000Z"
  }
}
```

**Errors:**

| Status | Code | Condition |
|--------|------|-----------|
| 400 | `VALIDATION_ERROR` | Missing required fields or invalid values |
| 403 | `FORBIDDEN` | Non-admin user |
| 404 | `NOT_FOUND` | `application_type_id` does not exist |

---

### EP-02 · List Cases

| Field | Value |
|-------|-------|
| Method | `GET` |
| Path | `/api/cases` |
| Role | `admin`, `staff` |
| Scope | MVP |

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | integer | 1 | Page number |
| `limit` | integer | 25 | Items per page (max 100) |
| `status` | enum | — | Filter: `lead_pending`, `active`, `rejected`, `completed` |
| `is_urgent` | boolean | — | Filter by urgency |
| `application_type_id` | uuid | — | Filter by type |
| `assigned_to` | uuid | — | Filter by assigned staff (admin only) |
| `q` | string | — | Search: partial match on client name or reference |
| `sort_by` | string | `created_at` | Options: `created_at`, `client_last_name`, `status`, `last_date` |
| `sort_order` | string | `desc` | `asc` or `desc` |

**Staff Restriction:** Staff users only see cases where they have at least one assigned task. The `assigned_to` filter is ignored — always filtered to `auth.uid()`.

**Response — `200 OK`:**

```json
{
  "data": [
    {
      "id": "uuid",
      "reference": "072601/SKW/VIS",
      "client_first_name": "Vishnu",
      "client_last_name": "Patel",
      "dependant_count": 1,
      "application_type_name": "Skilled Worker Visa",
      "status": "active",
      "is_urgent": true,
      "last_date": "2026-07-28",
      "appointment_date": "2026-07-19T15:30:00.000Z",
      "assigned_staff_name": "Asha",
      "task_completed_count": 7,
      "task_total_count": 13,
      "has_blocked_tasks": false,
      "created_at": "2026-07-01T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 25,
    "total": 42,
    "total_pages": 2,
    "has_next": true,
    "has_prev": false
  }
}
```

---

### EP-03 · Get Case Detail

| Field | Value |
|-------|-------|
| Method | `GET` |
| Path | `/api/cases/:id` |
| Role | `admin`, `staff` (assigned only) |
| Scope | MVP |

**Response — `200 OK`:**

```json
{
  "data": {
    "id": "uuid",
    "reference": "072601/SKW/VIS",
    "client_first_name": "Vishnu",
    "client_last_name": "Patel",
    "application_type": {
      "id": "uuid",
      "name": "Skilled Worker Visa",
      "code": "SKW"
    },
    "status": "active",
    "is_urgent": true,
    "last_date": "2026-07-28",
    "appointment_date": "2026-07-19T15:30:00.000Z",
    "notes": "CoS pending",
    "created_by": { "id": "uuid", "full_name": "Admin" },
    "accepted_at": "2026-07-01T10:05:00.000Z",
    "created_at": "2026-07-01T10:00:00.000Z",
    "dependants": [
      { "id": "uuid", "name": "Priya Patel", "relationship": "spouse" }
    ],
    "tasks": [
      {
        "id": "uuid",
        "sequence": 1,
        "name": "CCL (Client Care Letter)",
        "abbreviation": "CCL",
        "status": "completed",
        "assigned_to": { "id": "uuid", "full_name": "Asha" },
        "notes": null,
        "is_overdue": false,
        "blocked_at": null,
        "completed_at": "2026-07-02T14:00:00.000Z",
        "senior_approval": null,
        "current_assignment": {
          "date": "2026-07-02",
          "start_time": "09:00",
          "end_time": "11:00",
          "duration_minutes": 120
        }
      }
    ],
    "task_summary": {
      "total": 13,
      "completed": 7,
      "in_progress": 1,
      "not_started": 4,
      "blocked": 1
    }
  }
}
```

**Errors:**

| Status | Code | Condition |
|--------|------|-----------|
| 404 | `NOT_FOUND` | Case does not exist or is soft-deleted |
| 403 | `FORBIDDEN` | Staff user not assigned to any task in this case |

---

### EP-04 · Update Case

| Field | Value |
|-------|-------|
| Method | `PATCH` |
| Path | `/api/cases/:id` |
| Role | `admin` (all fields), `staff` (notes, appointment_date only on assigned cases) |
| Scope | MVP |

**Request Body (all fields optional):**

```json
{
  "client_first_name": "Vishnu",
  "client_last_name": "Patel",
  "application_type_id": "uuid",
  "last_date": "2026-08-15",
  "appointment_date": "2026-07-25T10:00:00.000Z",
  "notes": "Updated notes"
}
```

| Field | Type | Validation |
|-------|------|------------|
| `client_first_name` | string | 1–100 chars. Cannot be set to empty/null on active cases. |
| `client_last_name` | string | 1–100 chars. Cannot be set to empty/null on active cases. |
| `reference` | string | Must remain unique. Admin editable only after generation. |
| `application_type_id` | uuid | Must exist and be active |
| `last_date` | date | Cannot be cleared once set (can be changed to a new date) |
| `appointment_date` | timestamptz | Cannot be cleared once set |
| `notes` | string | Max 2000 chars |

**Staff Restriction:** Staff can only update `notes` and `appointment_date`. All other fields return `403`.

**Response — `200 OK`:**

```json
{
  "data": {
    "id": "uuid",
    "updated_at": "2026-07-04T16:00:00.000Z"
  }
}
```

**Errors:**

| Status | Code | Condition |
|--------|------|-----------|
| 400 | `VALIDATION_ERROR` | Invalid field values |
| 400 | `INVALID_STATE_TRANSITION` | Attempted to clear `last_date` or `appointment_date` |
| 404 | `NOT_FOUND` | Case not found |

---

### EP-05 · Accept Lead

| Field | Value |
|-------|-------|
| Method | `POST` |
| Path | `/api/cases/:id/accept` |
| Role | `admin` |
| Scope | MVP |

**Request Body:** None

**Server-Side Transaction:**
1. Verify case exists and `status = 'lead_pending'`
2. **Idempotency check:** If `status = 'active'` (already accepted), return `200 OK` with the existing case data (reference, accepted_at, tasks). This prevents double-click and network-retry issues from creating duplicate tasks or sequence gaps.
3. Generate reference via `reference_counters` UPSERT
4. Update case: `status = 'active'`, `reference = generated`, `accepted_at = now()`
5. Insert 13 default task records (sequence 1–13, `is_custom = false`)
6. Commit transaction

**Response — `200 OK`:**

```json
{
  "data": {
    "id": "uuid",
    "reference": "072604/SKW/MAR",
    "status": "active",
    "accepted_at": "2026-07-04T16:00:00.000Z",
    "tasks_created": 13
  }
}
```

**Errors:**

| Status | Code | Condition |
|--------|------|-----------|
| 400 | `INVALID_STATE_TRANSITION` | Case is not in `lead_pending` or `active` status (i.e., it's `rejected` or `completed`) |
| 404 | `NOT_FOUND` | Case not found |
| 500 | `REFERENCE_GENERATION_FAILED` | Reference counter UPSERT failed (e.g., unique constraint violation from admin-edited reference collision). Transaction rolled back. |
| 500 | `INTERNAL_ERROR` | Transaction failed (rolled back, no partial state) |

---

### EP-06 · Reject Lead

| Field | Value |
|-------|-------|
| Method | `POST` |
| Path | `/api/cases/:id/reject` |
| Role | `admin` |
| Scope | MVP |

**Request Body:**

```json
{
  "reason": "Duplicate of existing case"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `reason` | string | No | Max 500 chars |

**Response — `200 OK`:**

```json
{
  "data": {
    "id": "uuid",
    "status": "rejected"
  }
}
```

**Server-Side Effects:**
1. Update case: `status = 'rejected'`
2. Insert notification for all other admins (type: `urgent_case`, title: "Lead Rejected", body: "Case {client_name} was rejected by {admin_name}. Reason: {reason}"). Excludes the admin who performed the rejection.

**Errors:**

| Status | Code | Condition |
|--------|------|-----------|
| 400 | `INVALID_STATE_TRANSITION` | Case is not in `lead_pending` status |

---

### EP-07 · Toggle Urgent Flag

| Field | Value |
|-------|-------|
| Method | `POST` |
| Path | `/api/cases/:id/urgent` |
| Role | `admin` |
| Scope | MVP |

**Request Body:**

```json
{
  "is_urgent": true
}
```

**Server-Side Effects (when setting `true`):**
1. Update `cases.is_urgent = true`
2. Update all tasks in this case: `tasks.is_urgent = true`
3. Insert notification for each staff member assigned to tasks in this case (type: `urgent_case`)

**Server-Side Effects (when setting `false`):**
1. Update `cases.is_urgent = false`
2. Update all tasks: `tasks.is_urgent = false`
3. No notification on de-escalation

**Response — `200 OK`:**

```json
{
  "data": {
    "id": "uuid",
    "is_urgent": true,
    "notifications_sent": 2
  }
}
```

---

### EP-08 · Soft-Delete Case

| Field | Value |
|-------|-------|
| Method | `DELETE` |
| Path | `/api/cases/:id` |
| Role | `admin` |
| Scope | MVP |

**Server-Side:**
1. Set `cases.is_deleted = true`, `deleted_at = now()`, `deleted_by = auth.uid()`
2. Set `tasks.is_deleted = true`, `deleted_at = now()` for all tasks in this case
3. Set `dependants.is_deleted = true` for all dependants

**Response — `200 OK`:**

```json
{
  "data": {
    "id": "uuid",
    "is_deleted": true,
    "deleted_at": "2026-07-04T16:00:00.000Z"
  }
}
```

**Confirmation:** The frontend must show a confirmation dialog before calling this endpoint. The API does not enforce a confirmation token.

---

### EP-09 · Add Dependant

| Field | Value |
|-------|-------|
| Method | `POST` |
| Path | `/api/cases/:caseId/dependants` |
| Role | `admin` |
| Scope | MVP |

**Request Body:**

```json
{
  "name": "Priya Patel",
  "relationship": "spouse"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `name` | string | Yes | 1–100 chars |
| `relationship` | string | Yes | 1–50 chars |

**Response — `201 Created`:**

```json
{
  "data": {
    "id": "uuid",
    "case_id": "uuid",
    "name": "Priya Patel",
    "relationship": "spouse",
    "created_at": "2026-07-04T16:00:00.000Z"
  }
}
```

---

### EP-10 · Update Dependant

| Field | Value |
|-------|-------|
| Method | `PATCH` |
| Path | `/api/dependants/:id` |
| Role | `admin` |
| Scope | MVP |

**Request Body (all optional):**

```json
{
  "name": "Priya Sharma",
  "relationship": "spouse"
}
```

**Response — `200 OK`:** Updated dependant object.

---

### EP-11 · Soft-Delete Dependant

| Field | Value |
|-------|-------|
| Method | `DELETE` |
| Path | `/api/dependants/:id` |
| Role | `admin` |
| Scope | MVP |

**Response — `200 OK`:** `{ "data": { "id": "uuid", "is_deleted": true } }`

---

### EP-11b · Add Custom Task

| Field | Value |
|-------|-------|
| Method | `POST` |
| Path | `/api/cases/:id/tasks/custom` |
| Role | `admin` |
| Scope | MVP |

**Request Body:**

```json
{
  "name": "Translation Service",
  "abbreviation": "Trans",
  "description": "Obtain certified translations for documents"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `name` | string | Yes | 1–100 chars |
| `abbreviation` | string | Yes | 1–20 chars |
| `description` | string | No | Max 1000 chars |

**Server-Side:**
1. Verify case exists and is active (not completed or rejected).
2. Check count of existing custom tasks (`is_custom = true`) for this case. If >= 5, return 400.
3. Determine next sequence number (max existing sequence + 1).
4. Insert task record (`is_custom = true`, `status = 'not_started'`).

**Response — `201 Created`:**

```json
{
  "data": {
    "id": "uuid",
    "case_id": "uuid",
    "sequence": 14,
    "name": "Translation Service",
    "abbreviation": "Trans",
    "is_custom": true,
    "status": "not_started"
  }
}
```

**Errors:**
- 400 `VALIDATION_ERROR`: Exceeds 5 custom tasks limit.

---

### EP-12 · Update Task Status

| Field | Value |
|-------|-------|
| Method | `PATCH` |
| Path | `/api/tasks/:id/status` |
| Role | `admin`, `staff` (own tasks) |
| Scope | MVP |

**Request Body:**

```json
{
  "status": "in_progress"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `status` | enum | Yes | `not_started`, `in_progress`, `completed` |

**Allowed Transitions:**

| From | To | Condition |
|------|----|-----------|
| `not_started` | `in_progress` | None |
| `in_progress` | `completed` | Prerequisite check passes (see below) |
| `in_progress` | `blocked` | Use EP-14 instead |
| `blocked` | `in_progress` | Use EP-15 instead |
| `completed` | `in_progress` | Advanced only (EP-56). MVP: denied. |

**Prerequisite Checks (on `completed`):**

| Task (sequence) | Prerequisite |
|-----------------|-------------|
| 10 (Payment) | Tasks 1 (CCL), 2 (LOA), 9 (Disclaimer) must be `completed` |
| 9 (Disclaimer) | Task 8 must have `senior_approval = 'approved'` |

**Server-Side Effects (on `completed`):**
1. Set `completed_at = now()`, `completed_by = auth.uid()`
2. Check if all tasks (default + custom) for the case are now `completed` → if so, set `cases.status = 'completed'`, `cases.completed_at = now()`

**Response — `200 OK`:**

```json
{
  "data": {
    "id": "uuid",
    "status": "in_progress",
    "updated_at": "2026-07-04T16:00:00.000Z",
    "case_completed": false
  }
}
```

**Errors:**

| Status | Code | Condition |
|--------|------|-----------|
| 400 | `INVALID_STATE_TRANSITION` | Transition not allowed (e.g., `not_started` → `completed`) |
| 400 | `PREREQUISITE_NOT_MET` | Task 10/9 prerequisites not satisfied. `details` lists outstanding tasks. |
| 403 | `FORBIDDEN` | Staff trying to update a task not assigned to them |

---

### EP-13 · Assign Task

| Field | Value |
|-------|-------|
| Method | `POST` |
| Path | `/api/tasks/:id/assign` |
| Role | `admin` |
| Scope | MVP |

**Request Body:**

```json
{
  "staff_id": "uuid",
  "date": "2026-07-07",
  "start_time": "11:00",
  "duration_minutes": 120
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `staff_id` | uuid | Yes | Must exist in `profiles`, `is_active = true`, role is `staff` or `senior` |
| `date` | date | Yes | Must be today or future. **"Today" is defined as the current date in UTC.** All date comparisons use UTC to prevent timezone ambiguity between UK and India users. |
| `start_time` | time (HH:MM) | Yes | Must be within staff timetable for that day of the week |
| `duration_minutes` | integer | Yes | Min 15, max 480 (8 hours) |

**Server-Side:**
1. Calculate `end_time = start_time + duration_minutes`
2. Check for conflicts: query `task_assignments` for overlapping slots on the same `staff_id` + `date` where `is_released = false`. **The database EXCLUDE constraint is the final backstop — this application-level check provides a user-friendly error message before hitting the constraint.**
3. ~~Check if staff is on approved leave on that date~~ (**MVP:** Leave Management is Advanced. This check is skipped in MVP. When Leave Management is activated in Phase 2, this step queries `leave_requests WHERE staff_id = :staff_id AND status = 'approved' AND start_date <= :date AND end_date >= :date`.)
4. Check if slot is within staff timetable working hours
5. Insert `task_assignment` record
6. Update `tasks.assigned_to = staff_id` (set to the staff_id from the **most recent non-released assignment** for this task)
7. If task was `is_overdue = true` and the new assignment's `date + end_time` is in the future, reset `tasks.is_overdue = false`
8. Create notification for staff (type: `new_task`)

**Response — `201 Created`:**

```json
{
  "data": {
    "task_id": "uuid",
    "assignment_id": "uuid",
    "staff_id": "uuid",
    "staff_name": "Asha",
    "date": "2026-07-07",
    "start_time": "11:00",
    "end_time": "13:00",
    "duration_minutes": 120,
    "is_overtime": false,
    "notification_sent": true
  }
}
```

**Errors:**

| Status | Code | Condition | Details |
|--------|------|-----------|---------|
| 409 | `CONFLICT` | Time slot overlaps with existing assignment | `{ "conflicting_task": { "id": "uuid", "name": "CCL", "start_time": "10:00", "end_time": "12:00" } }` |
| 409 | `CONFLICT` | Staff is on leave on that date | `{ "leave_dates": "2026-07-07 to 2026-07-09" }` |
| 422 | `UNPROCESSABLE` | Start time is outside staff working hours | `{ "working_hours": { "start": "09:00", "end": "17:00" } }` |
| 400 | `VALIDATION_ERROR` | Past date, invalid duration, etc. | Field-level details |

---

### EP-14 · Block Task

| Field | Value |
|-------|-------|
| Method | `POST` |
| Path | `/api/tasks/:id/block` |
| Role | `admin`, `staff` (own tasks) |
| Scope | MVP |

**Request Body:**

```json
{
  "reason": "Client not responding to emails"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `reason` | string | No | Max 500 chars |

**Server-Side:**
1. Verify task is `in_progress` (cannot block `not_started` or `completed`)
2. Update task: `status = 'blocked'`, `blocked_at = now()`, `blocked_reason = reason`
3. Mark all future `task_assignments` for this task as `is_released = true`, `released_at = now()`
4. Create notification for admins (type: `task_blocked`)

**Response — `200 OK`:**

```json
{
  "data": {
    "id": "uuid",
    "status": "blocked",
    "blocked_at": "2026-07-04T16:00:00.000Z",
    "blocked_reason": "Client not responding to emails",
    "slots_released": 1
  }
}
```

**Errors:**

| Status | Code | Condition |
|--------|------|-----------|
| 400 | `INVALID_STATE_TRANSITION` | Task is not `in_progress` |

---

### EP-15 · Unblock Task

| Field | Value |
|-------|-------|
| Method | `POST` |
| Path | `/api/tasks/:id/unblock` |
| Role | `admin`, `staff` (own tasks) |
| Scope | MVP |

**Request Body:** None

**Server-Side:**
1. Verify task is `blocked`
2. Update task: `status = 'in_progress'`, `blocked_at = NULL`, `blocked_reason = NULL`

> **Note:** Unblocking does NOT automatically reschedule. The admin must assign a new time slot via EP-13.

**Response — `200 OK`:**

```json
{
  "data": {
    "id": "uuid",
    "status": "in_progress",
    "requires_rescheduling": true
  }
}
```

---

### EP-16 · Update Task Notes

| Field | Value |
|-------|-------|
| Method | `PATCH` |
| Path | `/api/tasks/:id` |
| Role | `admin`, `staff` (own tasks) |
| Scope | MVP |

**Request Body:**

```json
{
  "notes": "CoS pending, follow up Friday"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `notes` | string | Yes | Max 500 chars. Can be empty string to clear. |

**Response — `200 OK`:** `{ "data": { "id": "uuid", "notes": "CoS pending, follow up Friday", "updated_at": "..." } }`

---

### EP-17 · Senior Review Outcome (Task 8)

| Field | Value |
|-------|-------|
| Method | `POST` |
| Path | `/api/tasks/:id/senior-review` |
| Role | `admin`, `senior` |
| Scope | MVP |

**Request Body:**

```json
{
  "outcome": "approved",
  "revision_notes": null
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `outcome` | enum | Yes | `approved` or `revisions_required` |
| `revision_notes` | string | Required if `revisions_required` | Max 1000 chars |

**Server-Side (if `approved`):**
1. Set `tasks.senior_approval = 'approved'` on the Task 8 record
2. Set `tasks.status = 'completed'`, `completed_at = now()`, `completed_by = auth.uid()`

**Server-Side (if `revisions_required`):**
1. Set `tasks.senior_approval = 'revisions_required'`, `tasks.revision_notes = revision_notes`
2. Set `tasks.status = 'completed'` with outcome noted (Task 8 is "done" but with revisions)
3. Find Task 5 (same case, sequence = 5): set `status = 'in_progress'`, clear `completed_at`
4. Create notification for staff assigned to Task 5

**Errors:**

| Status | Code | Condition |
|--------|------|-----------|
| 400 | `VALIDATION_ERROR` | Task is not sequence 8 |
| 400 | `INVALID_STATE_TRANSITION` | Task 8 is not `in_progress` |
| 403 | `FORBIDDEN` | User is not admin or senior |

---

### EP-18 · Create Staff Member

| Field | Value |
|-------|-------|
| Method | `POST` |
| Path | `/api/staff` |
| Role | `admin` |
| Scope | MVP |

**Request Body:**

```json
{
  "full_name": "Asha Kumar",
  "email": "asha@firm.com",
  "role": "staff",
  "password": "temp-password-123",
  "timetable": {
    "mon_start": "09:00", "mon_end": "17:00",
    "tue_start": "09:00", "tue_end": "17:00",
    "wed_start": "09:00", "wed_end": "17:00",
    "thu_start": "09:00", "thu_end": "17:00",
    "fri_start": "09:00", "fri_end": "17:00",
    "sat_start": null, "sat_end": null,
    "sun_start": null, "sun_end": null
  }
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `full_name` | string | Yes | 1–100 chars |
| `email` | string | Yes | Valid email, unique across auth.users |
| `role` | enum | Yes | `staff` or `senior` |
| `password` | string | Yes | Min 8 chars |
| `timetable` | object | No | If omitted, defaults to Mon–Fri 09:00–17:00 |

**Server-Side:**
1. Create Supabase Auth user (via admin API with service-role key)
2. Profile, timetable, and leave_allowances are auto-created by database trigger
3. Update profile with `full_name`, `role` if trigger doesn't capture them

**Response — `201 Created`:**

```json
{
  "data": {
    "id": "uuid",
    "full_name": "Asha Kumar",
    "email": "asha@firm.com",
    "role": "staff",
    "is_active": true
  }
}
```

**Errors:**

| Status | Code | Condition |
|--------|------|-----------|
| 409 | `CONFLICT` | Email already exists |

---

### EP-19 · List Staff

| Field | Value |
|-------|-------|
| Method | `GET` |
| Path | `/api/staff` |
| Role | `admin` |
| Scope | MVP |

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `is_active` | boolean | `true` | Filter by active/inactive |
| `role` | enum | — | Filter by role |

**Response — `200 OK`:**

```json
{
  "data": [
    {
      "id": "uuid",
      "full_name": "Asha Kumar",
      "email": "asha@firm.com",
      "role": "staff",
      "is_active": true,
      "online_status": "online",
      "active_case_count": 4,
      "tasks_today_count": 3,
      "overdue_count": 1,
      "blocked_count": 0,
      "working_hours": "09:00–17:00"
    }
  ]
}
```

---

### EP-20 · Update Staff Profile

| Field | Value |
|-------|-------|
| Method | `PATCH` |
| Path | `/api/staff/:id` |
| Role | `admin` |
| Scope | MVP |

**Request Body (all optional):**

```json
{
  "full_name": "Asha Kumar-Patel",
  "role": "senior",
  "is_active": false
}
```

**Server-Side (on deactivation):** When `is_active` changes to `false`, the user's Supabase Auth account is disabled (they cannot log in).

---

### EP-21 · Update Online Status

| Field | Value |
|-------|-------|
| Method | `PATCH` |
| Path | `/api/staff/:id/status` |
| Role | Self only (`id` must equal `auth.uid()`) |
| Scope | MVP |

**Request Body:**

```json
{
  "online_status": "online"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `online_status` | enum | Yes | `online`, `break`, `offline` |

**Response — `200 OK`:** `{ "data": { "id": "uuid", "online_status": "online" } }`

---

### EP-22 · Update Staff Timetable

| Field | Value |
|-------|-------|
| Method | `PUT` |
| Path | `/api/staff/:id/timetable` |
| Role | `admin` |
| Scope | MVP |

**Request Body:**

```json
{
  "mon_start": "09:00", "mon_end": "17:00",
  "tue_start": "09:00", "tue_end": "17:00",
  "wed_start": "09:00", "wed_end": "17:00",
  "thu_start": "09:00", "thu_end": "17:00",
  "fri_start": "09:00", "fri_end": "17:00",
  "sat_start": null, "sat_end": null,
  "sun_start": null, "sun_end": null
}
```

**Validation:** For each day, either both `_start` and `_end` are provided (valid time pair), or both are `null`. Mixed is rejected.

**Response — `200 OK`:** Updated timetable object.

---

### EP-23 · Get Staff Timetable

| Field | Value |
|-------|-------|
| Method | `GET` |
| Path | `/api/staff/:id/timetable` |
| Role | `admin`, self |
| Scope | MVP |

**Response — `200 OK`:** Full timetable object with all 7 days.

---

### EP-24 · Get Schedule Grid

| Field | Value |
|-------|-------|
| Method | `GET` |
| Path | `/api/schedule` |
| Role | `admin` |
| Scope | MVP |

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `date` | date | Yes | The day to show |

**Response — `200 OK`:**

```json
{
  "data": {
    "date": "2026-07-07",
    "staff": [
      {
        "id": "uuid",
        "full_name": "Asha",
        "online_status": "online",
        "working_hours": { "start": "09:00", "end": "17:00" },
        "is_on_leave": false,
        "assignments": [
          {
            "id": "uuid",
            "task_id": "uuid",
            "task_name": "CCL",
            "task_abbreviation": "CCL",
            "case_reference": "072604/SKW/MAR",
            "client_name": "Mariya Ivanova",
            "start_time": "09:00",
            "end_time": "11:00",
            "duration_minutes": 120,
            "is_urgent": false,
            "task_status": "in_progress"
          }
        ],
        "available_slots": [
          { "start": "11:00", "end": "13:00" },
          { "start": "15:00", "end": "17:00" }
        ]
      }
    ]
  }
}
```

**`available_slots` calculation:** Derived from timetable minus assignments minus leave. Contiguous free periods merged into single slots.

---

### EP-25 · Get Staff Schedule

| Field | Value |
|-------|-------|
| Method | `GET` |
| Path | `/api/schedule/:staffId` |
| Role | `admin`, self |
| Scope | MVP |

Same as EP-24 but filtered to a single staff member. Staff can only query their own ID.

---

### EP-26 · Submit Leave Request

| Field | Value |
|-------|-------|
| Method | `POST` |
| Path | `/api/leave` |
| Role | `staff`, `senior` |
| Scope | Advanced |

**Request Body:**

```json
{
  "leave_type": "holiday",
  "start_date": "2026-07-25",
  "end_date": "2026-07-25",
  "reason": "Personal"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `leave_type` | enum | Yes | `holiday` or `sick` |
| `start_date` | date | Yes | Today or future |
| `end_date` | date | Yes | ≥ `start_date` |
| `reason` | string | No | Max 500 chars |

**Server-Side:**
1. Calculate `days_count` (working days in range, based on staff timetable)
2. Check for overlapping `pending` or `approved` requests
3. Check remaining allowance → set `is_over_limit` flag
4. Insert `leave_requests` with `status = 'pending'`
5. Create notification for all admins (type: `leave_requested`)

**Response — `201 Created`:**

```json
{
  "data": {
    "id": "uuid",
    "leave_type": "holiday",
    "start_date": "2026-07-25",
    "end_date": "2026-07-25",
    "days_count": 1,
    "status": "pending",
    "is_over_limit": false,
    "remaining_after": 7
  }
}
```

**Errors:**

| Status | Code | Condition |
|--------|------|-----------|
| 409 | `OVERLAP` | Dates overlap with existing request |
| 400 | `VALIDATION_ERROR` | Past dates, end before start |

---

### EP-27 · List Leave Requests

| Field | Value |
|-------|-------|
| Method | `GET` |
| Path | `/api/leave` |
| Role | `admin` (all), `staff` (own) |
| Scope | Advanced |

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `status` | enum | — | `pending`, `approved`, `rejected` |
| `staff_id` | uuid | — | Admin filter by staff |
| `leave_type` | enum | — | `holiday`, `sick` |
| `date_from` | date | — | Requests with `end_date >= date_from` |
| `date_to` | date | — | Requests with `start_date <= date_to` |

**Response — `200 OK`:** Paginated list of leave request objects.

---

### EP-28 · Approve Leave

| Field | Value |
|-------|-------|
| Method | `POST` |
| Path | `/api/leave/:id/approve` |
| Role | `admin` |
| Scope | Advanced |

**Request Body:**

```json
{
  "excess_handling": "paid"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `excess_handling` | enum | Only if `is_over_limit = true` | `paid` or `salary_deduction` |

**Server-Side:**
1. Update leave request: `status = 'approved'`, `approved_by`, `approved_at`
2. If `is_over_limit`: set `excess_handling`
3. Check for task assignments on approved leave dates → include in response as warnings
4. Create notification for staff (type: `leave_approved`)

**Response — `200 OK`:**

```json
{
  "data": {
    "id": "uuid",
    "status": "approved",
    "scheduling_conflicts": [
      {
        "task_name": "App Preparation",
        "case_reference": "072601/SKW/VIS",
        "date": "2026-07-25",
        "start_time": "09:00"
      }
    ]
  }
}
```

---

### EP-29 · Reject Leave

| Field | Value |
|-------|-------|
| Method | `POST` |
| Path | `/api/leave/:id/reject` |
| Role | `admin` |
| Scope | Advanced |

**Request Body:**

```json
{
  "reason": "Team is understaffed that week"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `reason` | string | Yes | 1–500 chars |

---

### EP-30 · Get Leave Allowance

| Field | Value |
|-------|-------|
| Method | `GET` |
| Path | `/api/leave/allowance/:staffId` |
| Role | `admin`, self |
| Scope | Advanced |

**Response — `200 OK`:**

```json
{
  "data": {
    "staff_id": "uuid",
    "holiday": {
      "total_annual": 12,
      "accrued": 7,
      "used": 3,
      "remaining": 4
    },
    "sick": {
      "total_annual": 12,
      "accrued": 7,
      "used": 1,
      "remaining": 6
    },
    "accrual_rate_per_month": 1.0,
    "accrual_start_date": "2026-01-01",
    "next_accrual_date": "2026-08-01"
  }
}
```

**Computed fields:** `accrued`, `used`, `remaining`, `next_accrual_date` are calculated server-side from `leave_allowances` + approved `leave_requests`.

---

### EP-31 · Update Leave Allowance

| Field | Value |
|-------|-------|
| Method | `PUT` |
| Path | `/api/leave/allowance/:staffId` |
| Role | `admin` |
| Scope | Advanced |

**Request Body:**

```json
{
  "holiday_total_annual": 15,
  "sick_total_annual": 12,
  "accrual_rate_per_month": 1.25,
  "accrual_start_date": "2026-01-01"
}
```

---

### EP-32 · List Notifications

| Field | Value |
|-------|-------|
| Method | `GET` |
| Path | `/api/notifications` |
| Role | All (own only) |
| Scope | MVP |

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `is_read` | boolean | — | Filter read/unread |
| `page` | integer | 1 | |
| `limit` | integer | 25 | Max 100 |

**Response — `200 OK`:**

```json
{
  "data": [
    {
      "id": "uuid",
      "type": "urgent_case",
      "title": "URGENT: Case 072601/SKW/VIS",
      "body": "Case flagged as urgent by Admin",
      "is_urgent": true,
      "is_read": false,
      "case_id": "uuid",
      "task_id": null,
      "created_at": "2026-07-04T16:00:00.000Z"
    }
  ],
  "pagination": { ... },
  "unread_count": 3
}
```

---

### EP-33 · Mark Notifications Read

| Field | Value |
|-------|-------|
| Method | `POST` |
| Path | `/api/notifications/mark-read` |
| Role | All |
| Scope | MVP |

**Request Body:**

```json
{
  "notification_ids": ["uuid-1", "uuid-2"]
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `notification_ids` | uuid[] | Yes | 1–100 IDs. Must belong to current user. |

**Response — `200 OK`:** `{ "data": { "marked_read": 2 } }`

---

### EP-34 · Mark All Notifications Read

| Field | Value |
|-------|-------|
| Method | `POST` |
| Path | `/api/notifications/mark-all-read` |
| Role | All |
| Scope | MVP |

**Request Body:** None

**Response — `200 OK`:** `{ "data": { "marked_read": 15 } }`

---

### EP-35 · List Application Types

| Field | Value |
|-------|-------|
| Method | `GET` |
| Path | `/api/application-types` |
| Role | All |
| Scope | MVP |

**Query Parameters:**

| Param | Type | Default |
|-------|------|---------|
| `is_active` | boolean | — (admin sees all; staff sees active only) |

**Response — `200 OK`:**

```json
{
  "data": [
    { "id": "uuid", "name": "Skilled Worker Visa", "code": "SKW", "is_active": true, "sort_order": 1 }
  ]
}
```

> **Ordering:** Results are returned sorted by `sort_order ASC, name ASC`.

---

### EP-36 · Create Application Type

| Field | Value |
|-------|-------|
| Method | `POST` |
| Path | `/api/application-types` |
| Role | `admin` |
| Scope | MVP |

**Request Body:**

```json
{
  "name": "Ancestry Visa",
  "code": "ANC"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `name` | string | Yes | 2–100 chars, unique |
| `code` | string | Yes | Exactly 3 uppercase letters, unique, regex `^[A-Z]{3}$` |

**Errors:**

| Status | Code | Condition |
|--------|------|-----------|
| 409 | `CONFLICT` | Name or code already exists |

---

### EP-37 · Update Application Type

| Field | Value |
|-------|-------|
| Method | `PATCH` |
| Path | `/api/application-types/:id` |
| Role | `admin` |
| Scope | MVP |

**Request Body (all optional):**

```json
{
  "name": "Ancestry Visa (Updated)",
  "is_active": false
}
```

> **Note:** `code` cannot be changed if any case has used this application type (to preserve reference integrity).

**Errors:**

| Status | Code | Condition |
|--------|------|-----------|
| 409 | `IMMUTABLE_CODE` | Attempted to change `code` when cases reference this application type. `details: { "cases_using_type": 12 }` |
| 409 | `CONFLICT` | Updated `name` conflicts with an existing name |

---

### EP-38 · Global Search

| Field | Value |
|-------|-------|
| Method | `GET` |
| Path | `/api/search` |
| Role | `admin`, `staff` |
| Scope | MVP |

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `q` | string | Yes | Min 2 chars. Searches case reference, client name (first + last), and **assigned staff member name**. |
| `limit` | integer | No | Default 8, max 20 |

**Response — `200 OK`:**

```json
{
  "data": [
    {
      "id": "uuid",
      "reference": "072601/SKW/VIS",
      "client_name": "Vishnu Patel",
      "status": "active",
      "is_urgent": true,
      "assigned_staff": "Asha"
    }
  ]
}
```

**Staff Restriction:** Results filtered to cases where staff has assigned tasks.

---

### EP-39 · List Archived Records

| Field | Value |
|-------|-------|
| Method | `GET` |
| Path | `/api/archive` |
| Role | `admin` |
| Scope | MVP |

**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `type` | enum | `case`, `task`, `dependant` |
| `page`, `limit` | integer | Pagination |

**Response — `200 OK`:** Paginated list of soft-deleted records with `deleted_at`, `deleted_by`.

---

### EP-40 · Restore Archived Record

| Field | Value |
|-------|-------|
| Method | `POST` |
| Path | `/api/archive/:id/restore` |
| Role | `admin` |
| Scope | MVP |

**Request Body:**

```json
{
  "type": "case"
}
```

**Server-Side:** Set `is_deleted = false`, `deleted_at = NULL`. For cases, also restore child tasks and dependants.

---

### EP-41 · Purge Expired Records

| Field | Value |
|-------|-------|
| Method | `DELETE` |
| Path | `/api/archive/purge` |
| Role | `admin` |
| Scope | MVP |

**Request Body:**

```json
{
  "retention_days": 30
}
```

**Server-Side:** Hard-delete all soft-deleted records where `deleted_at < now() - retention_days`. Cascading deletes handle children.

**Response — `200 OK`:** `{ "data": { "purged_cases": 2, "purged_tasks": 8, "purged_dependants": 3 } }`

---

### EP-42 · Admin Dashboard Summary

| Field | Value |
|-------|-------|
| Method | `GET` |
| Path | `/api/dashboard/admin` |
| Role | `admin` |
| Scope | MVP |

**Response — `200 OK`:**

```json
{
  "data": {
    "active_cases": 24,
    "urgent_cases": 3,
    "blocked_tasks": 7,
    "overdue_tasks": 2,
    "pending_leads": [
      {
        "id": "uuid",
        "client_name": "Kim Park",
        "application_type": "Spouse Visa",
        "created_at": "2026-07-04T10:00:00.000Z"
      }
    ],
    "team_status": [
      {
        "id": "uuid",
        "full_name": "Asha",
        "online_status": "online",
        "active_task_count": 4,
        "is_on_leave": false
      }
    ],
    "schedule_summary": [
      {
        "staff_id": "uuid",
        "staff_name": "Asha",
        "booked_hours": 4.0,
        "available_hours": 4.0,
        "total_hours": 8.0,
        "is_on_leave": false
      }
    ]
  }
}
```

---

### EP-43 · Staff Dashboard

| Field | Value |
|-------|———-|
| Method | `GET` |
| Path | `/api/dashboard/staff` |
| Role | `staff`, `senior` |
| Scope | MVP |

**Query Parameters:**

| Param | Type | Default | Description |
|———-|———|————-|——————-|
| `view` | enum | `today` | `today` (today + overdue + blocked), `week` (next 7 days), `all` (everything assigned) |

**Response — `200 OK`:**

```json
{
  "data": {
    "today_task_count": 4,
    "overdue_count": 1,
    "blocked_count": 1,
    "due_this_week_count": 8,
    "priority_list": [
      {
        "id": "uuid",
        "sequence": 5,
        "name": "Application Preparation",
        "abbreviation": "App",
        "case_id": "uuid",
        "case_reference": "072601/SKW/VIS",
        "client_name": "Vishnu Patel",
        "dependant_summary": "+1",
        "status": "in_progress",
        "is_urgent": true,
        "is_overdue": false,
        "current_assignment": {
          "date": "2026-07-07",
          "start_time": "11:00",
          "end_time": "13:00"
        },
        "priority_rank": 1
      }
    ]
  }
}
```

> **Default view (`today`):** Returns only tasks scheduled for today + any overdue tasks + any blocked tasks. This keeps the payload small and the dashboard fast. Staff can switch to `week` or `all` views for broader visibility.

**Priority ordering logic (computed server-side):**
1. Urgent tasks (sorted by deadline ascending)
2. Overdue tasks (sorted by overdue duration descending)
3. Approaching deadline (deadline within 3 days, sorted ascending)
4. On-track tasks (sorted by today's scheduled time, then by deadline)
5. Blocked tasks (always last — cannot be actioned)

---

### EP-55 · Change Password (Self-Service)

| Field | Value |
|-------|-------|
| Method | `POST` |
| Path | `/api/auth/change-password` |
| Role | All (authenticated) |
| Scope | MVP |

**Request Body:**

```json
{
  "current_password": "oldPassword123",
  "new_password": "newSecurePassword456"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `current_password` | string | Yes | Must match current password |
| `new_password` | string | Yes | Min 8 chars, at least 1 uppercase letter, 1 number. Must not equal current password. |

**Server-Side:**
1. Verify current password via `supabase.auth.signInWithPassword()` (validates credentials)
2. Update password via `supabase.auth.updateUser({ password: new_password })`
3. Update `profiles.password_changed_at = now()` (if column exists)

**Response — `200 OK`:** `{ "data": { "message": "Password updated successfully" } }`

**Errors:**

| Status | Code | Condition |
|--------|------|-----------|
| 400 | `INVALID_CREDENTIALS` | Current password is incorrect |
| 400 | `WEAK_PASSWORD` | New password does not meet complexity requirements |

---

### EP-56 · Admin Reset Staff Password

| Field | Value |
|-------|-------|
| Method | `POST` |
| Path | `/api/admin/reset-password/:userId` |
| Role | `admin` |
| Scope | MVP |

**Request Body:**

```json
{
  "temporary_password": "tempPass789"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `temporary_password` | string | Yes | Min 8 chars, at least 1 uppercase letter, 1 number |

**Server-Side:**
1. Verify target user exists in `profiles`
2. Update password via `supabase.auth.admin.updateUserById(userId, { password: temporary_password })`
3. The staff member should be advised to change this password on next login

**Response — `200 OK`:** `{ "data": { "message": "Password reset for staff member", "user_id": "uuid" } }`

---

### EP-57 · Staff My Cases

| Field | Value |
|-------|-------|
| Method | `GET` |
| Path | `/api/staff/my-cases` |
| Role | `staff`, `senior` |
| Scope | MVP |

**Response — `200 OK`:**

```json
{
  "data": [
    {
      "id": "uuid",
      "reference": "072601/SKW/VIS",
      "client_name": "Vishnu Patel",
      "application_type": "Skilled Worker Visa",
      "status": "active",
      "is_urgent": true,
      "my_tasks_count": 3,
      "my_completed_count": 1,
      "total_tasks": 13
    }
  ]
}
```

**Server-Side:** Returns cases where the authenticated staff member has at least one non-deleted task assigned to them. Equivalent to: `SELECT DISTINCT cases.* FROM cases JOIN tasks ON tasks.case_id = cases.id WHERE tasks.assigned_to = auth.uid() AND tasks.is_deleted = false AND cases.is_deleted = false AND cases.status = 'active'`.

---

### EP-58 · Release Task Assignment

| Field | Value |
|-------|-------|
| Method | `DELETE` |
| Path | `/api/tasks/:taskId/assignments/:assignmentId` |
| Role | `admin` |
| Scope | MVP |

**Server-Side:**
1. Verify assignment exists and `is_released = false`
2. Set `is_released = true`, `released_at = now()`
3. If no other non-released assignments remain for this task, set `tasks.assigned_to = NULL`

**Response — `200 OK`:** `{ "data": { "released": true, "task_id": "uuid", "assignment_id": "uuid" } }`

---

### EP-59 · Reassign Task

| Field | Value |
|-------|-------|
| Method | `POST` |
| Path | `/api/tasks/:id/reassign` |
| Role | `admin` |
| Scope | MVP |

**Request Body:**

```json
{
  "staff_id": "uuid",
  "date": "2026-07-08",
  "start_time": "09:00",
  "duration_minutes": 120
}
```

**Server-Side (atomic):**
1. Release all current non-released assignments for this task (`is_released = true`, `released_at = now()`)
2. Create a new assignment (same validation as EP-13: conflict check, timetable check, etc.)
3. Update `tasks.assigned_to = staff_id`
4. Create notification for the new assignee (type: `new_task`)
5. Create notification for the previous assignee if different (type: `new_task`, title: "Task Reassigned")

**Response — `201 Created`:** Same as EP-13.

**Errors:** Same as EP-13 (CONFLICT, UNPROCESSABLE, VALIDATION_ERROR).

---

## 7. Advanced Endpoints (Phase 2 — Specifications)

Provided at summary level for planning. Full request/response schemas to be defined before Phase 2 development.

---

### EP-44 · Request Task Extension

**`POST /api/tasks/:id/extend`** · Staff

Body: `{ "reason": "...", "additional_minutes": 60 }`. Creates `task_extensions` record. Notifies admins.

---

### EP-45 · Respond to Extension

**`POST /api/extensions/:id/respond`** · Admin

Body: `{ "outcome": "approved" | "denied", "reason": "..." }`. If approved: extends `task_assignments.end_time`, shifts subsequent assignments. Notifies staff.

---

### EP-46 · List Extensions

**`GET /api/extensions`** · Admin

Paginated list. Filters: `status`, `staff_id`, `date_from`, `date_to`.

---

### EP-47 · Propose Overtime

**`POST /api/overtime/:taskId/propose`** · Admin

Body: `{ "compensation_type": "fixed" | "hourly", "compensation_amount": 25.00 }`. Notifies staff.

---

### EP-48 · Respond to Overtime Proposal

**`POST /api/overtime/:id/respond`** · Staff

Body: `{ "accepted": true | false }`. If rejected, notifies admin.

---

### EP-49 · Staff Earnings

**`GET /api/overtime/earnings`** · Staff

Returns current month's accepted overtime: hours, compensation, breakdown by task.

---

### EP-50 · Monthly Overtime Report

**`GET /api/reports/overtime?month=2026-07`** · Admin

Returns: per-staff regular hours, overtime hours, compensation.

---

### EP-51 · CSV Export

**`GET /api/reports/export?type=overtime&month=2026-07`** · Admin

Returns `Content-Type: text/csv` file download. Types: `overtime`, `tasks`, `scheduling`.

---

### EP-52 · Blocked Task Analytics

**`GET /api/reports/blocked`** · Admin

Returns: most-blocked cases, average blocked duration by task type, clients with most blocks.

---

### EP-53 · Extension Analytics

**`GET /api/reports/extensions`** · Admin

Returns: extensions per staff, per task type, approval rate, average extra time.

---

### EP-54 · Link Cases

**`POST /api/cases/:id/link`** · Admin

Body: `{ "linked_case_id": "uuid", "link_type": "follow_up" }`.

---

### EP-55 · Case Change History

**`GET /api/cases/:id/history`** · Admin

Returns: paginated audit log entries for the case and its tasks.

---

### EP-56 · Reverse Task Completion

**`POST /api/tasks/:id/reverse-completion`** · Admin

Body: `{ "reason": "Marked complete by mistake" }`. Sets status back to `in_progress`. Logs to audit trail.

---

### EP-57 · Pre-Appointment Confirmation

**`POST /api/appointments/:caseId/confirm`** · Admin

Body: `{ "task_12_confirmed": true, "task_13_confirmed": true, "details_confirmed": true }`. All must be `true`. Records confirmation in audit log.

---

## 8. Versioning Strategy

### Current Approach

No URL versioning for MVP. All endpoints are under `/api/` without a version prefix.

**Rationale:** This is a single-tenant, single-client application. There are no external API consumers. Versioning overhead is not justified.

### Future Versioning (If Needed)

If breaking changes are required post-launch:

```
/api/v2/cases
```

- Existing endpoints remain at `/api/` (treated as v1)
- New versions introduced at `/api/v2/`
- Sunset period: 3 months before removing old endpoints

---

## 9. Rate Limiting

Rate limits are enforced at two levels: infrastructure (Supabase + Vercel) and application.

### 9.1 Infrastructure Rate Limits

| Layer | Limit | Notes |
|———-|———-|———-|
| Supabase Auth | 30 login attempts per hour per IP | Built-in |
| Supabase API | 1000 requests per second (free tier) | Well above expected usage |
| Vercel Serverless | 100 invocations per second (free tier) | Well above expected usage |

### 9.2 Application-Level Rate Limits

Expensive mutation endpoints have application-level rate limiting via Vercel Edge Middleware or in-memory counters:

| Endpoint | Limit | Reason |
|—————|———-|————|
| `POST /api/cases/:id/accept` (EP-05) | 10 req/min per user | Heavy transaction (reference gen + 13 task inserts + notifications) |
| `POST /api/cases` (EP-01) | 30 req/min per user | Prevents lead spam |
| `POST /api/tasks/:id/assign` (EP-13) | 30 req/min per user | Each assignment triggers overlap checks + notifications |
| `POST /api/auth/login` | 5 req/min per IP | Brute-force prevention (in addition to Supabase's built-in) |
| All other mutation endpoints | 60 req/min per user | General protection |

---

## 10. Open Questions

| # | Question | Impact | Recommendation |
|---|----------|--------|----------------|
| AQ-1 | **Should task assignment allow reassignment directly, or require unassign + reassign?** EP-13 currently supports assigning to a different staff member, which implicitly reassigns. Should the old assignment be released automatically? | EP-13 server-side logic | Yes — auto-release old assignment when reassigning. |
| AQ-2 | **Should EP-17 (Senior Review) mark Task 8 as `completed` regardless of outcome, or only on approval?** Current spec marks it `completed` either way (with `senior_approval` recording the outcome). Alternative: keep `in_progress` until approved. | EP-17 server-side logic | Mark completed either way — the review action is the work; the outcome is metadata. |
| AQ-3 | **Should EP-24 (Schedule Grid) compute `available_slots` server-side or let the frontend calculate from assignments + timetable?** Server-side is simpler for the frontend but adds compute. | EP-24 response payload | Server-side — keeps frontend logic thin for the most complex view. |
| AQ-4 | **Should the staff dashboard (EP-43) include tasks from all dates or only today?** Current spec returns all assigned tasks. The priority list may get long. | EP-43 response size | Return all tasks but mark `is_today: true` for tasks scheduled today. Frontend can segment. |
| AQ-5 | **Batch notification creation: when flagging urgent (EP-07), should we create one notification per staff member, or a single broadcast notification?** | EP-07 performance, `notifications` table growth | One per staff member — allows individual read tracking and ensures RLS isolation. |

---

*— End of Document —*
