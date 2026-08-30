-- Three access levels going forward:
--   1. superadmin ('admin' role)  — full control: everything moderators can
--      do, plus deleting participants/moderators and managing roles.
--   2. moderator ('moderator' role) — can see the admin panel, review any
--      participant's scenarios, and mark them "Зараховано" — but cannot
--      delete anything.
--   3. student ('user' role, default) — normal simulator access only.

-- 1. Grant superadmin to both hardcoded emails on signup, not just one.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin_email BOOLEAN := lower(NEW.email) IN ('lisifik@gmail.com', 'dubchackwork@gmail.com');
BEGIN
  INSERT INTO public.profiles (id, email, full_name, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    CASE WHEN is_admin_email THEN 'approved'::public.approval_status ELSE 'pending'::public.approval_status END
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN is_admin_email THEN 'admin'::public.app_role ELSE 'user'::public.app_role END);

  RETURN NEW;
END;
$$;

-- 2. Backfill: if either superadmin email already has an account from
-- before this migration, make sure it actually has the admin role and
-- approved status (the trigger above only runs on new signups).
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  FOR v_user_id IN
    SELECT id FROM public.profiles WHERE lower(email) IN ('lisifik@gmail.com', 'dubchackwork@gmail.com')
  LOOP
    UPDATE public.profiles SET status = 'approved' WHERE id = v_user_id;
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END LOOP;
END $$;

-- 3. Helper: is this user "staff" (superadmin OR moderator)? Used for
-- read/review access that both tiers share.
CREATE OR REPLACE FUNCTION private.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'moderator')
  )
$$;

REVOKE ALL ON FUNCTION private.is_staff(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_staff(uuid) TO authenticated, service_role;

-- 4. Extend read access (student roster + their scenario counts) to staff,
-- not just superadmin.
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Staff can view all profiles" ON public.profiles
  FOR SELECT USING (private.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Admins read all workspaces" ON public.scenario_workspaces;
CREATE POLICY "Staff read all workspaces" ON public.scenario_workspaces
  FOR SELECT USING (private.is_staff(auth.uid()));

-- 5. Reviews: both tiers can see everyone's review requests and update
-- their status (e.g. mark "Зараховано" = approved); only superadmin can
-- delete a review (existing "Admins can delete reviews" policy, untouched,
-- still checks the plain 'admin' role only).
DROP POLICY IF EXISTS "Users can view their own reviews" ON public.scenario_reviews;
CREATE POLICY "Users and staff can view reviews" ON public.scenario_reviews
  FOR SELECT USING ((auth.uid() = user_id) OR private.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Admins can update reviews" ON public.scenario_reviews;
CREATE POLICY "Staff can update reviews" ON public.scenario_reviews
  FOR UPDATE USING (private.is_staff(auth.uid()));

-- 6. Role management (promote a student to moderator, revoke a moderator)
-- stays superadmin-only. user_roles had no write policies at all before —
-- role assignment only ever happened via the SECURITY DEFINER trigger.
GRANT INSERT, DELETE ON public.user_roles TO authenticated;

CREATE POLICY "Superadmins can assign roles" ON public.user_roles
  FOR INSERT WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Superadmins can revoke roles" ON public.user_roles
  FOR DELETE USING (private.has_role(auth.uid(), 'admin'::public.app_role));

-- Note: deleting a participant or moderator's *account* (not just their
-- role) requires deleting the auth.users row, which needs the service-role
-- key — handled by the admin-delete-user edge function, gated there to
-- superadmins only. profiles/user_roles/scenario_workspaces all cascade
-- automatically since they're declared ON DELETE CASCADE against auth.users.
