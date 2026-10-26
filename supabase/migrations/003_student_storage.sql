begin;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('student-private','student-private',false,20971520,array['application/pdf','text/plain','text/markdown','image/png','image/jpeg','audio/webm','audio/mp4','audio/ogg','audio/mpeg','audio/wav','application/octet-stream']) on conflict(id) do nothing;
create policy student_file_read on storage.objects for select to authenticated using(bucket_id='student-private' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy student_file_insert on storage.objects for insert to authenticated with check(bucket_id='student-private' and (storage.foldername(name))[1]=(select auth.uid())::text);
commit;
