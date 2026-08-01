CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

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

GRANT USAGE ON SCHEMA public TO supabase_auth_admin;

GRANT INSERT ON public.profiles TO supabase_auth_admin;

GRANT INSERT ON public.staff_timetables TO supabase_auth_admin;

GRANT EXECUTE ON FUNCTION public.create_profile_on_signup() TO supabase_auth_admin;
