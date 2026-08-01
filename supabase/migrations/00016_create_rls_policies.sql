-- =============================================================================
-- Row-Level Security foundation (database_schema.md §10.1-§10.4)
--
-- Sprint 1-2 slice: RLS is turned on for EVERY table (deny-by-default), but
-- only `profiles` receives policies. Tables without policies reject all
-- `anon`/`authenticated` access; the ticket that first exposes a table through
-- an API route or page adds its policies plus its §10.3 column trigger
-- (IMPLEMENTATION_PLAN §A.2 rule 1, ADR-0005).
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 10.1 Enable RLS on all tables (deny-by-default)
-- -----------------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dependants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_timetables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_allowances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reference_counters ENABLE ROW LEVEL SECURITY;


-- -----------------------------------------------------------------------------
-- Custom access token hook — puts the application role in the JWT
--
-- api_specification §2.3 requires the API/middleware to read the caller's role
-- from a JWT custom claim. The claim is named `user_role`, NOT `role`: PostgREST
-- reserves the top-level `role` claim to choose the Postgres role it switches
-- to, so writing 'admin'/'senior'/'staff' there makes every request fail with
-- `role "admin" does not exist`. See ADR-0015.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  claims jsonb;
  profile_role public.user_role;
BEGIN
  SELECT p.role
    INTO profile_role
    FROM public.profiles p
   WHERE p.id = (event ->> 'user_id')::uuid;

  claims := event -> 'claims';

  IF profile_role IS NULL THEN
    claims := jsonb_set(claims, '{user_role}', 'null'::jsonb);
  ELSE
    claims := jsonb_set(claims, '{user_role}', to_jsonb(profile_role::text));
  END IF;

  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO supabase_auth_admin;


-- -----------------------------------------------------------------------------
-- Policy helpers
--
-- Both are called from policies ON `profiles`, so `is_active_user()` must be
-- SECURITY DEFINER: a policy that reads `profiles` under the caller's own
-- privileges would recurse.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.jwt_role()
RETURNS text
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'user_role';
$$;

-- §10.4 layer 1: a deactivated user keeps a valid JWT for up to an hour, so
-- every policy re-checks `is_active` against the live row on each query.
CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.profiles p
     WHERE p.id = auth.uid()
       AND p.is_active = true
  );
$$;

GRANT EXECUTE ON FUNCTION public.jwt_role() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_active_user() TO anon, authenticated, service_role;


-- -----------------------------------------------------------------------------
-- 10.2 `profiles` policies
--
-- No INSERT policy: rows are created by the auth.users trigger (§9.1).
-- No DELETE policy: profiles are deactivated, never deleted.
-- -----------------------------------------------------------------------------

-- Admin reads every profile, active or not. The helper calls are wrapped in
-- scalar subqueries so the planner evaluates them once per query, not per row —
-- later policy tickets should copy this shape.
CREATE POLICY profiles_select_admin ON public.profiles
  FOR SELECT
  TO authenticated
  USING ((SELECT public.jwt_role()) = 'admin' AND (SELECT public.is_active_user()));

-- Everyone else reads only their own row. Other people's profiles are reachable
-- through `profiles_staff_view` only, which is how C-07 (staff must never see
-- another user's email / is_active / created_at) is enforced.
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = (SELECT auth.uid()) AND is_active = true);

CREATE POLICY profiles_update_admin ON public.profiles
  FOR UPDATE
  TO authenticated
  USING ((SELECT public.jwt_role()) = 'admin' AND (SELECT public.is_active_user()))
  WITH CHECK ((SELECT public.jwt_role()) = 'admin' AND (SELECT public.is_active_user()));

-- Staff/senior may address their own row; which columns they may actually
-- change is enforced by the trigger below (§10.3, security note C-01).
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = (SELECT auth.uid()) AND is_active = true)
  WITH CHECK (id = (SELECT auth.uid()) AND is_active = true);


-- -----------------------------------------------------------------------------
-- 10.2 `profiles_staff_view` (C-07)
--
-- Runs with the view owner's rights so it can project exactly five columns of
-- other people's rows without granting staff any access to `profiles` itself.
-- `is_active_user()` keeps the §10.4 layer-1 guarantee that a deactivated
-- caller sees nothing. The view is for signed-in end users only: `anon` and
-- `service_role` are revoked, and server-side code reads `profiles` directly.
-- -----------------------------------------------------------------------------

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


-- -----------------------------------------------------------------------------
-- 10.3 Column-level write restrictions on `profiles`
--
-- Staff-allowed column: `online_status`. Everything else is blocked, because a
-- row-level UPDATE policy cannot restrict columns (security note C-01).
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enforce_profiles_column_restrictions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  claims jsonb;
BEGIN
  claims := nullif(current_setting('request.jwt.claims', true), '')::jsonb;

  -- Trusted callers: service_role API routes, supabase_auth_admin, and direct
  -- SQL (migrations, seed, scheduled jobs). Only end-user requests that
  -- PostgREST runs as `authenticated` are column-restricted.
  IF claims ->> 'role' IS DISTINCT FROM 'authenticated' THEN
    RETURN NEW;
  END IF;

  IF public.jwt_role() = 'admin' THEN
    RETURN NEW;
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Permission denied: cannot change id' USING ERRCODE = '42501';
  END IF;
  IF NEW.full_name IS DISTINCT FROM OLD.full_name THEN
    RAISE EXCEPTION 'Permission denied: cannot change full_name' USING ERRCODE = '42501';
  END IF;
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    RAISE EXCEPTION 'Permission denied: cannot change email' USING ERRCODE = '42501';
  END IF;
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Permission denied: cannot change role' USING ERRCODE = '42501';
  END IF;
  IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
    RAISE EXCEPTION 'Permission denied: cannot change is_active' USING ERRCODE = '42501';
  END IF;
  IF NEW.timezone IS DISTINCT FROM OLD.timezone THEN
    RAISE EXCEPTION 'Permission denied: cannot change timezone' USING ERRCODE = '42501';
  END IF;
  IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Permission denied: cannot change created_at' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

-- Fires before `set_updated_at` (triggers run in name order).
CREATE TRIGGER enforce_profiles_columns
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.enforce_profiles_column_restrictions();
