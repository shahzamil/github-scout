-- GitHub Scout accounts and recruiter workspace backend
-- Run this entire file once after supabase-tracker.sql.

create or replace function public.is_scout_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) = 'shahzad.muzzamil@gmail.com';
$$;

revoke all on function public.is_scout_admin() from public;
grant execute on function public.is_scout_admin() to authenticated;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  company text not null default '',
  recruiter_role text not null default '',
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  title text not null check (char_length(title) between 1 and 160),
  job_description text not null default '' check (char_length(job_description) <= 30000),
  status text not null default 'active' check (status in ('active','paused','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.saved_candidates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  project_id uuid references public.projects(id) on delete set null,
  github_login text not null check (char_length(github_login) between 1 and 100),
  full_name text not null default '' check (char_length(full_name) <= 160),
  github_url text not null default '' check (char_length(github_url) <= 500),
  score numeric(4,1),
  jd_match integer check (jd_match between 0 and 100),
  status text not null default 'Sourced' check (char_length(status) <= 40),
  notes text not null default '' check (char_length(notes) <= 2000),
  summary text not null default '' check (char_length(summary) <= 8000),
  saved_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, github_login)
);

alter table public.visitor_events
  add column if not exists user_id uuid references auth.users(id) on delete set null default auth.uid();

alter table public.visitor_events drop constraint if exists visitor_events_event_name_check;
alter table public.visitor_events add constraint visitor_events_event_name_check check (
  event_name in (
    'page_view','deep_mode_enabled','candidate_scan','candidate_search',
    'contributor_search','xray_build','shortlist_save','report_print',
    'account_signup','account_login','project_save','shortlist_sync'
  )
);

create index if not exists profiles_created_at_idx on public.profiles(created_at desc);
create index if not exists projects_user_id_idx on public.projects(user_id, created_at desc);
create index if not exists saved_candidates_user_id_idx on public.saved_candidates(user_id, saved_at desc);
create index if not exists visitor_events_user_id_idx on public.visitor_events(user_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.saved_candidates enable row level security;

revoke all on public.profiles, public.projects, public.saved_candidates from anon;
revoke all on public.profiles from authenticated;
grant select on public.profiles to authenticated;
grant update (full_name, company, recruiter_role, last_seen_at) on public.profiles to authenticated;
grant select, insert, update, delete on public.projects, public.saved_candidates to authenticated;

drop policy if exists "profile owner read" on public.profiles;
create policy "profile owner read" on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_scout_admin());
drop policy if exists "profile owner update" on public.profiles;
create policy "profile owner update" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "project owner access" on public.projects;
create policy "project owner access" on public.projects for all to authenticated
  using (user_id = auth.uid() or public.is_scout_admin())
  with check (user_id = auth.uid());

drop policy if exists "candidate owner access" on public.saved_candidates;
create policy "candidate owner access" on public.saved_candidates for all to authenticated
  using (user_id = auth.uid() or public.is_scout_admin())
  with check (user_id = auth.uid());

drop policy if exists "anonymous analytics insert" on public.visitor_events;
create policy "anonymous analytics insert" on public.visitor_events for insert to anon, authenticated
  with check (
    (user_id is null or user_id = auth.uid())
    and event_name in ('page_view','deep_mode_enabled','candidate_scan','candidate_search','contributor_search','xray_build','shortlist_save','report_print','account_signup','account_login','project_save','shortlist_sync')
    and char_length(path) between 1 and 200
    and char_length(referrer_host) <= 160
    and device_type in ('desktop','mobile','tablet','other')
    and screen_width between 0 and 20000
    and screen_height between 0 and 20000
  );
drop policy if exists "admin analytics read" on public.visitor_events;
create policy "admin analytics read" on public.visitor_events for select to authenticated
  using (public.is_scout_admin());
grant select on public.visitor_events to authenticated;

create or replace function public.handle_scout_user_signup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id,email,full_name,company)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name',''),
    coalesce(new.raw_user_meta_data ->> 'company','')
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = excluded.full_name,
    company = excluded.company,
    last_seen_at = now();
  return new;
end;
$$;

drop trigger if exists on_scout_user_created on auth.users;
create trigger on_scout_user_created
  after insert or update of email, raw_user_meta_data on auth.users
  for each row execute procedure public.handle_scout_user_signup();

-- Backfill the owner or any users created before this script ran.
insert into public.profiles (id,email,full_name,company)
select id,email,coalesce(raw_user_meta_data ->> 'full_name',''),coalesce(raw_user_meta_data ->> 'company','')
from auth.users
on conflict (id) do nothing;

comment on table public.profiles is 'Registered GitHub Scout accounts. Passwords remain inside Supabase Auth.';
comment on table public.projects is 'Private hiring projects and job descriptions owned by each recruiter.';
comment on table public.saved_candidates is 'Private saved candidate records owned by each recruiter.';
