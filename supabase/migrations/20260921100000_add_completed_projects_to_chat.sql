ALTER TABLE public.community_chat_messages ADD COLUMN IF NOT EXISTS completed_projects integer NOT NULL DEFAULT 0;
