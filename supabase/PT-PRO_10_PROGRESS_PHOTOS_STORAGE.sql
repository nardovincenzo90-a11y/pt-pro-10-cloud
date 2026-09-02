-- PT-PRO 10 Cloud — Foto Progressi Storage
-- Bucket già esistente: exercise-media (public read)
-- Consente a ogni utente autenticato di scrivere/modificare/eliminare
-- soltanto sotto progress/<auth.uid()>/...

begin;

drop policy if exists ptpro_progress_photo_insert on storage.objects;
create policy ptpro_progress_photo_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'exercise-media'
  and (storage.foldername(name))[1] = 'progress'
  and (storage.foldername(name))[2] = (select auth.uid())::text
);

drop policy if exists ptpro_progress_photo_update on storage.objects;
create policy ptpro_progress_photo_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'exercise-media'
  and (storage.foldername(name))[1] = 'progress'
  and (storage.foldername(name))[2] = (select auth.uid())::text
)
with check (
  bucket_id = 'exercise-media'
  and (storage.foldername(name))[1] = 'progress'
  and (storage.foldername(name))[2] = (select auth.uid())::text
);

drop policy if exists ptpro_progress_photo_delete on storage.objects;
create policy ptpro_progress_photo_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'exercise-media'
  and (storage.foldername(name))[1] = 'progress'
  and (storage.foldername(name))[2] = (select auth.uid())::text
);

commit;
