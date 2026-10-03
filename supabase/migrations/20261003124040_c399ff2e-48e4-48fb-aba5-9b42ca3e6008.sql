ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS brand_prepared_by text,
  ADD COLUMN IF NOT EXISTS brand_logo_url text,
  ADD COLUMN IF NOT EXISTS brand_accent text;

CREATE OR REPLACE FUNCTION public.public_report_branding(_slug text)
RETURNS TABLE(prepared_by text, logo_url text, accent text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT w.brand_prepared_by, w.brand_logo_url, w.brand_accent
  FROM research_projects p JOIN workspaces w ON w.id = p.workspace_id
  WHERE p.share_slug = _slug AND p.is_public = true
$$;
GRANT EXECUTE ON FUNCTION public.public_report_branding(text) TO anon, authenticated;