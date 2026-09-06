-- Auto-registration flow for the tester link (/auth?ref=tester): anyone
-- signing up with signup_source='tester_link' in their auth metadata gets
-- approved instantly and assigned the 'tester' role, skipping the normal
-- admin-approval queue entirely.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin_email BOOLEAN := lower(NEW.email) IN ('lisifik@gmail.com', 'dubchackwork@gmail.com');
  is_tester_signup BOOLEAN := NEW.raw_user_meta_data->>'signup_source' = 'tester_link';
BEGIN
  INSERT INTO public.profiles (id, email, full_name, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    CASE WHEN is_admin_email OR is_tester_signup THEN 'approved'::public.approval_status ELSE 'pending'::public.approval_status END
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    CASE
      WHEN is_admin_email THEN 'admin'::public.app_role
      WHEN is_tester_signup THEN 'tester'::public.app_role
      ELSE 'user'::public.app_role
    END
  );

  RETURN NEW;
END;
$$;
