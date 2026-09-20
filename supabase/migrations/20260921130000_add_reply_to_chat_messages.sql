alter table public.community_chat_messages
  add column reply_to_id uuid references public.community_chat_messages(id) on delete set null,
  add column reply_to_user_name text,
  add column reply_to_message text;
