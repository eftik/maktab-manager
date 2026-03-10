
-- Create storage bucket for backups (owner-only)
INSERT INTO storage.buckets (id, name, public) VALUES ('backups', 'backups', false);

-- Only owner can upload/read/delete backups
CREATE POLICY "Owner can upload backups" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'backups' AND public.get_admin_role(auth.uid()) = 'owner');

CREATE POLICY "Owner can read backups" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'backups' AND public.get_admin_role(auth.uid()) = 'owner');

CREATE POLICY "Owner can update backups" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'backups' AND public.get_admin_role(auth.uid()) = 'owner');

CREATE POLICY "Owner can delete backups" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'backups' AND public.get_admin_role(auth.uid()) = 'owner');
