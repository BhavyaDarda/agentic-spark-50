REVOKE ALL ON public.mcp_credentials FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mcp_credentials TO service_role;