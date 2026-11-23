begin;

create table public.public_courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null check (length(title) between 1 and 160),
  description text not null default '',
  content jsonb not null check (jsonb_typeof(content) = 'object'),
  published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index public_courses_catalog on public.public_courses(published, sort_order, slug);

alter table public.public_courses enable row level security;
alter table public.public_courses force row level security;
revoke all on public.public_courses from public, anon, authenticated;
grant select on public.public_courses to anon, authenticated;

create policy public_courses_read_published
  on public.public_courses
  for select
  to anon, authenticated
  using (published = true);

commit;
