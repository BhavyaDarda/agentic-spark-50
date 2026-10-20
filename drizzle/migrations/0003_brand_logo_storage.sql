CREATE POLICY "brand logos member read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'brand-logos' AND public.is_workspace_member(((storage.foldername(name))[1])::uuid, auth.uid()));
CREATE POLICY "brand logos admin insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'brand-logos' AND public.workspace_role_of(((storage.foldername(name))[1])::uuid, auth.uid()) = ANY (ARRAY['owner'::workspace_role,'admin'::workspace_role]));
CREATE POLICY "brand logos admin update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'brand-logos' AND public.workspace_role_of(((storage.foldername(name))[1])::uuid, auth.uid()) = ANY (ARRAY['owner'::workspace_role,'admin'::workspace_role]));
CREATE POLICY "brand logos admin delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'brand-logos' AND public.workspace_role_of(((storage.foldername(name))[1])::uuid, auth.uid()) = ANY (ARRAY['owner'::workspace_role,'admin'::workspace_role]));