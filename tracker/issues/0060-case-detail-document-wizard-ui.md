---
id: 60
title: Case detail document preparation UI
labels: [wayfinder:task, post-mvp, documents]
status: closed
closed: 2026-08-08
parent: 1
blocked-by: [59]
created: 2026-08-08
---

## HITL — Firm intent

Case detail **Prepare documents** section with step-by-step wizard (one question per screen), save via EP-61 API, and DOCX/PDF download. Parental consent card only when case has a child dependant.

## Scope

- Client-safe `wizard-ui-config.ts`, `wizard-prefill.ts`, `download-case-document.ts`
- `CaseDocumentsSection`, `DocumentWizardModal`
- Integrate into `CaseDetailView` (hidden for leads; read-only on completed/rejected)

## Do NOT

- Admin letterhead Storage upload (0061), migrations

## Done when

- Gate 1 green; wizard saves via API; downloads work; parental card gated on child dependant

## Test seam

- `tests/unit/documents/wizard-ui.test.ts`

## Resolution

**Client lib:** `wizard-ui-config.ts` maps all six `wizard_schema_id` flows from WIZARD_FLOWS.md (text/select/date/boolean/repeat fields + review step). `wizard-prefill.ts` pre-fills applicant/dependant names and today's date from case detail. `download-case-document.ts` fetches EP-61 download endpoint and triggers browser save.

**UI:** `CaseDocumentsSection` lists covering letter + optional parental consent cards; Start/Edit opens `DocumentWizardModal` (variant picker, step progress, client validation, review summary, PUT save). Download buttons with hint: DOCX = letterhead, PDF = plain copy. Integrated into case detail for non-lead cases; `readOnly` hides edit but keeps download.

**Tests:** Unit tests for prefill defaults and step validation.

Manual smoke: open active case → Start covering letter wizard → Save → Download DOCX/PDF.

Gate 1 green.
