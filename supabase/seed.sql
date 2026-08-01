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
