CREATE TABLE public.mcp_credentials (
 connection_id uuid PRIMARY KEY REFERENCES public.mcp_connections(id) ON DELETE CASCADE,
 user_id uuid NOT NULL,
 ciphertext text NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.mcp_credentials TO service_role;
ALTER TABLE public.mcp_credentials ENABLE ROW LEVEL SECURITY;
INSERT INTO public.mcp_credentials(connection_id, user_id, ciphertext)
SELECT id, user_id, oauth_ciphertext FROM public.mcp_connections WHERE oauth_ciphertext IS NOT NULL;
REVOKE SELECT ON public.mcp_connections FROM authenticated;
GRANT SELECT (id,workspace_id,user_id,name,url,transport,state,auth_url,last_error,tool_count,created_at,updated_at) ON public.mcp_connections TO authenticated;
COMMENT ON COLUMN public.mcp_connections.oauth_ciphertext IS 'DEPRECATED: credentials now stored server-only in mcp_credentials; reconnect legacy credentials.';
ALTER POLICY "mcp own update" ON public.mcp_connections USING (user_id = auth.uid() AND public.is_workspace_member(workspace_id, auth.uid())) WITH CHECK (user_id = auth.uid() AND public.is_workspace_member(workspace_id, auth.uid()));
ALTER POLICY "mcp own delete" ON public.mcp_connections USING (user_id = auth.uid() AND public.is_workspace_member(workspace_id, auth.uid()));