-- Run as the administrator after migrations. Safe to reapply.
-- Set the login password securely (psql: \password carry_runtime).
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='carry_runtime') THEN
    CREATE ROLE carry_runtime LOGIN;
  END IF;
END $$;
GRANT USAGE ON SCHEMA public TO carry_runtime;
GRANT SELECT ON public.profiles TO carry_runtime;
GRANT SELECT, UPDATE ON public.application_state TO carry_runtime;
GRANT SELECT, INSERT ON public.application_requests TO carry_runtime;
DROP POLICY IF EXISTS runtime_profiles_read ON public.profiles;
CREATE POLICY runtime_profiles_read ON public.profiles FOR SELECT TO carry_runtime USING (true);
DROP POLICY IF EXISTS runtime_state_read ON public.application_state;
CREATE POLICY runtime_state_read ON public.application_state FOR SELECT TO carry_runtime USING (true);
DROP POLICY IF EXISTS runtime_state_update ON public.application_state;
CREATE POLICY runtime_state_update ON public.application_state FOR UPDATE TO carry_runtime USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS runtime_requests_read ON public.application_requests;
CREATE POLICY runtime_requests_read ON public.application_requests FOR SELECT TO carry_runtime USING (true);
DROP POLICY IF EXISTS runtime_requests_insert ON public.application_requests;
CREATE POLICY runtime_requests_insert ON public.application_requests FOR INSERT TO carry_runtime WITH CHECK (true);
-- This trusted server role is distinct from browser roles and has no DELETE,
-- profile write, auth.users, or legacy financial-table permissions.
