CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE TABLE IF NOT EXISTS public.scheduler_tokens (
  name text PRIMARY KEY,
  token text NOT NULL DEFAULT encode(extensions.gen_random_bytes(32), 'hex'),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.scheduler_tokens TO service_role;
REVOKE ALL ON public.scheduler_tokens FROM anon, authenticated;
ALTER TABLE public.scheduler_tokens ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.scheduler_tokens IS 'Server-only shared tokens for scheduled callbacks. No client access.';
INSERT INTO public.scheduler_tokens (name) VALUES ('radar') ON CONFLICT DO NOTHING;