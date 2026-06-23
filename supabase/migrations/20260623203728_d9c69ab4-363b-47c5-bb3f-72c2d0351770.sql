CREATE TABLE public.scenario_workspaces (
  id TEXT NOT NULL PRIMARY KEY,
  scenarios JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.scenario_workspaces TO anon;
GRANT SELECT, INSERT, UPDATE ON public.scenario_workspaces TO authenticated;
GRANT ALL ON public.scenario_workspaces TO service_role;

ALTER TABLE public.scenario_workspaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read shared scenario workspace"
ON public.scenario_workspaces
FOR SELECT
TO anon, authenticated
USING (id = 'default');

CREATE POLICY "Anyone can create shared scenario workspace"
ON public.scenario_workspaces
FOR INSERT
TO anon, authenticated
WITH CHECK (id = 'default');

CREATE POLICY "Anyone can update shared scenario workspace"
ON public.scenario_workspaces
FOR UPDATE
TO anon, authenticated
USING (id = 'default')
WITH CHECK (id = 'default');

CREATE OR REPLACE FUNCTION public.update_scenario_workspaces_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_scenario_workspaces_updated_at
BEFORE UPDATE ON public.scenario_workspaces
FOR EACH ROW
EXECUTE FUNCTION public.update_scenario_workspaces_updated_at();