-- Dev auth users per deployment_guide §3.6 (profiles + timetables via on_auth_user_created trigger).
-- Application types are seeded in migration 00017 — not duplicated here.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES
  (
    '00000000-0000-0000-0000-000000000000',
    'a0000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'admin@firm.com',
    extensions.crypt('AdminPass123!', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Admin User","role":"admin"}',
    now(),
    now(),
    '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'a0000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'senior@firm.com',
    extensions.crypt('SeniorPass123!', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Senior User","role":"senior"}',
    now(),
    now(),
    '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'a0000000-0000-4000-8000-000000000003',
    'authenticated',
    'authenticated',
    'asha@firm.com',
    extensions.crypt('StaffPass123!', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Asha Staff","role":"staff"}',
    now(),
    now(),
    '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'a0000000-0000-4000-8000-000000000004',
    'authenticated',
    'authenticated',
    'bless@firm.com',
    extensions.crypt('StaffPass123!', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Bless Staff","role":"staff"}',
    now(),
    now(),
    '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'a0000000-0000-4000-8000-000000000005',
    'authenticated',
    'authenticated',
    'jaya@firm.com',
    extensions.crypt('StaffPass123!', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Jaya Staff","role":"staff"}',
    now(),
    now(),
    '', '', '', ''
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  users.id,
  jsonb_build_object(
    'sub', users.id::text,
    'email', users.email,
    'email_verified', true,
    'phone_verified', false
  ),
  'email',
  users.email,
  now(),
  now(),
  now()
FROM auth.users AS users
WHERE users.email IN (
  'admin@firm.com',
  'senior@firm.com',
  'asha@firm.com',
  'bless@firm.com',
  'jaya@firm.com'
)
AND NOT EXISTS (
  SELECT 1
  FROM auth.identities AS identities
  WHERE identities.user_id = users.id
    AND identities.provider = 'email'
);

-- Dev cases for ticket 0011 (case list + RLS harness). IDs are stable for integration tests.
INSERT INTO public.cases (
  id,
  reference,
  client_first_name,
  client_last_name,
  application_type_id,
  status,
  is_urgent,
  last_date,
  appointment_date,
  notes,
  created_by,
  accepted_at,
  completed_at
) VALUES
  (
    'c0000000-0000-4000-8000-000000000001',
    '072601/SKW/VIS',
    'Vishnu',
    'Patel',
    (SELECT id FROM public.application_types WHERE code = 'SKW'),
    'active',
    true,
    '2026-07-28',
    '2026-07-19T15:30:00+00',
    'CoS pending',
    'a0000000-0000-4000-8000-000000000001',
    '2026-07-01T10:05:00+00',
    NULL
  ),
  (
    'c0000000-0000-4000-8000-000000000002',
    '072602/GRD/SAK',
    'Sakura',
    'Yamada',
    (SELECT id FROM public.application_types WHERE code = 'GRD'),
    'active',
    false,
    '2026-08-15',
    NULL,
    NULL,
    'a0000000-0000-4000-8000-000000000001',
    '2026-07-02T09:00:00+00',
    NULL
  ),
  (
    'c0000000-0000-4000-8000-000000000003',
    NULL,
    'Kim',
    'Park',
    (SELECT id FROM public.application_types WHERE code = 'SPV'),
    'lead_pending',
    false,
    NULL,
    NULL,
    NULL,
    'a0000000-0000-4000-8000-000000000001',
    NULL,
    NULL
  ),
  (
    'c0000000-0000-4000-8000-000000000004',
    '062603/ILR/FAT',
    'Fatima',
    'Ahmed',
    (SELECT id FROM public.application_types WHERE code = 'ILR'),
    'active',
    false,
    '2026-09-01',
    NULL,
    NULL,
    'a0000000-0000-4000-8000-000000000001',
    '2026-06-03T11:00:00+00',
    NULL
  ),
  (
    'c0000000-0000-4000-8000-000000000005',
    '052501/SKW/RAH',
    'Rahman',
    'Ali',
    (SELECT id FROM public.application_types WHERE code = 'SKW'),
    'completed',
    false,
    '2026-05-20',
    NULL,
    NULL,
    'a0000000-0000-4000-8000-000000000001',
    '2026-05-01T08:00:00+00',
    '2026-05-20T16:00:00+00'
  ),
  (
    'c0000000-0000-4000-8000-000000000006',
    NULL,
    'James',
    'Wright',
    (SELECT id FROM public.application_types WHERE code = 'SPV'),
    'rejected',
    false,
    NULL,
    NULL,
    NULL,
    'a0000000-0000-4000-8000-000000000001',
    NULL,
    NULL
  )
ON CONFLICT (id) DO NOTHING;

-- Hidden firm-operations case for ad-hoc schedule work (ADR-0019 / ticket 0043).
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
) VALUES (
  'f0000000-0000-4000-8000-000000000001',
  'FIRM-GENERAL',
  'Firm',
  'operations',
  (SELECT id FROM public.application_types WHERE code = 'SKW' LIMIT 1),
  'active',
  true,
  'a0000000-0000-4000-8000-000000000001',
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.dependants (id, case_id, name, relationship) VALUES
  (
    'd0000000-0000-4000-8000-000000000001',
    'c0000000-0000-4000-8000-000000000001',
    'Priya Patel',
    'spouse'
  ),
  (
    'd0000000-0000-4000-8000-000000000002',
    'c0000000-0000-4000-8000-000000000004',
    'Omar Ahmed',
    'child'
  ),
  (
    'd0000000-0000-4000-8000-000000000003',
    'c0000000-0000-4000-8000-000000000004',
    'Layla Ahmed',
    'child'
  )
ON CONFLICT (id) DO NOTHING;

-- Seed tasks: 13 default lifecycle tasks per active/completed case (abbreviated names).
INSERT INTO public.tasks (
  case_id,
  sequence,
  name,
  abbreviation,
  status,
  assigned_to,
  is_overdue,
  blocked_at,
  completed_at
)
SELECT
  seed.case_id,
  seed.sequence,
  seed.name,
  seed.abbreviation,
  seed.status,
  seed.assigned_to,
  seed.is_overdue,
  seed.blocked_at::timestamptz,
  seed.completed_at::timestamptz
FROM (
  VALUES
    -- Vishnu (7/13 complete, Asha)
    ('c0000000-0000-4000-8000-000000000001'::uuid, 1, 'CCL (Client Care Letter)', 'CCL', 'completed'::public.task_status, 'a0000000-0000-4000-8000-000000000003'::uuid, false, NULL::timestamptz, '2026-07-02T14:00:00+00'),
    ('c0000000-0000-4000-8000-000000000001', 2, 'LOA (Letter of Authority)', 'LOA', 'completed'::public.task_status, 'a0000000-0000-4000-8000-000000000003', false, NULL, '2026-07-03T14:00:00+00'),
    ('c0000000-0000-4000-8000-000000000001', 3, 'Send Google Form', 'SGF', 'completed'::public.task_status, 'a0000000-0000-4000-8000-000000000003', false, NULL, '2026-07-04T14:00:00+00'),
    ('c0000000-0000-4000-8000-000000000001', 4, 'Google Form Received', 'GFR', 'completed'::public.task_status, 'a0000000-0000-4000-8000-000000000003', false, NULL, '2026-07-05T14:00:00+00'),
    ('c0000000-0000-4000-8000-000000000001', 5, 'Application Preparation', 'App', 'completed'::public.task_status, 'a0000000-0000-4000-8000-000000000003', false, NULL, '2026-07-06T14:00:00+00'),
    ('c0000000-0000-4000-8000-000000000001', 6, 'Pending Detail Collection', 'PDC', 'completed'::public.task_status, 'a0000000-0000-4000-8000-000000000003', false, NULL, '2026-07-07T14:00:00+00'),
    ('c0000000-0000-4000-8000-000000000001', 7, 'Review by Client', 'RBC', 'completed'::public.task_status, 'a0000000-0000-4000-8000-000000000003', false, NULL, '2026-07-08T14:00:00+00'),
    ('c0000000-0000-4000-8000-000000000001', 8, 'Review by Senior', 'RBS', 'in_progress'::public.task_status, 'a0000000-0000-4000-8000-000000000002', false, NULL, NULL),
    ('c0000000-0000-4000-8000-000000000001', 9, 'Disclaimer Email Sent', 'DES', 'not_started'::public.task_status, NULL, false, NULL, NULL),
    ('c0000000-0000-4000-8000-000000000001', 10, 'Application Payment', 'Pay', 'not_started'::public.task_status, NULL, false, NULL, NULL),
    ('c0000000-0000-4000-8000-000000000001', 11, 'Appointment Booking', 'Appt', 'not_started'::public.task_status, NULL, false, NULL, NULL),
    ('c0000000-0000-4000-8000-000000000001', 12, 'Document Collection', 'DC', 'not_started'::public.task_status, NULL, false, NULL, NULL),
    ('c0000000-0000-4000-8000-000000000001', 13, 'Document Review & Upload', 'DRU', 'not_started'::public.task_status, NULL, false, NULL, NULL),
    -- Sakura (4/13, Bless)
    ('c0000000-0000-4000-8000-000000000002', 1, 'CCL (Client Care Letter)', 'CCL', 'completed'::public.task_status, 'a0000000-0000-4000-8000-000000000004', false, NULL, '2026-07-03T10:00:00+00'),
    ('c0000000-0000-4000-8000-000000000002', 2, 'LOA (Letter of Authority)', 'LOA', 'completed'::public.task_status, 'a0000000-0000-4000-8000-000000000004', false, NULL, '2026-07-04T10:00:00+00'),
    ('c0000000-0000-4000-8000-000000000002', 3, 'Send Google Form', 'SGF', 'completed'::public.task_status, 'a0000000-0000-4000-8000-000000000004', false, NULL, '2026-07-05T10:00:00+00'),
    ('c0000000-0000-4000-8000-000000000002', 4, 'Google Form Received', 'GFR', 'completed'::public.task_status, 'a0000000-0000-4000-8000-000000000004', false, NULL, '2026-07-06T10:00:00+00'),
    ('c0000000-0000-4000-8000-000000000002', 5, 'Application Preparation', 'App', 'not_started'::public.task_status, 'a0000000-0000-4000-8000-000000000004', false, NULL, NULL),
    ('c0000000-0000-4000-8000-000000000002', 6, 'Pending Detail Collection', 'PDC', 'not_started'::public.task_status, 'a0000000-0000-4000-8000-000000000004', false, NULL, NULL),
    ('c0000000-0000-4000-8000-000000000002', 7, 'Review by Client', 'RBC', 'not_started'::public.task_status, 'a0000000-0000-4000-8000-000000000004', false, NULL, NULL),
    ('c0000000-0000-4000-8000-000000000002', 8, 'Review by Senior', 'RBS', 'not_started'::public.task_status, NULL, false, NULL, NULL),
    ('c0000000-0000-4000-8000-000000000002', 9, 'Disclaimer Email Sent', 'DES', 'not_started'::public.task_status, NULL, false, NULL, NULL),
    ('c0000000-0000-4000-8000-000000000002', 10, 'Application Payment', 'Pay', 'not_started'::public.task_status, NULL, false, NULL, NULL),
    ('c0000000-0000-4000-8000-000000000002', 11, 'Appointment Booking', 'Appt', 'not_started'::public.task_status, NULL, false, NULL, NULL),
    ('c0000000-0000-4000-8000-000000000002', 12, 'Document Collection', 'DC', 'not_started'::public.task_status, NULL, false, NULL, NULL),
    ('c0000000-0000-4000-8000-000000000002', 13, 'Document Review & Upload', 'DRU', 'not_started'::public.task_status, NULL, false, NULL, NULL),
    -- Fatima (3/13, blocked task 8, Asha)
    ('c0000000-0000-4000-8000-000000000004', 1, 'CCL (Client Care Letter)', 'CCL', 'completed'::public.task_status, 'a0000000-0000-4000-8000-000000000003', false, NULL, '2026-06-04T10:00:00+00'),
    ('c0000000-0000-4000-8000-000000000004', 2, 'LOA (Letter of Authority)', 'LOA', 'completed'::public.task_status, 'a0000000-0000-4000-8000-000000000003', false, NULL, '2026-06-05T10:00:00+00'),
    ('c0000000-0000-4000-8000-000000000004', 3, 'Send Google Form', 'SGF', 'completed'::public.task_status, 'a0000000-0000-4000-8000-000000000003', false, NULL, '2026-06-06T10:00:00+00'),
    ('c0000000-0000-4000-8000-000000000004', 4, 'Google Form Received', 'GFR', 'not_started'::public.task_status, 'a0000000-0000-4000-8000-000000000003', false, NULL, NULL),
    ('c0000000-0000-4000-8000-000000000004', 5, 'Application Preparation', 'App', 'not_started'::public.task_status, 'a0000000-0000-4000-8000-000000000003', false, NULL, NULL),
    ('c0000000-0000-4000-8000-000000000004', 6, 'Pending Detail Collection', 'PDC', 'not_started'::public.task_status, 'a0000000-0000-4000-8000-000000000003', false, NULL, NULL),
    ('c0000000-0000-4000-8000-000000000004', 7, 'Review by Client', 'RBC', 'not_started'::public.task_status, 'a0000000-0000-4000-8000-000000000003', false, NULL, NULL),
    ('c0000000-0000-4000-8000-000000000004', 8, 'Review by Senior', 'RBS', 'blocked'::public.task_status, 'a0000000-0000-4000-8000-000000000003', false, '2026-06-10T12:00:00+00', NULL),
    ('c0000000-0000-4000-8000-000000000004', 9, 'Disclaimer Email Sent', 'DES', 'not_started'::public.task_status, NULL, false, NULL, NULL),
    ('c0000000-0000-4000-8000-000000000004', 10, 'Application Payment', 'Pay', 'not_started'::public.task_status, NULL, false, NULL, NULL),
    ('c0000000-0000-4000-8000-000000000004', 11, 'Appointment Booking', 'Appt', 'not_started'::public.task_status, NULL, false, NULL, NULL),
    ('c0000000-0000-4000-8000-000000000004', 12, 'Document Collection', 'DC', 'not_started'::public.task_status, NULL, false, NULL, NULL),
    ('c0000000-0000-4000-8000-000000000004', 13, 'Document Review & Upload', 'DRU', 'not_started'::public.task_status, NULL, false, NULL, NULL),
    -- Rahman completed (all 13, Asha)
    ('c0000000-0000-4000-8000-000000000005', 1, 'CCL (Client Care Letter)', 'CCL', 'completed'::public.task_status, 'a0000000-0000-4000-8000-000000000003', false, NULL, '2026-05-02T10:00:00+00'),
    ('c0000000-0000-4000-8000-000000000005', 2, 'LOA (Letter of Authority)', 'LOA', 'completed'::public.task_status, 'a0000000-0000-4000-8000-000000000003', false, NULL, '2026-05-03T10:00:00+00'),
    ('c0000000-0000-4000-8000-000000000005', 3, 'Send Google Form', 'SGF', 'completed'::public.task_status, 'a0000000-0000-4000-8000-000000000003', false, NULL, '2026-05-04T10:00:00+00'),
    ('c0000000-0000-4000-8000-000000000005', 4, 'Google Form Received', 'GFR', 'completed'::public.task_status, 'a0000000-0000-4000-8000-000000000003', false, NULL, '2026-05-05T10:00:00+00'),
    ('c0000000-0000-4000-8000-000000000005', 5, 'Application Preparation', 'App', 'completed'::public.task_status, 'a0000000-0000-4000-8000-000000000003', false, NULL, '2026-05-06T10:00:00+00'),
    ('c0000000-0000-4000-8000-000000000005', 6, 'Pending Detail Collection', 'PDC', 'completed'::public.task_status, 'a0000000-0000-4000-8000-000000000003', false, NULL, '2026-05-07T10:00:00+00'),
    ('c0000000-0000-4000-8000-000000000005', 7, 'Review by Client', 'RBC', 'completed'::public.task_status, 'a0000000-0000-4000-8000-000000000003', false, NULL, '2026-05-08T10:00:00+00'),
    ('c0000000-0000-4000-8000-000000000005', 8, 'Review by Senior', 'RBS', 'completed'::public.task_status, 'a0000000-0000-4000-8000-000000000002', false, NULL, '2026-05-09T10:00:00+00'),
    ('c0000000-0000-4000-8000-000000000005', 9, 'Disclaimer Email Sent', 'DES', 'completed'::public.task_status, 'a0000000-0000-4000-8000-000000000003', false, NULL, '2026-05-10T10:00:00+00'),
    ('c0000000-0000-4000-8000-000000000005', 10, 'Application Payment', 'Pay', 'completed'::public.task_status, 'a0000000-0000-4000-8000-000000000003', false, NULL, '2026-05-11T10:00:00+00'),
    ('c0000000-0000-4000-8000-000000000005', 11, 'Appointment Booking', 'Appt', 'completed'::public.task_status, 'a0000000-0000-4000-8000-000000000003', false, NULL, '2026-05-12T10:00:00+00'),
    ('c0000000-0000-4000-8000-000000000005', 12, 'Document Collection', 'DC', 'completed'::public.task_status, 'a0000000-0000-4000-8000-000000000003', false, NULL, '2026-05-13T10:00:00+00'),
    ('c0000000-0000-4000-8000-000000000005', 13, 'Document Review & Upload', 'DRU', 'completed'::public.task_status, 'a0000000-0000-4000-8000-000000000003', false, NULL, '2026-05-14T10:00:00+00')
) AS seed (
  case_id,
  sequence,
  name,
  abbreviation,
  status,
  assigned_to,
  is_overdue,
  blocked_at,
  completed_at
)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.tasks t
  WHERE t.case_id = seed.case_id
    AND t.sequence = seed.sequence
    AND t.is_deleted = false
);

-- Dev task assignments for ticket 0021 (S-04 scheduling grid). Dated from
-- CURRENT_DATE because task_assignments.date carries a `>= CURRENT_DATE` check,
-- and keyed by (case, sequence) because task ids are generated.
INSERT INTO public.task_assignments (
  task_id,
  staff_id,
  date,
  start_time,
  end_time,
  duration_minutes
)
SELECT
  t.id,
  seed.staff_id,
  CURRENT_DATE,
  seed.start_time::time,
  seed.end_time::time,
  seed.duration_minutes
FROM (
  VALUES
    -- Asha: two blocks on the Fatima case, leaving 11:00-13:00 and 14:30-17:00 free
    ('c0000000-0000-4000-8000-000000000004'::uuid, 7, 'a0000000-0000-4000-8000-000000000003'::uuid, '09:00', '11:00', 120),
    ('c0000000-0000-4000-8000-000000000004', 8, 'a0000000-0000-4000-8000-000000000003', '13:00', '14:30', 90),
    -- Bless: one mid-morning block on the Sakura case
    ('c0000000-0000-4000-8000-000000000002', 5, 'a0000000-0000-4000-8000-000000000004', '10:00', '12:00', 120),
    -- Senior: the Vishnu review still in progress
    ('c0000000-0000-4000-8000-000000000001', 8, 'a0000000-0000-4000-8000-000000000002', '14:00', '16:00', 120)
) AS seed (case_id, sequence, staff_id, start_time, end_time, duration_minutes)
JOIN public.tasks t
  ON t.case_id = seed.case_id
 AND t.sequence = seed.sequence
 AND t.is_deleted = false
WHERE NOT EXISTS (
  SELECT 1
  FROM public.task_assignments ta
  WHERE ta.task_id = t.id
    AND ta.date = CURRENT_DATE
);

