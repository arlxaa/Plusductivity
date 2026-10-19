-- Phase 3: private bucket "subject-files" must exist (Dashboard > Storage > New bucket, private).
-- Path convention: {user_id}/{subject_id}/{timestamp}-{filename}
-- These policies let each user read/write/delete only their own prefix.

drop policy if exists "own files read" on storage.objects;
drop policy if exists "own files insert" on storage.objects;
drop policy if exists "own files update" on storage.objects;
drop policy if exists "own files delete" on storage.objects;

create policy "own files read" on storage.objects
  for select using (
    bucket_id = 'subject-files'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "own files insert" on storage.objects
  for insert with check (
    bucket_id = 'subject-files'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "own files update" on storage.objects
  for update using (
    bucket_id = 'subject-files'
    and auth.uid()::text = (storage.foldername(name))[1]
  ) with check (
    bucket_id = 'subject-files'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "own files delete" on storage.objects
  for delete using (
    bucket_id = 'subject-files'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
