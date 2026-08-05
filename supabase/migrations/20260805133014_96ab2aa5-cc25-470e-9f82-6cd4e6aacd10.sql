CREATE TABLE public.sponsors (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  tagline text NOT NULL,
  body text,
  cta_label text NOT NULL DEFAULT 'Learn more',
  destination_url text NOT NULL,
  logo_url text,
  topic_keywords text[] NOT NULL DEFAULT '{}',
  credit_lines text[] NOT NULL DEFAULT '{}',
  weight integer NOT NULL DEFAULT 1,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.sponsors TO anon;
GRANT SELECT ON public.sponsors TO authenticated;
GRANT ALL ON public.sponsors TO service_role;

ALTER TABLE public.sponsors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read live sponsors"
  ON public.sponsors FOR SELECT
  USING (
    is_active
    AND (starts_at IS NULL OR starts_at <= now())
    AND (ends_at IS NULL OR ends_at > now())
  );

CREATE POLICY "App admins can insert sponsors"
  ON public.sponsors FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "App admins can update sponsors"
  ON public.sponsors FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "App admins can delete sponsors"
  ON public.sponsors FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER sponsors_touch_updated_at
  BEFORE UPDATE ON public.sponsors
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX sponsors_active_idx ON public.sponsors (is_active, starts_at, ends_at);

CREATE TABLE public.sponsor_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sponsor_id uuid NOT NULL REFERENCES public.sponsors(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('impression', 'click', 'run_sponsorship')),
  surface text NOT NULL,
  project_id uuid REFERENCES public.research_projects(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.sponsor_events TO service_role;

ALTER TABLE public.sponsor_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX sponsor_events_sponsor_idx ON public.sponsor_events (sponsor_id, kind, created_at DESC);