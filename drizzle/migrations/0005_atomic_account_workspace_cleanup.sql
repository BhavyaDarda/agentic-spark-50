CREATE OR REPLACE FUNCTION public.cleanup_account_workspaces(p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE m record; members bigint; owners bigint;
BEGIN
 LOCK TABLE public.workspace_members IN SHARE ROW EXCLUSIVE MODE;
 LOCK TABLE public.workspaces IN SHARE ROW EXCLUSIVE MODE;
 FOR m IN SELECT workspace_id, role FROM public.workspace_members WHERE user_id = p_user_id ORDER BY workspace_id LOOP
  SELECT count(*), count(*) FILTER (WHERE role = 'owner') INTO members, owners FROM public.workspace_members WHERE workspace_id = m.workspace_id;
  IF members < 1 THEN RAISE EXCEPTION 'Could not verify workspace membership. Your account was not deleted.'; END IF;
  IF members > 1 AND m.role = 'owner' AND owners < 2 THEN RAISE EXCEPTION 'Transfer ownership of your shared workspace in Settings → Team before deleting your account.'; END IF;
 END LOOP;
 FOR m IN SELECT workspace_id FROM public.workspace_members WHERE user_id = p_user_id ORDER BY workspace_id LOOP
  SELECT count(*) INTO members FROM public.workspace_members WHERE workspace_id = m.workspace_id;
  IF members = 1 THEN DELETE FROM public.workspaces WHERE id = m.workspace_id;
  ELSE DELETE FROM public.workspace_members WHERE workspace_id = m.workspace_id AND user_id = p_user_id;
  END IF;
 END LOOP;
END; $$;
REVOKE ALL ON FUNCTION public.cleanup_account_workspaces(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_account_workspaces(uuid) TO service_role;