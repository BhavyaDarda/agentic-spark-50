REVOKE EXECUTE ON FUNCTION public.public_report_branding(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_report_branding(text) TO service_role;