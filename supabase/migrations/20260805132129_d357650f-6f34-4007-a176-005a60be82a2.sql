-- 1. Fix privilege escalation via workspace_members self-insert
DROP POLICY IF EXISTS "members self insert as owner of new ws" ON public.workspace_members;

CREATE POLICY "members bootstrap own new workspace"
ON public.workspace_members FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND role = 'owner'::workspace_role
  AND EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.id = workspace_id AND w.created_by = auth.uid()
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.workspace_members m
    WHERE m.workspace_id = workspace_members.workspace_id
  )
);

CREATE POLICY "members admin insert"
ON public.workspace_members FOR INSERT TO authenticated
WITH CHECK (
  public.workspace_role_of(workspace_id, auth.uid()) = ANY (ARRAY['owner'::workspace_role, 'admin'::workspace_role])
);

-- 2. Lock down SECURITY DEFINER function execution
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_workspace_member(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_workspace_member(uuid, uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.workspace_role_of(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.workspace_role_of(uuid, uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.accept_workspace_invite(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_workspace_invite(text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.peek_workspace_invite(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.peek_workspace_invite(text) TO authenticated, service_role;

-- 3. match_documents bypasses RLS: enforce membership inside the function
CREATE OR REPLACE FUNCTION public.match_documents(_workspace_id uuid, query_embedding vector, match_count integer DEFAULT 5)
RETURNS TABLE(id uuid, title text, content text, source_url text, similarity double precision)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_workspace_member(_workspace_id, auth.uid()) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  RETURN QUERY
  SELECT d.id, d.title, d.content, d.source_url, 1 - (d.embedding <=> query_embedding) AS similarity
  FROM public.documents d
  WHERE d.workspace_id = _workspace_id AND d.embedding IS NOT NULL
  ORDER BY d.embedding <=> query_embedding
  LIMIT match_count;
END;
$function$;

REVOKE ALL ON FUNCTION public.match_documents(uuid, vector, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.match_documents(uuid, vector, integer) TO authenticated, service_role;

-- 4. Fix mutable search_path on trigger helper
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.tg_set_updated_at() FROM PUBLIC, anon, authenticated;