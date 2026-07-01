-- =========================================================
-- Chat-first agent tables
-- =========================================================

CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  active_brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'New chat',
  pinned BOOLEAN NOT NULL DEFAULT false,
  archived BOOLEAN NOT NULL DEFAULT false,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX conversations_workspace_idx ON public.conversations(workspace_id, last_message_at DESC);
CREATE INDEX conversations_created_by_idx ON public.conversations(created_by);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members can view conversations"
  ON public.conversations FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "members can create conversations"
  ON public.conversations FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()) AND created_by = auth.uid());

CREATE POLICY "members can update conversations"
  ON public.conversations FOR UPDATE TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "creator or workspace owner can delete conversations"
  ON public.conversations FOR DELETE TO authenticated
  USING (
    created_by = auth.uid()
    OR public.workspace_role_of(workspace_id, auth.uid()) IN ('owner','admin')
  );

CREATE TRIGGER conversations_touch_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ---------------------------------------------------------

CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  parts JSONB NOT NULL DEFAULT '[]'::jsonb,
  model TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,
  reasoning_tokens INTEGER,
  cost_usd NUMERIC(10,6),
  latency_ms INTEGER,
  eval_score NUMERIC(3,2),
  eval_notes JSONB,
  ai_sdk_message_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX messages_conversation_idx ON public.messages(conversation_id, created_at);
CREATE INDEX messages_workspace_idx ON public.messages(workspace_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members can view messages"
  ON public.messages FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "members can insert messages"
  ON public.messages FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "members can update messages"
  ON public.messages FOR UPDATE TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "members can delete messages"
  ON public.messages FOR DELETE TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));

-- ---------------------------------------------------------

CREATE TABLE public.artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  source_message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL,
  kind TEXT NOT NULL CHECK (kind IN ('research_report','blog_post','ad_copy','social_post','email','video_script','campaign_brief','seo_audit','image','strategy','other')),
  title TEXT NOT NULL,
  content TEXT,
  content_json JSONB,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  eval_score NUMERIC(3,2),
  starred BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX artifacts_workspace_idx ON public.artifacts(workspace_id, created_at DESC);
CREATE INDEX artifacts_conversation_idx ON public.artifacts(conversation_id);
CREATE INDEX artifacts_kind_idx ON public.artifacts(workspace_id, kind, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.artifacts TO authenticated;
GRANT ALL ON public.artifacts TO service_role;
ALTER TABLE public.artifacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members can view artifacts"
  ON public.artifacts FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "members can create artifacts"
  ON public.artifacts FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()) AND created_by = auth.uid());

CREATE POLICY "members can update artifacts"
  ON public.artifacts FOR UPDATE TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "creator or workspace admin can delete artifacts"
  ON public.artifacts FOR DELETE TO authenticated
  USING (
    created_by = auth.uid()
    OR public.workspace_role_of(workspace_id, auth.uid()) IN ('owner','admin')
  );

CREATE TRIGGER artifacts_touch_updated_at
  BEFORE UPDATE ON public.artifacts
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =========================================================
-- Billing + audit + rate limit
-- =========================================================

CREATE TABLE public.subscriptions (
  workspace_id UUID PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free','pro','team')),
  status TEXT NOT NULL DEFAULT 'active',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_price_id TEXT,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX subscriptions_customer_idx ON public.subscriptions(stripe_customer_id);

-- Only owners/admins can read; only service role writes (via webhook)
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners and admins can view subscription"
  ON public.subscriptions FOR SELECT TO authenticated
  USING (public.workspace_role_of(workspace_id, auth.uid()) IN ('owner','admin'));

CREATE TRIGGER subscriptions_touch_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ---------------------------------------------------------

CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event TEXT NOT NULL,
  target_table TEXT,
  target_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX audit_log_workspace_idx ON public.audit_log(workspace_id, created_at DESC);
CREATE INDEX audit_log_event_idx ON public.audit_log(event, created_at DESC);

GRANT SELECT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners and admins can view audit log"
  ON public.audit_log FOR SELECT TO authenticated
  USING (
    workspace_id IS NOT NULL
    AND public.workspace_role_of(workspace_id, auth.uid()) IN ('owner','admin')
  );

-- ---------------------------------------------------------

CREATE TABLE public.rate_limits (
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  bucket TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (workspace_id, bucket, window_start)
);
CREATE INDEX rate_limits_lookup_idx ON public.rate_limits(workspace_id, bucket, window_start DESC);

-- Server-side only; no authenticated grants.
GRANT ALL ON public.rate_limits TO service_role;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
-- No policies = no access from authenticated/anon; service role bypasses RLS.

-- =========================================================
-- Bootstrap: free subscription row for existing workspaces
-- =========================================================

INSERT INTO public.subscriptions (workspace_id, plan, status)
SELECT id, 'free', 'active' FROM public.workspaces
ON CONFLICT (workspace_id) DO NOTHING;

-- Extend handle_new_user to also create a free subscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
declare
  ws_id uuid;
  base_slug text;
  candidate text;
  attempt int := 0;
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'), new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'member') on conflict do nothing;

  base_slug := lower(regexp_replace(coalesce(split_part(new.email,'@',1), 'team'), '[^a-z0-9]+','-','g'));
  candidate := base_slug;
  while exists (select 1 from public.workspaces where slug = candidate) and attempt < 50 loop
    attempt := attempt + 1;
    candidate := base_slug || '-' || attempt::text;
  end loop;

  insert into public.workspaces (name, slug, created_by, plan)
  values (coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)) || '''s workspace', candidate, new.id, 'free')
  returning id into ws_id;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (ws_id, new.id, 'owner');

  insert into public.subscriptions (workspace_id, plan, status)
  values (ws_id, 'free', 'active')
  on conflict (workspace_id) do nothing;

  return new;
end $function$;

-- Ensure trigger is present (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();