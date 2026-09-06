-- 1) Додати роль tester в enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'tester';

-- 2) Оновити функцію обробки нового користувача
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