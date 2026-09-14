-- GitHub Scout anonymous analytics setup
-- Run this entire file once in Supabase: SQL Editor -> New query -> Run.

create table if not exists public.visitor_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  visitor_id uuid not null,
  session_id uuid not null,
  is_returning boolean not null default false,
  event_name text not null,
  path text not null default '/',
  referrer_host text not null default '',
  device_type text not null default 'other',
  browser text not null default 'Other',
  operating_system text not null default 'Other',
  language text not null default '',
  timezone text not null default '',
  screen_width integer not null default 0,
  screen_height integer not null default 0,
  constraint visitor_events_event_name_check check (
    event_name in (
      'page_view',
      'deep_mode_enabled',
      'candidate_scan',
      'candidate_search',
      'contributor_search',
      'xray_build',
      'shortlist_save',
      'report_print'
    )
  ),
  constraint visitor_events_path_length_check check (char_length(path) between 1 and 200),
  constraint visitor_events_referrer_length_check check (char_length(referrer_host) <= 160),
  constraint visitor_events_device_check check (device_type in ('desktop','mobile','tablet','other')),
  constraint visitor_events_screen_check check (
    screen_width between 0 and 20000 and screen_height between 0 and 20000
  )
);

create index if not exists visitor_events_created_at_idx
  on public.visitor_events (created_at desc);
create index if not exists visitor_events_visitor_id_idx
  on public.visitor_events (visitor_id);
create index if not exists visitor_events_event_name_idx
  on public.visitor_events (event_name);

alter table public.visitor_events enable row level security;

revoke all on table public.visitor_events from anon, authenticated;
grant insert on table public.visitor_events to anon, authenticated;

drop policy if exists "anonymous analytics insert" on public.visitor_events;
create policy "anonymous analytics insert"
  on public.visitor_events
  for insert
  to anon, authenticated
  with check (
    event_name in (
      'page_view',
      'deep_mode_enabled',
      'candidate_scan',
      'candidate_search',
      'contributor_search',
      'xray_build',
      'shortlist_save',
      'report_print'
    )
    and char_length(path) between 1 and 200
    and char_length(referrer_host) <= 160
    and device_type in ('desktop','mobile','tablet','other')
    and screen_width between 0 and 20000
    and screen_height between 0 and 20000
  );

-- This function exposes only one safe aggregate: the total anonymous visitor count.
-- Individual visitor records remain private in the Supabase dashboard.
create or replace function public.get_public_visitor_count()
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select count(distinct visitor_id)
  from public.visitor_events
  where event_name = 'page_view';
$$;

revoke all on function public.get_public_visitor_count() from public;
grant execute on function public.get_public_visitor_count() to anon, authenticated;

comment on table public.visitor_events is
  'Privacy-safe anonymous GitHub Scout usage events. Never stores tokens, usernames, searches, job descriptions, LinkedIn text, shortlist data, or candidate data.';
