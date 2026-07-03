
-- Move SECURITY DEFINER helper functions out of the API-exposed public schema
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

-- Recreate has_role in private schema
CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION private.is_approved(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND status = 'approved')
$$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.is_approved(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_approved(uuid) TO authenticated, service_role;

-- Recreate policies to use private.* functions
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins can update any profile" ON public.profiles
  FOR UPDATE USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT USING (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Users insert own workspace" ON public.scenario_workspaces;
DROP POLICY IF EXISTS "Users update own workspace" ON public.scenario_workspaces;
DROP POLICY IF EXISTS "Admins read all workspaces" ON public.scenario_workspaces;
CREATE POLICY "Users insert own workspace" ON public.scenario_workspaces
  FOR INSERT WITH CHECK ((user_id = auth.uid()) AND private.is_approved(auth.uid()));
CREATE POLICY "Users update own workspace" ON public.scenario_workspaces
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK ((user_id = auth.uid()) AND private.is_approved(auth.uid()));
CREATE POLICY "Admins read all workspaces" ON public.scenario_workspaces
  FOR SELECT USING (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Users can view their own reviews" ON public.scenario_reviews;
DROP POLICY IF EXISTS "Admins can update reviews" ON public.scenario_reviews;
DROP POLICY IF EXISTS "Admins can delete reviews" ON public.scenario_reviews;
CREATE POLICY "Users can view their own reviews" ON public.scenario_reviews
  FOR SELECT USING ((auth.uid() = user_id) OR private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins can update reviews" ON public.scenario_reviews
  FOR UPDATE USING (private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins can delete reviews" ON public.scenario_reviews
  FOR DELETE USING (private.has_role(auth.uid(), 'admin'::public.app_role));

-- Drop the now-unused public copies exposed via PostgREST
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
DROP FUNCTION IF EXISTS public.is_approved(uuid);

-- Lock down handle_new_user (invoked only by trigger, not via API)
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
