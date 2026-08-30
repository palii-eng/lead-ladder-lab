# Суперадмінські акаунти

## Поточний стан (перевірено запитом)
- `lisifik@gmail.com` — вже існує: статус `approved`, роль `admin`. Нічого не потрібно.
- `dubchackwork@gmail.com` — акаунта немає.

## Що робимо
1. Створюємо користувача `dubchackwork@gmail.com` в `auth.users` через SQL:
   - випадковий надійний пароль (генерується в запиті, покажу один раз у чаті);
   - `email_confirmed_at = now()` — без підтвердження пошти;
   - тригер `handle_new_user` автоматично створить profile (pending) + роль `user`.
2. Одразу після цього:
   - `profiles.status → 'approved'` (щоб не бачити екран «Очікує підтвердження»);
   - `user_roles.role → 'admin'` для цього користувача.
3. Перевірка: `lisifik@gmail.com` залишається admin/approved (без змін).
4. Виводжу згенерований пароль у чаті один раз — його можна буде змінити після входу.

## Технічні деталі
- Пароль хешується через `crypt(..., gen_salt('bf'))` у `auth.users.encrypted_password`.
- Захист від видалення: обидва email вже є у `PROTECTED_EMAILS` у функції `admin-delete-user`.
