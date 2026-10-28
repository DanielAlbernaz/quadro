
create policy "members read imagens" on storage.objects for select to authenticated using (bucket_id = 'imagens' and (public.is_member(auth.uid()) or (storage.foldername(name))[1] = 'avatars'));
create policy "members upload imagens" on storage.objects for insert to authenticated with check (bucket_id = 'imagens' and (public.is_member(auth.uid()) or name like 'avatars/' || auth.uid()::text || '%'));
create policy "members update imagens" on storage.objects for update to authenticated using (bucket_id = 'imagens' and public.is_member(auth.uid()));
