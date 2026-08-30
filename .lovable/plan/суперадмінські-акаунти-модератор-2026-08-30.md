# Суперадмінські акаунти + модератор

## Поточний стан (перевірено запитами)
- `lisifik@gmail.com` — існує: `approved` + роль `admin`. Без змін.
- `dubchackwork@gmail.com` — акаунта немає.
- `2mykhailo.i@gmail.com` — акаунта немає.
- Enum `app_role` зараз містить лише `admin` і `user` — значення `moderator` відсутнє, тому його треба додати.

## Що робимо (одна міграція + створення користувачів)
1. Додаємо значення `moderator` до enum `app_role` (`ALTER TYPE public.app_role ADD VALUE 'moderator'`).
2. Створюємо двох користувачів у `auth.users` через SQL:
   - `dubchackwork@gmail.com` — **admin**
   - `2mykhailo.i@gmail.com` — **moderator**
   - Для обох: випадкові надійні паролі (покажу в чаті один раз), `email_confirmed_at = now()` — без підтвердження пошти.
3. Тригер `handle_new_user` створить їм profiles (`pending`) і роль `user` — одразу оновлюємо:
   - `profiles.status → 'approved'` для обох;
   - роль у `user_roles`: admin / moderator відповідно.
4. Модераторський доступ у застосунку вже підтримано: `AuthContext` визначає `isModerator`/`isStaff`, а панель адміністратора враховує роль moderator.

## Результат
- lisifik@gmail.com — admin (як є)
- dubchackwork@gmail.com — admin, пароль надішлю в чаті
- 2mykhailo.i@gmail.com — moderator, пароль надішлю в чаті

## Технічні деталі
- Паролі хешуються через `crypt(..., gen_salt('bf'))` у `auth.users.encrypted_password`.
- Обидва нові email НЕ додаються в `PROTECTED_EMAILS` функції `admin-delete-user` (захищені лише два поточних суперадміни) — якщо треба захистити, скажи.
