-- Enable Realtime on scenario_reviews so staff (admin/moderator) viewing the
-- admin panel get notified live when a student sends a scenario for review,
-- instead of only seeing it after a manual refresh.
ALTER TABLE public.scenario_reviews REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'scenario_reviews'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.scenario_reviews;
  END IF;
END $$;
