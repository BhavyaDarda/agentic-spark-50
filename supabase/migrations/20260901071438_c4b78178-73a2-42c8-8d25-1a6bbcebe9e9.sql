-- 1. Atomic rate-limit counter (was falling back to a race-prone upsert)
create or replace function public.increment_rate_limit(p_workspace_id uuid, p_bucket text, p_window_start timestamptz)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.rate_limits (workspace_id, bucket, window_start, count)
  values (p_workspace_id, p_bucket, p_window_start, 1)
  on conflict (workspace_id, bucket, window_start)
  do update set count = public.rate_limits.count + 1;
$$;

revoke all on function public.increment_rate_limit(uuid, text, timestamptz) from public, anon, authenticated;
grant execute on function public.increment_rate_limit(uuid, text, timestamptz) to service_role;

-- 2. Deliberate service-role-only tables: no end-user path should ever read or write these.
comment on table public.rate_limits is 'Internal counters. Service-role only by design: RLS is on with no policies and no grants to anon/authenticated.';
comment on table public.sponsor_events is 'Internal ad telemetry. Service-role only by design: RLS is on with no policies and no grants to anon/authenticated.';
revoke all on table public.rate_limits from anon, authenticated;
revoke all on table public.sponsor_events from anon, authenticated;
grant all on table public.rate_limits to service_role;
grant all on table public.sponsor_events to service_role;

-- 3. Internal helpers must never be callable by anonymous visitors.
revoke all on function public.has_role(uuid, public.app_role) from anon, public;
revoke all on function public.is_workspace_member(uuid, uuid) from anon, public;
revoke all on function public.workspace_role_of(uuid, uuid) from anon, public;
revoke all on function public.match_documents(uuid, vector, integer) from anon, public;
revoke all on function public.accept_workspace_invite(text) from anon, public;
revoke all on function public.peek_workspace_invite(text) from anon, public;
grant execute on function public.has_role(uuid, public.app_role) to authenticated, service_role;
grant execute on function public.is_workspace_member(uuid, uuid) to authenticated, service_role;
grant execute on function public.workspace_role_of(uuid, uuid) to authenticated, service_role;
grant execute on function public.match_documents(uuid, vector, integer) to authenticated, service_role;
grant execute on function public.accept_workspace_invite(text) to authenticated, service_role;
grant execute on function public.peek_workspace_invite(text) to authenticated, service_role;

-- 4. Citation tracking: did anyone (incl. AI answer engines) cite a published report?
create table public.report_citations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.research_projects(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  engine text not null,
  citing_url text not null,
  citing_title text,
  snippet text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (project_id, engine, citing_url)
);

grant select on table public.report_citations to authenticated;
grant all on table public.report_citations to service_role;
alter table public.report_citations enable row level security;

create policy "Workspace members read their report citations"
on public.report_citations for select to authenticated
using (public.is_workspace_member(workspace_id, auth.uid()));

create index report_citations_project_idx on public.report_citations (project_id, last_seen_at desc);

-- Track when we last swept a project for citations.
alter table public.research_projects add column if not exists citations_checked_at timestamptz;

-- 5. Starter sponsors so the ad-funded slot is actually live.
insert into public.sponsors (name, tagline, body, cta_label, destination_url, topic_keywords, credit_lines, weight, is_active)
values
  ('Ahrefs', 'See which pages actually earn links.', 'Backlink and keyword data for teams that publish research instead of guessing.', 'Explore the data', 'https://ahrefs.com',
   array['seo','backlinks','keywords','content marketing','organic traffic','search'],
   array['This report''s search pass was sponsored by Ahrefs.'], 40, true),
  ('Resend', 'Email your audience without fighting an ESP.', 'A developer-first email API for launch notes, digests and lifecycle campaigns.', 'Send your first email', 'https://resend.com',
   array['email','newsletter','lifecycle','crm','retention','automation'],
   array['Delivery for this report''s digest is sponsored by Resend.'], 30, true),
  ('Linear', 'Ship the plan, not just the deck.', 'Issue tracking that keeps campaign execution visible from brief to launch.', 'See Linear', 'https://linear.app',
   array['project management','campaign planning','productivity','launch','roadmap','team'],
   array['Planning tooling for this run is sponsored by Linear.'], 20, true);