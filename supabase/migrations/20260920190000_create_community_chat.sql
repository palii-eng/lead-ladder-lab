-- Загальний чат для студентів/випускників (не для demo/tester). Staff
-- (admin/moderator) читає для модерації й може видаляти повідомлення,
-- але сам не пише туди.
create table public.community_chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  user_name text not null,
  user_level text not null,
  message text not null,
  created_at timestamptz not null default now()
);

alter table public.community_chat_messages enable row level security;

create policy "chat_select_students_and_staff"
on public.community_chat_messages for select to authenticated
using (private.is_staff(auth.uid()) or private.has_role(auth.uid(), 'user'::app_role));

create policy "chat_insert_students_only"
on public.community_chat_messages for insert to authenticated
with check (private.has_role(auth.uid(), 'user'::app_role) and user_id = auth.uid());

create policy "chat_delete_staff_only"
on public.community_chat_messages for delete to authenticated
using (private.is_staff(auth.uid()));

alter publication supabase_realtime add table public.community_chat_messages;
