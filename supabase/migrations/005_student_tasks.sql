begin;
alter table public.student_entries drop constraint student_entries_kind_check;
alter table public.student_entries add constraint student_entries_kind_check check(kind in ('note','material','deck','event','audio','task'));
update storage.buckets set allowed_mime_types = array(select distinct x from unnest(allowed_mime_types || array['application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','text/csv']) as x) where id='student-private';
commit;
