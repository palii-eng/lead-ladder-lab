drop policy if exists "chat_insert_students_only" on public.community_chat_messages;

create policy "chat_insert_students_and_staff"
on public.community_chat_messages
for insert
with check (
  (private.has_role(auth.uid(), 'user'::app_role) or private.is_staff(auth.uid()))
  and user_id = auth.uid()
);
