
CREATE TABLE public.shared_scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario jsonb NOT NULL,
  ai_conclusion text,
  active_lead_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.shared_scenarios TO anon, authenticated;
GRANT ALL ON public.shared_scenarios TO service_role;

ALTER TABLE public.shared_scenarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read shared scenarios"
  ON public.shared_scenarios FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can create shared scenarios"
  ON public.shared_scenarios FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
