-- 1. Stop seeding sample content for new accounts and drop the seeder.
create or replace function public.handle_new_user()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  ws_id uuid; base_slug text; candidate text; attempt int := 0;
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'), new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role) values (new.id, 'member') on conflict do nothing;

  base_slug := lower(regexp_replace(coalesce(split_part(new.email,'@',1), 'team'), '[^a-z0-9]+','-','g'));
  if base_slug = '' then base_slug := 'team'; end if;
  candidate := base_slug;
  while exists (select 1 from public.workspaces where slug = candidate) and attempt < 50 loop
    attempt := attempt + 1;
    candidate := base_slug || '-' || attempt::text;
  end loop;

  insert into public.workspaces (name, slug, created_by, plan)
  values (coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)) || '''s workspace', candidate, new.id, 'free')
  returning id into ws_id;

  insert into public.workspace_members (workspace_id, user_id, role) values (ws_id, new.id, 'owner');

  insert into public.subscriptions (workspace_id, plan, status) values (ws_id, 'free', 'active')
  on conflict (workspace_id) do nothing;

  return new;
end $function$;

drop function if exists public.seed_starter_content(uuid, uuid);

-- Remove any sample rows an earlier sign-up may have received.
delete from public.content_runs where model = 'sample' or title like 'Sample:%';
delete from public.research_projects where topic like 'Sample:%';
delete from public.campaigns where name like 'Sample:%';
delete from public.documents where title like 'Sample:%' or (metadata->>'sample') = 'true';
delete from public.brands where name like 'Sample:%';

-- 2. Remove placeholder sponsors that were never real advertisers.
delete from public.sponsor_events where sponsor_id in (select id from public.sponsors where name in ('Ahrefs','Resend','Linear') and created_by is null);
delete from public.sponsors where name in ('Ahrefs','Resend','Linear') and created_by is null;

-- 3. Account deletion must never be blocked by shared records.
alter table public.sponsors drop constraint if exists sponsors_created_by_fkey;
alter table public.sponsors add constraint sponsors_created_by_fkey foreign key (created_by) references auth.users(id) on delete set null;

alter table public.workspaces alter column created_by drop not null;
alter table public.workspaces drop constraint if exists workspaces_created_by_fkey;
alter table public.workspaces add constraint workspaces_created_by_fkey foreign key (created_by) references auth.users(id) on delete set null;

alter table public.brands alter column created_by drop not null;
alter table public.brands drop constraint if exists brands_created_by_fkey;
alter table public.brands add constraint brands_created_by_fkey foreign key (created_by) references auth.users(id) on delete set null;

alter table public.campaigns alter column created_by drop not null;
alter table public.campaigns drop constraint if exists campaigns_created_by_fkey;
alter table public.campaigns add constraint campaigns_created_by_fkey foreign key (created_by) references auth.users(id) on delete set null;

alter table public.content_runs alter column created_by drop not null;
alter table public.content_runs drop constraint if exists content_runs_created_by_fkey;
alter table public.content_runs add constraint content_runs_created_by_fkey foreign key (created_by) references auth.users(id) on delete set null;

alter table public.research_projects alter column created_by drop not null;
alter table public.research_projects drop constraint if exists research_projects_created_by_fkey;
alter table public.research_projects add constraint research_projects_created_by_fkey foreign key (created_by) references auth.users(id) on delete set null;

-- 4. Anonymous visitor fingerprint for click de-duplication (one-way hash, no PII).
alter table public.sponsor_events add column if not exists visitor_hash text;
create index if not exists idx_sponsor_events_dedupe on public.sponsor_events (sponsor_id, kind, visitor_hash, created_at desc);

-- 5. Advertiser applications from the public Advertise page (server-only access).
create table if not exists public.sponsor_inquiries (
  id uuid primary key default gen_random_uuid(),
  company text not null,
  contact_name text not null,
  email text not null,
  website text,
  budget_range text,
  topics text[] not null default '{}',
  message text not null,
  status text not null default 'new',
  ip_hash text,
  created_at timestamptz not null default now()
);
revoke all on public.sponsor_inquiries from anon, authenticated;
grant all on public.sponsor_inquiries to service_role;
alter table public.sponsor_inquiries enable row level security;
create index if not exists idx_sponsor_inquiries_created on public.sponsor_inquiries (created_at desc);
create index if not exists idx_sponsor_inquiries_ip on public.sponsor_inquiries (ip_hash, created_at desc);

-- 6. Public contact form messages (server-only access).
create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  kind text not null default 'support',
  subject text not null,
  message text not null,
  status text not null default 'new',
  ip_hash text,
  created_at timestamptz not null default now()
);
revoke all on public.contact_messages from anon, authenticated;
grant all on public.contact_messages to service_role;
alter table public.contact_messages enable row level security;
create index if not exists idx_contact_messages_created on public.contact_messages (created_at desc);
create index if not exists idx_contact_messages_ip on public.contact_messages (ip_hash, created_at desc);