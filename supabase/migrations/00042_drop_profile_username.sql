-- Ticket 0042: revert profile username (supersedes 0041)

DROP VIEW IF EXISTS public.profiles_staff_view;

DROP INDEX IF EXISTS public.idx_profiles_username_lower;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_username_format_chk;

ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS username;

-- Restore staff-safe view (C-07) — full_name only; no username
CREATE VIEW public.profiles_staff_view
WITH (security_barrier = true) AS
SELECT
  p.id,
  p.full_name,
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

-- Restore signup trigger without username (pre-0041)
CREATE OR REPLACE FUNCTION public.create_profile_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role_val public.user_role := 'staff';
  meta_role text;
BEGIN
  meta_role := NEW.raw_user_meta_data ->> 'role';
  IF meta_role IN ('admin', 'senior', 'staff') THEN
    user_role_val := meta_role::public.user_role;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data ->> 'full_name',
      split_part(NEW.email, '@', 1)
    ),
    user_role_val
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
