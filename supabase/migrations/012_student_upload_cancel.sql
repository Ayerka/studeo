begin;

create function public.student_cancel_upload(object_path text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or split_part(object_path,'/',1)<>auth.uid()::text then
  raise exception 'Not allowed';
 end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('storage:'||auth.uid()::text));
 if exists(select 1 from storage.objects where bucket_id='student-private' and name=object_path) then
  raise exception 'Remove uploaded file through Storage first';
 end if;
 update public.student_upload_slots
 set state='cancelled'
 where path=object_path and user_id=auth.uid() and state='pending';
end;$$;

revoke all on function public.student_cancel_upload(text) from public,anon;
grant execute on function public.student_cancel_upload(text) to authenticated;

commit;
