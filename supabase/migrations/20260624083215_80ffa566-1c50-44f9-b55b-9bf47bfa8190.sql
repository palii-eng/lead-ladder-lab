
DROP POLICY IF EXISTS "Anyone can create shared scenarios" ON public.shared_scenarios;

CREATE POLICY "Anyone can create valid shared scenarios"
  ON public.shared_scenarios FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    jsonb_typeof(scenario) = 'object'
    AND scenario ? 'id'
    AND scenario ? 'name'
    AND length(coalesce(scenario->>'name', '')) > 0
    AND length(coalesce(scenario->>'id', '')) > 0
  );
