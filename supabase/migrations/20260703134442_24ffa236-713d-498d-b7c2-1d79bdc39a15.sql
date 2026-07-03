
-- Allow users to delete their own workspaces; admins can delete any
CREATE POLICY "Users delete own workspace"
ON public.scenario_workspaces
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins delete any workspace"
ON public.scenario_workspaces
FOR DELETE
TO authenticated
USING (private.has_role(auth.uid(), 'admin'::app_role));

-- Tighten shared_scenarios inserts: require authenticated approved users only,
-- preventing anonymous spam of the public share table.
DROP POLICY IF EXISTS "Anyone can create valid shared scenarios" ON public.shared_scenarios;

CREATE POLICY "Approved users can create shared scenarios"
ON public.shared_scenarios
FOR INSERT
TO authenticated
WITH CHECK (
  private.is_approved(auth.uid())
  AND jsonb_typeof(scenario) = 'object'
  AND scenario ? 'id'
  AND scenario ? 'name'
  AND length(COALESCE(scenario->>'name','')) > 0
  AND length(COALESCE(scenario->>'id','')) > 0
);
