-- Ticket 0041: mandatory profile username (display handle)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username text;

-- Backfill: email local-part normalized to [a-z0-9._-], disambiguate with row number on conflict
WITH normalized AS (
  SELECT
    id,
    email,
    created_at,
    lower(
      CASE
        WHEN regexp_replace(split_part(email, '@', 1), '[^a-z0-9._-]', '', 'g') ~ '^[a-z0-9]'
          THEN left(
            regexp_replace(split_part(email, '@', 1), '[^a-z0-9._-]', '', 'g'),
            30
          )
        ELSE 'user'
      END
    ) AS base
  FROM public.profiles
),
ranked AS (
  SELECT
    id,
    base,
    row_number() OVER (PARTITION BY base ORDER BY created_at, id) AS rn
  FROM normalized
)
UPDATE public.profiles p
   SET username = CASE
     WHEN r.rn = 1 THEN r.base
     ELSE left(r.base, greatest(1, 30 - length(r.rn::text))) || r.rn::text
   END
  FROM ranked r
 WHERE p.id = r.id
   AND p.username IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN username SET NOT NULL;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_username_format_chk
  CHECK (
    length(username) >= 3
    AND length(username) <= 30
    AND username ~ '^[a-z0-9][a-z0-9._-]*$'
  );

CREATE UNIQUE INDEX idx_profiles_username_lower ON public.profiles (lower(username));

-- Extend staff-safe view (C-07) — username is public; email stays off the view
DROP VIEW IF EXISTS public.profiles_staff_view;

CREATE VIEW public.profiles_staff_view
WITH (security_barrier = true) AS
SELECT
  p.id,
  p.full_name,
  p.username,
  p.role,
  p.online_status,
  p.timezone
FROM public.profiles p
WHERE p.is_active = true
  AND (SELECT public.is_active_user());

REVOKE ALL ON public.profiles_staff_view FROM PUBLIC;
REVOKE ALL ON public.profiles_staff_view FROM anon;
REVOKE ALL ON public.profiles_staff_view FROM service_role;
GRANT SELECT ON public.profiles_staff_view TO authenticated;

-- Signup trigger: set username from metadata or derived email local-part
CREATE OR REPLACE FUNCTION public.create_profile_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role_val public.user_role := 'staff';
  meta_role text;
  meta_username text;
  base_username text;
  final_username text;
  suffix text;
BEGIN
  meta_role := NEW.raw_user_meta_data ->> 'role';
  IF meta_role IN ('admin', 'senior', 'staff') THEN
    user_role_val := meta_role::public.user_role;
  END IF;

  meta_username := lower(trim(COALESCE(NEW.raw_user_meta_data ->> 'username', '')));
  IF meta_username <> '' THEN
    final_username := meta_username;
  ELSE
    base_username := lower(
      regexp_replace(split_part(NEW.email, '@', 1), '[^a-z0-9._-]', '', 'g')
    );
    IF base_username = '' OR base_username !~ '^[a-z0-9]' THEN
      base_username := 'user';
    END IF;
    base_username := left(base_username, 30);
    final_username := base_username;
    IF EXISTS (
      SELECT 1 FROM public.profiles p WHERE lower(p.username) = lower(final_username)
    ) THEN
      suffix := left(replace(NEW.id::text, '-', ''), 4);
      final_username := left(base_username, greatest(1, 30 - length(suffix))) || suffix;
    END IF;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role, username)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data ->> 'full_name',
      split_part(NEW.email, '@', 1)
    ),
    user_role_val,
    final_username
  );

  INSERT INTO public.staff_timetables (
    staff_id,
    mon_start,
    mon_end,
    tue_start,
    tue_end,
    wed_start,
    wed_end,
    thu_start,
    thu_end,
    fri_start,
    fri_end,
    sat_start,
    sat_end
  ) VALUES (
    NEW.id,
    '09:00',
    '17:00',
    '09:00',
    '17:00',
    '09:00',
    '17:00',
    '09:00',
    '17:00',
    '09:00',
    '17:00',
    '09:00',
    '17:00'
  );

  RETURN NEW;
END;
$$;
