-- Ticket 0054: FM + SKD_OUT_UK application types; dependant relationship CHECK constraint.

-- Widen application type codes for FM (2) and SKD_OUT_UK (document-prep registry).
ALTER TABLE public.application_types
  DROP CONSTRAINT IF EXISTS application_types_code_check;

ALTER TABLE public.application_types
  ALTER COLUMN code TYPE varchar(20);

ALTER TABLE public.application_types
  ADD CONSTRAINT application_types_code_check
  CHECK (code ~ '^[A-Z][A-Z0-9_]{1,19}$');

INSERT INTO application_types (name, code, sort_order) VALUES
  ('Family Route (FM)', 'FM', 9),
  ('Dependant Outside UK', 'SKD_OUT_UK', 10)
ON CONFLICT (code) DO NOTHING;

-- Backfill free-text relationships before tightening constraint (includes soft-deleted rows).
UPDATE public.dependants
SET relationship = 'spouse'
WHERE lower(trim(relationship)) IN ('wife', 'husband', 'spouse');

UPDATE public.dependants
SET relationship = 'partner'
WHERE lower(trim(relationship)) = 'partner';

UPDATE public.dependants
SET relationship = 'child'
WHERE lower(trim(relationship)) IN ('son', 'daughter', 'child');

UPDATE public.dependants
SET relationship = 'other'
WHERE relationship NOT IN ('spouse', 'partner', 'child', 'other');

ALTER TABLE public.dependants
  DROP CONSTRAINT IF EXISTS dependants_relationship_check;

ALTER TABLE public.dependants
  ADD CONSTRAINT dependants_relationship_check
  CHECK (relationship IN ('spouse', 'partner', 'child', 'other'));
