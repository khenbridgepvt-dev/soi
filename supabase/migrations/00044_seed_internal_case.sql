-- Ticket 0047: cloud-safe seed for internal ad-hoc case (ADR-0019).

INSERT INTO public.cases (
  id,
  reference,
  client_first_name,
  client_last_name,
  application_type_id,
  status,
  is_internal,
  created_by,
  accepted_at
)
SELECT
  'f0000000-0000-4000-8000-000000000001'::uuid,
  'FIRM-GENERAL',
  'Firm',
  'operations',
  (SELECT id FROM public.application_types WHERE code = 'SKW' LIMIT 1),
  'active'::public.case_status,
  true,
  p.id,
  now()
FROM public.profiles p
WHERE p.role = 'admin'::public.user_role
ORDER BY p.created_at
LIMIT 1
ON CONFLICT (id) DO UPDATE
SET
  is_internal = true,
  status = 'active'::public.case_status,
  is_deleted = false,
  reference = EXCLUDED.reference,
  updated_at = now();
