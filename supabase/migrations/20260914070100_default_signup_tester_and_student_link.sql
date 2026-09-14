-- Прибираємо ручний адмін-апрув для звичайних реєстрацій:
-- 1) Будь-яка реєстрація за замовчуванням (без спец. лінку) отримує
--    роль tester і одразу status='approved'.
-- 2) Реєстрація за окремим "студентським" лінком (signup_source=student_link)
--    отримує роль user (студент курсу), теж одразу approved.
-- 3) Адмін-імейли — без змін, роль admin.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin_email BOOLEAN := lower(NEW.email) IN ('lisifik@gmail.com', 'dubchackwork@gmail.com');
  is_student_signup BOOLEAN := NEW.raw_user_meta_data->>'signup_source' = 'student_link';
BEGIN
  INSERT INTO public.profiles (id, email, full_name, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    'approved'::public.approval_status
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    CASE
      WHEN is_admin_email THEN 'admin'::public.app_role
      WHEN is_student_signup THEN 'user'::public.app_role
      ELSE 'tester'::public.app_role
    END
  );

  RETURN NEW;
END;
$$;
