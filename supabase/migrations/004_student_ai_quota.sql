begin;
create table public.student_ai_usage(user_id uuid not null references auth.users(id), day date not null default (now() at time zone 'UTC')::date, attempts int not null default 0, primary key(user_id,day));
alter table public.student_ai_usage enable row level security;
revoke all on public.student_ai_usage from public,anon,authenticated;
create function public.student_claim_ai() returns void language plpgsql security definer set search_path='' as $$
declare total int; mine int; d date := (now() at time zone 'UTC')::date;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 perform pg_catalog.pg_advisory_xact_lock(834731);
 select coalesce(sum(attempts),0) into total from public.student_ai_usage where day=d;
 select coalesce(attempts,0) into mine from public.student_ai_usage where user_id=auth.uid() and day=d;
 if total>=20 or coalesce(mine,0)>=3 then raise exception 'Daily limit'; end if;
 insert into public.student_ai_usage(user_id,day,attempts) values(auth.uid(),d,1) on conflict(user_id,day) do update set attempts=public.student_ai_usage.attempts+1;
end;$$;
revoke all on function public.student_claim_ai() from public,anon;
grant execute on function public.student_claim_ai() to authenticated;
commit;
