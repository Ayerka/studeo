begin;
-- Plans foundation. Every account is on premium_beta (the default plan) until a later
-- migration changes the default or assigns plans in public.account_plans.
-- premium_beta reproduces migration 007: no subject cap, no AI cap, existing technical file limit.
-- A limit value of null means "not limited by plan". Plans are changed only by migrations
-- or server-side code (e.g. a payment webhook using the service role), never by the browser.

create table public.plans(
 key text primary key check(key ~ '^[a-z_]{2,40}$'),
 name text not null check(length(name) between 1 and 80),
 is_default boolean not null default false,
 limits jsonb not null check(jsonb_typeof(limits)='object'),
 created_at timestamptz not null default now()
);
create unique index plans_single_default on public.plans(is_default) where is_default;

create table public.account_plans(
 user_id uuid primary key references auth.users(id) on delete cascade,
 plan_key text not null references public.plans(key),
 updated_at timestamptz not null default now()
);

alter table public.plans enable row level security;
alter table public.plans force row level security;
alter table public.account_plans enable row level security;
alter table public.account_plans force row level security;
revoke all on public.plans,public.account_plans from public,anon,authenticated;
grant select on public.plans,public.account_plans to authenticated;
create policy plans_read on public.plans for select to authenticated using(true);
create policy account_plan_own_read on public.account_plans for select to authenticated using(user_id=(select auth.uid()));

-- Limits: subjects (active subjects), storage_bytes, file_bytes (per file), ai_per_day (UTC day).
-- file_bytes stays at the 20 MB bucket limit for every plan; larger files need a separate upload flow.
-- storage_bytes is stored for the future; it is not enforced yet (needs Storage accounting).
insert into public.plans(key,name,is_default,limits) values
 ('premium_beta','Premium (beta)',true,'{"subjects":null,"storage_bytes":null,"file_bytes":20971520,"ai_per_day":null}'),
 ('free','Podstawowy',false,'{"subjects":5,"storage_bytes":1073741824,"file_bytes":20971520,"ai_per_day":3}'),
 ('premium','Premium',false,'{"subjects":null,"storage_bytes":21474836480,"file_bytes":20971520,"ai_per_day":null}');

-- Invoker mode: the caller sees only the default plan row and their own assignment (RLS).
create function public.my_plan() returns table(plan_key text,plan_name text,limits jsonb)
language sql stable security invoker set search_path='' as $$
 select p.key,p.name,p.limits from public.plans p
 where p.key=(select ap.plan_key from public.account_plans ap where ap.user_id=(select auth.uid()))
  or (p.is_default and not exists(select 1 from public.account_plans ap where ap.user_id=(select auth.uid())))
 limit 1
$$;
revoke all on function public.my_plan() from public,anon;
grant execute on function public.my_plan() to authenticated;

-- AI accounting stays; the daily cap now comes from the plan (null = no cap, as in 007).
create or replace function public.student_claim_ai() returns void language plpgsql security definer set search_path='' as $$
declare d date := (now() at time zone 'UTC')::date; cap int; mine int;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('ai:'||auth.uid()::text));
 select nullif(limits->>'ai_per_day','')::int into cap from public.my_plan();
 select attempts into mine from public.student_ai_usage where user_id=auth.uid() and day=d;
 if cap is not null and coalesce(mine,0)>=cap then raise exception 'Daily limit'; end if;
 insert into public.student_ai_usage(user_id,day,attempts) values(auth.uid(),d,1)
 on conflict(user_id,day) do update set attempts=public.student_ai_usage.attempts+1;
end;$$;
revoke all on function public.student_claim_ai() from public,anon;
grant execute on function public.student_claim_ai() to authenticated;

-- Subject cap from the plan; inactive while the plan has no subject limit.
create function public.enforce_subject_limit() returns trigger language plpgsql security invoker set search_path='' as $$
declare cap int; used int;
begin
 select nullif(limits->>'subjects','')::int into cap from public.my_plan();
 if cap is null then return new; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('subjects:'||new.user_id::text));
 select count(*) into used from public.student_subjects where user_id=new.user_id and not archived;
 if used>=cap then raise exception 'Subject limit' using errcode='53400'; end if;
 return new;
end;$$;
create trigger student_subjects_plan_limit before insert on public.student_subjects for each row execute function public.enforce_subject_limit();
commit;
