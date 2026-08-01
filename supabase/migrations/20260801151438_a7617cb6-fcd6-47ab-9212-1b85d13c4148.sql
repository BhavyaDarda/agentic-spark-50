-- ============ Per-user MCP (agent tool server) connections ============
CREATE TABLE public.mcp_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  url text NOT NULL,
  transport text NOT NULL DEFAULT 'http',
  state text NOT NULL DEFAULT 'authenticating',
  auth_url text,
  last_error text,
  tool_count integer NOT NULL DEFAULT 0,
  oauth_ciphertext text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, workspace_id, url)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mcp_connections TO authenticated;
GRANT ALL ON public.mcp_connections TO service_role;

ALTER TABLE public.mcp_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mcp own read" ON public.mcp_connections
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "mcp own insert" ON public.mcp_connections
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "mcp own update" ON public.mcp_connections
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "mcp own delete" ON public.mcp_connections
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE TRIGGER mcp_connections_set_updated_at
  BEFORE UPDATE ON public.mcp_connections
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX mcp_connections_user_ws_idx ON public.mcp_connections (user_id, workspace_id);

-- ============ Invite lookup + acceptance (security definer) ============
CREATE OR REPLACE FUNCTION public.peek_workspace_invite(_token text)
RETURNS TABLE (workspace_id uuid, workspace_name text, email text, role workspace_role, expired boolean, accepted boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT i.workspace_id,
         w.name,
         i.email,
         i.role,
         (i.expires_at < now()) AS expired,
         (i.accepted_at IS NOT NULL) AS accepted
  FROM public.workspace_invites i
  JOIN public.workspaces w ON w.id = i.workspace_id
  WHERE i.token = _token
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.accept_workspace_invite(_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv public.workspace_invites;
  uid uuid := auth.uid();
  uemail text := lower(coalesce(auth.jwt() ->> 'email', ''));
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT * INTO inv FROM public.workspace_invites WHERE token = _token LIMIT 1;
  IF inv.id IS NULL THEN
    RAISE EXCEPTION 'invite_not_found';
  END IF;
  IF inv.accepted_at IS NOT NULL THEN
    RAISE EXCEPTION 'invite_already_used';
  END IF;
  IF inv.expires_at < now() THEN
    RAISE EXCEPTION 'invite_expired';
  END IF;
  IF lower(inv.email) <> uemail THEN
    RAISE EXCEPTION 'invite_email_mismatch';
  END IF;

  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (inv.workspace_id, uid, inv.role)
  ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = EXCLUDED.role;

  UPDATE public.workspace_invites SET accepted_at = now() WHERE id = inv.id;

  RETURN inv.workspace_id;
END;
$$;

REVOKE ALL ON FUNCTION public.peek_workspace_invite(text) FROM public;
REVOKE ALL ON FUNCTION public.accept_workspace_invite(text) FROM public;
GRANT EXECUTE ON FUNCTION public.peek_workspace_invite(text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.accept_workspace_invite(text) TO authenticated;