---
id: 61
title: Admin letterhead upload (Settings)
labels: [wayfinder:task, post-mvp, documents]
status: closed
closed: 2026-08-08
parent: 1
blocked-by: [57, 59]
created: 2026-08-08
---

## HITL — Firm intent

Admins can upload a custom covering letter letterhead DOCX in Settings. Staff downloads use the uploaded shell when present; otherwise the bundled default applies. No public Storage access — server reads via service role on export.

## Scope

- Migration `00049_document_templates_storage.sql` — private `document-templates` bucket; admin SELECT/INSERT/UPDATE RLS
- `src/lib/documents/resolve-letterhead.ts` — `resolveLetterheadBuffer`, upload + status helpers
- Wire async `generateCoveringLetterDocx` to Storage-first resolution
- `GET|POST /api/settings/covering-letterhead` (admin only)
- Settings page `/settings/covering-letterhead` + nav link
- Integration + unit tests

## Do NOT

- Wizard UI changes (0060)
- Persist generated DOCX/PDF binaries
- General document archive

## Done when

- Gate 1 green; admin upload overwrites `letterhead/covering-letter-shell.docx`; staff DOCX export uses Storage letterhead via service role

## Test seam

- `tests/integration/covering-letterhead-storage.test.ts`
- `tests/unit/documents/resolve-letterhead.test.ts`

## Resolution

**Storage:** Migration `00049` creates private bucket `document-templates` (5 MB, DOCX MIME only). Admin-only RLS on `storage.objects`. Fixed key `letterhead/covering-letter-shell.docx`.

**Server lib:** `resolveLetterheadBuffer()` tries Storage (service role), then bundled shell/fallback on disk. `letterheadPath` option still forces a local path (tests). Upload validates ZIP magic + `{{body}}` placeholder.

**API/UI:** `GET|POST /api/settings/covering-letterhead` with `requireAdminApiAuth`. Settings page shows bundled vs custom source and file upload.

Gate 1 green.
