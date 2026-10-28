begin;
-- Everyone, including new users, keeps free Premium during beta. Assignments stay server-only.
update public.plans set name='Basic', limits='{"subjects":null,"storage_bytes":5000000000,"file_bytes":20971520,"ai_per_day":5}' where key='free';
update public.plans set limits='{"subjects":null,"storage_bytes":20000000000,"file_bytes":20971520,"ai_per_day":100}' where key in ('premium','premium_beta');
update public.plans set is_default=false where is_default;
update public.plans set is_default=true,name='Premium · beta bez opłat' where key='premium_beta';
update public.account_plans set plan_key='premium_beta',updated_at=now();

-- Reserve a full upload slot before Storage accepts any bytes. This bounds even a
-- dishonest client's upload by the bucket's 20 MiB cap; metadata is never trusted
-- for admission. Reservations do not expire while an upload may still be running.
create table public.student_upload_slots(
 path text primary key, user_id uuid not null references auth.users(id) on delete cascade,
 state text not null default 'pending' check(state in ('pending','complete','cancelled')),
 created_at timestamptz not null default now()
);
alter table public.student_upload_slots enable row level security;
revoke all on public.student_upload_slots from public,anon,authenticated;

create function public.student_storage_used() returns bigint language sql stable security definer set search_path='' as $$
 select coalesce(sum(coalesce((o.metadata->>'size')::bigint,20971520)),0)::bigint
 from storage.objects o where o.bucket_id='student-private' and split_part(o.name,'/',1)=auth.uid()::text
$$;
revoke all on function public.student_storage_used() from public,anon;
grant execute on function public.student_storage_used() to authenticated;

create function public.student_reserve_upload(file_name text) returns text language plpgsql security definer set search_path='' as $$
declare cap bigint; used bigint; pending bigint; p text;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if file_name is null or length(file_name)>120 or file_name !~ '^[a-zA-Z0-9._-]+$' then raise exception 'Invalid filename'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('storage:'||auth.uid()::text));
 select (limits->>'storage_bytes')::bigint into cap from public.my_plan();
 if cap is null then raise exception 'Plan unavailable'; end if;
 select public.student_storage_used() into used;
 -- Existing pending files count at least a full slot until completion is acknowledged.
 select coalesce(sum(greatest(0,20971520-coalesce((o.metadata->>'size')::bigint,0))),0) into pending
 from public.student_upload_slots s left join storage.objects o on o.bucket_id='student-private' and o.name=s.path
 where s.user_id=auth.uid() and s.state='pending';
 if used+pending+20971520>cap then raise exception 'Storage limit: free 20 MB for upload' using errcode='53400'; end if;
 p:=auth.uid()::text||'/'||gen_random_uuid()::text||'/'||file_name;
 insert into public.student_upload_slots(path,user_id) values(p,auth.uid());
 return p;
end;$$;
revoke all on function public.student_reserve_upload(text) from public,anon;
grant execute on function public.student_reserve_upload(text) to authenticated;

create function public.student_upload_allowed(object_path text) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.student_upload_slots where path=object_path and user_id=auth.uid() and state='pending')
$$;
revoke all on function public.student_upload_allowed(text) from public,anon;
grant execute on function public.student_upload_allowed(text) to authenticated;
-- Restrictive guard also covers any other permissive insert policies.
create policy student_storage_reservation on storage.objects as restrictive for insert to authenticated
 with check(bucket_id<>'student-private' or public.student_upload_allowed(name));
create policy student_file_delete on storage.objects for delete to authenticated
 using(bucket_id='student-private' and split_part(name,'/',1)=(select auth.uid())::text);

create function public.student_finish_upload(object_path text) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('storage:'||auth.uid()::text));
 if not exists(select 1 from storage.objects where bucket_id='student-private' and name=object_path and split_part(name,'/',1)=auth.uid()::text) then raise exception 'Upload not found'; end if;
 update public.student_upload_slots set state='complete' where path=object_path and user_id=auth.uid();
end;$$;
revoke all on function public.student_finish_upload(text) from public,anon;
grant execute on function public.student_finish_upload(text) to authenticated;

create function public.student_account_usage() returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; plan jsonb; used bigint; pending bigint;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 select to_jsonb(p) into plan from public.my_plan() p;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('storage:'||auth.uid()::text));
 update public.student_upload_slots s set state='complete' where s.user_id=auth.uid() and s.state='pending' and exists(select 1 from storage.objects o where o.bucket_id='student-private' and o.name=s.path);
 used:=public.student_storage_used();
 select coalesce(sum(greatest(0,20971520-coalesce((o.metadata->>'size')::bigint,0))),0) into pending
 from public.student_upload_slots s left join storage.objects o on o.bucket_id='student-private' and o.name=s.path where s.user_id=auth.uid() and s.state='pending';
 select jsonb_build_object('plan',plan,'storage_bytes',used,'reserved_bytes',pending,'ai_used',coalesce((select attempts from public.student_ai_usage where user_id=auth.uid() and day=(now() at time zone 'UTC')::date),0),'ai_resets_at',date_trunc('day',now() at time zone 'UTC') at time zone 'UTC'+interval '1 day','files',coalesce(jsonb_agg(jsonb_build_object('path',name,'size',coalesce((metadata->>'size')::bigint,20971520),'created_at',created_at) order by created_at desc),'[]'::jsonb)) into result
 from storage.objects where bucket_id='student-private' and split_part(name,'/',1)=auth.uid()::text;
 return result;
end;$$;
revoke all on function public.student_account_usage() from public,anon;
grant execute on function public.student_account_usage() to authenticated;

-- Called AFTER Storage API deletion, never delete Storage metadata via SQL.
-- Keep course text, source text, tasks and progress; detach only the removed binary.
create function public.student_detach_file(object_path text) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or split_part(object_path,'/',1)<>auth.uid()::text then raise exception 'Not allowed'; end if;
 if exists(select 1 from storage.objects where bucket_id='student-private' and name=object_path) then raise exception 'Delete file through Storage first'; end if;
 if exists(select 1 from public.student_upload_slots where path=object_path and user_id=auth.uid() and state='pending') then raise exception 'Upload pending; refresh profile before deleting'; end if;
 update public.student_upload_slots set state='cancelled' where path=object_path and user_id=auth.uid();
 update public.student_entries e set payload=(case when e.payload->>'path'=object_path then e.payload-'path' || jsonb_build_object('fileRemoved',true) else e.payload end)
 || case when jsonb_typeof(e.payload->'attachments')='array' then jsonb_build_object('attachments',coalesce((select jsonb_agg(a) from jsonb_array_elements(e.payload->'attachments') a where a->>'path' is distinct from object_path),'[]'::jsonb)) else '{}'::jsonb end,
 revision=revision+1
 where user_id=auth.uid() and (payload->>'path'=object_path or exists(select 1 from jsonb_array_elements(case when jsonb_typeof(payload->'attachments')='array' then payload->'attachments' else '[]'::jsonb end) a where a->>'path'=object_path));
end;$$;
revoke all on function public.student_detach_file(text) from public,anon;
grant execute on function public.student_detach_file(text) to authenticated;
commit;
