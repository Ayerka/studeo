begin;
-- Cost protection for the open beta: 20 AI uses per account per UTC day, plus a global daily cap.
-- The global cap lives in a server-only settings table (not readable by API roles) and can be
-- changed with a single UPDATE. Premium (paid, later) keeps its own plan limits.
update public.plans set limits=jsonb_set(limits,'{ai_per_day}','20') where key='premium_beta';

create table public.app_settings(key text primary key,value jsonb not null,updated_at timestamptz not null default now());
alter table public.app_settings enable row level security;
revoke all on public.app_settings from public,anon,authenticated;
insert into public.app_settings(key,value) values ('ai_global_per_day','300');

create or replace function public.student_claim_ai() returns void language plpgsql security definer set search_path='' as $$
declare d date := (now() at time zone 'UTC')::date; cap int; gcap int; mine int; total int;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('ai:'||auth.uid()::text));
 select nullif(limits->>'ai_per_day','')::int into cap from public.my_plan();
 select attempts into mine from public.student_ai_usage where user_id=auth.uid() and day=d;
 if cap is not null and coalesce(mine,0)>=cap then raise exception 'Daily limit'; end if;
 select nullif(value #>> '{}','')::int into gcap from public.app_settings where key='ai_global_per_day';
 if gcap is not null then
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('ai:global'));
  select coalesce(sum(attempts),0) into total from public.student_ai_usage where day=d;
  if total>=gcap then raise exception 'Daily limit'; end if;
 end if;
 insert into public.student_ai_usage(user_id,day,attempts) values(auth.uid(),d,1)
 on conflict(user_id,day) do update set attempts=public.student_ai_usage.attempts+1;
end;$$;
revoke all on function public.student_claim_ai() from public,anon;
grant execute on function public.student_claim_ai() to authenticated;
commit;
