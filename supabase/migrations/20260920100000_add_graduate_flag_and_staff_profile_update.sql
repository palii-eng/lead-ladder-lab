-- "Пройшов симулятор" (tier 3) — окремий прапорець поверх ролі user, який
-- виставляє модератор/адмін вручну після ~25 успішних проєктів і
-- завершення курсу.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_graduate boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS graduated_at timestamptz;

-- Раніше профіль міг оновлювати тільки сам власник (з захистом status) або
-- admin — модератор не мав права навіть виставити is_graduate. Модератори
-- вже бачать усі профілі ("Staff can view all profiles"), тепер можуть і
-- оновлювати (потрібно для позначення випускника й підвищення до студента).
DROP POLICY IF EXISTS "Staff can update any profile" ON public.profiles;
CREATE POLICY "Staff can update any profile"
ON public.profiles FOR UPDATE TO authenticated
USING (private.is_staff(auth.uid()))
WITH CHECK (private.is_staff(auth.uid()));
