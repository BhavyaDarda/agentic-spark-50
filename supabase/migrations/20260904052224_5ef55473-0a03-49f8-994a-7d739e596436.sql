-- Public report pages must be able to show their own "cited by" strip, so
-- anonymous readers may read citations for reports that are already public.
GRANT SELECT ON TABLE public.report_citations TO anon;

CREATE POLICY "Anyone can read citations of public reports"
ON public.report_citations FOR SELECT TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.research_projects p
    WHERE p.id = report_citations.project_id AND p.is_public = true
  )
);