begin;
create table public.student_subjects (
 id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 title text not null check(length(title) between 1 and 120), color text not null default '#b9a3ff',
 archived boolean not null default false, revision int not null default 1, created_at timestamptz not null default now(),
 unique(id,user_id)
);
create table public.student_entries (
 id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 subject_id uuid not null, kind text not null check(kind in ('note','material','deck','event','audio')),
 title text not null check(length(title) between 1 and 160), payload jsonb not null default '{}' check(jsonb_typeof(payload)='object' and octet_length(payload::text)<=524288),
 archived boolean not null default false, revision int not null default 1, created_at timestamptz not null default now(),
 foreign key(subject_id,user_id) references public.student_subjects(id,user_id)
);
create index student_entries_owner on public.student_entries(user_id,subject_id);
alter table public.student_subjects enable row level security;
alter table public.student_subjects force row level security;
alter table public.student_entries enable row level security;
alter table public.student_entries force row level security;
revoke all on public.student_subjects,public.student_entries from public,anon,authenticated;
grant select,insert,update on public.student_subjects,public.student_entries to authenticated;
create policy student_subjects_own on public.student_subjects for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy student_entries_own on public.student_entries for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
commit;
