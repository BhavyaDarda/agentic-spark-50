CREATE TABLE public.research_monitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL UNIQUE REFERENCES public.research_projects(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  cadence text NOT NULL CHECK (cadence IN ('weekly','monthly')),
  is_active boolean NOT NULL DEFAULT true,
  next_run_at timestamptz NOT NULL,
  last_run_at timestamptz,
  consecutive_failures integer NOT NULL DEFAULT 0,
  last_error text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.research_monitors TO authenticated;
GRANT ALL ON public.research_monitors TO service_role;
ALTER TABLE public.research_monitors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read monitors" ON public.research_monitors FOR SELECT TO authenticated USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "members insert monitors" ON public.research_monitors FOR INSERT TO authenticated WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "members update monitors" ON public.research_monitors FOR UPDATE TO authenticated USING (public.is_workspace_member(workspace_id, auth.uid())) WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "members delete monitors" ON public.research_monitors FOR DELETE TO authenticated USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE INDEX research_monitors_due_idx ON public.research_monitors (next_run_at) WHERE is_active;
CREATE TRIGGER research_monitors_updated_at BEFORE UPDATE ON public.research_monitors FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.research_run_diffs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.research_projects(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  run_id uuid NOT NULL REFERENCES public.research_runs(id) ON DELETE CASCADE,
  previous_run_id uuid REFERENCES public.research_runs(id) ON DELETE SET NULL,
  brief text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.research_run_diffs TO authenticated;
GRANT ALL ON public.research_run_diffs TO service_role;
ALTER TABLE public.research_run_diffs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read diffs" ON public.research_run_diffs FOR SELECT TO authenticated USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE INDEX research_run_diffs_project_idx ON public.research_run_diffs (project_id, created_at DESC);