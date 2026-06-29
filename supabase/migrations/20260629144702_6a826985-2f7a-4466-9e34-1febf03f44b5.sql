
-- ============ Extensions ============
create extension if not exists vector;
create extension if not exists pgcrypto;

-- ============ Helper: updated_at trigger ============
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- ============ Enums ============
do $$ begin
  create type public.app_role as enum ('admin','member');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.workspace_role as enum ('owner','admin','member');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.plan_tier as enum ('free','pro','team');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.run_status as enum ('queued','running','succeeded','failed','cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.content_kind as enum ('blog','ad_copy','social_post','hashtags','email','video_script','image','strategy','campaign','seo');
exception when duplicate_object then null; end $$;

-- ============ profiles ============
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "profiles self read"   on public.profiles for select to authenticated using (id = auth.uid());
create policy "profiles self insert" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "profiles self update" on public.profiles for update to authenticated using (id = auth.uid());
create trigger profiles_updated before update on public.profiles for each row execute function public.tg_set_updated_at();

-- ============ user_roles (global app roles) ============
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "user_roles self read" on public.user_roles for select to authenticated using (user_id = auth.uid());

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

-- ============ workspaces ============
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  plan public.plan_tier not null default 'free',
  stripe_customer_id text,
  stripe_subscription_id text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.workspaces to authenticated;
grant all on public.workspaces to service_role;
alter table public.workspaces enable row level security;
create trigger workspaces_updated before update on public.workspaces for each row execute function public.tg_set_updated_at();

-- ============ workspace_members ============
create table if not exists public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.workspace_role not null default 'member',
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);
grant select, insert, update, delete on public.workspace_members to authenticated;
grant all on public.workspace_members to service_role;
alter table public.workspace_members enable row level security;

-- Security definer membership helpers (avoid recursive RLS)
create or replace function public.is_workspace_member(_workspace_id uuid, _user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.workspace_members where workspace_id = _workspace_id and user_id = _user_id)
$$;

create or replace function public.workspace_role_of(_workspace_id uuid, _user_id uuid)
returns public.workspace_role language sql stable security definer set search_path = public as $$
  select role from public.workspace_members where workspace_id = _workspace_id and user_id = _user_id
$$;

-- workspaces RLS
create policy "workspaces members read" on public.workspaces for select to authenticated
  using (public.is_workspace_member(id, auth.uid()));
create policy "workspaces creator insert" on public.workspaces for insert to authenticated
  with check (created_by = auth.uid());
create policy "workspaces owner update" on public.workspaces for update to authenticated
  using (public.workspace_role_of(id, auth.uid()) in ('owner','admin'));

-- workspace_members RLS
create policy "members read in workspace" on public.workspace_members for select to authenticated
  using (public.is_workspace_member(workspace_id, auth.uid()));
create policy "members self insert as owner of new ws" on public.workspace_members for insert to authenticated
  with check (user_id = auth.uid());
create policy "members admin manage" on public.workspace_members for update to authenticated
  using (public.workspace_role_of(workspace_id, auth.uid()) in ('owner','admin'));
create policy "members admin delete" on public.workspace_members for delete to authenticated
  using (public.workspace_role_of(workspace_id, auth.uid()) in ('owner','admin'));

-- ============ workspace_invites ============
create table if not exists public.workspace_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email text not null,
  role public.workspace_role not null default 'member',
  token text not null unique default encode(gen_random_bytes(24), 'hex'),
  invited_by uuid not null references auth.users(id) on delete cascade,
  accepted_at timestamptz,
  expires_at timestamptz not null default (now() + interval '14 days'),
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.workspace_invites to authenticated;
grant all on public.workspace_invites to service_role;
alter table public.workspace_invites enable row level security;
create policy "invites admin read" on public.workspace_invites for select to authenticated
  using (public.workspace_role_of(workspace_id, auth.uid()) in ('owner','admin'));
create policy "invites admin write" on public.workspace_invites for insert to authenticated
  with check (public.workspace_role_of(workspace_id, auth.uid()) in ('owner','admin'));
create policy "invites admin update" on public.workspace_invites for update to authenticated
  using (public.workspace_role_of(workspace_id, auth.uid()) in ('owner','admin'));
create policy "invites admin delete" on public.workspace_invites for delete to authenticated
  using (public.workspace_role_of(workspace_id, auth.uid()) in ('owner','admin'));

-- ============ brands ============
create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  product text,
  audience text,
  tone text,
  goals text,
  channels text[] default '{}',
  brand_voice text,
  website text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.brands to authenticated;
grant all on public.brands to service_role;
alter table public.brands enable row level security;
create policy "brands ws read"   on public.brands for select to authenticated using (public.is_workspace_member(workspace_id, auth.uid()));
create policy "brands ws insert" on public.brands for insert to authenticated with check (public.is_workspace_member(workspace_id, auth.uid()) and created_by = auth.uid());
create policy "brands ws update" on public.brands for update to authenticated using (public.is_workspace_member(workspace_id, auth.uid()));
create policy "brands ws delete" on public.brands for delete to authenticated using (public.workspace_role_of(workspace_id, auth.uid()) in ('owner','admin'));
create trigger brands_updated before update on public.brands for each row execute function public.tg_set_updated_at();

-- ============ campaigns ============
create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  brand_id uuid references public.brands(id) on delete set null,
  name text not null,
  objective text,
  channels text[] default '{}',
  start_date date,
  end_date date,
  budget numeric,
  status text default 'draft',
  strategy jsonb,
  calendar jsonb,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.campaigns to authenticated;
grant all on public.campaigns to service_role;
alter table public.campaigns enable row level security;
create policy "campaigns ws read"   on public.campaigns for select to authenticated using (public.is_workspace_member(workspace_id, auth.uid()));
create policy "campaigns ws insert" on public.campaigns for insert to authenticated with check (public.is_workspace_member(workspace_id, auth.uid()) and created_by = auth.uid());
create policy "campaigns ws update" on public.campaigns for update to authenticated using (public.is_workspace_member(workspace_id, auth.uid()));
create policy "campaigns ws delete" on public.campaigns for delete to authenticated using (public.workspace_role_of(workspace_id, auth.uid()) in ('owner','admin'));
create trigger campaigns_updated before update on public.campaigns for each row execute function public.tg_set_updated_at();

-- ============ content_runs ============
create table if not exists public.content_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  brand_id uuid references public.brands(id) on delete set null,
  campaign_id uuid references public.campaigns(id) on delete set null,
  kind public.content_kind not null,
  title text,
  input jsonb not null default '{}',
  output jsonb,
  output_text text,
  asset_url text,
  model text,
  tokens_input int default 0,
  tokens_output int default 0,
  status public.run_status not null default 'queued',
  eval_score numeric,
  eval_feedback text,
  user_rating int,
  error text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.content_runs to authenticated;
grant all on public.content_runs to service_role;
alter table public.content_runs enable row level security;
create policy "content_runs ws read"   on public.content_runs for select to authenticated using (public.is_workspace_member(workspace_id, auth.uid()));
create policy "content_runs ws insert" on public.content_runs for insert to authenticated with check (public.is_workspace_member(workspace_id, auth.uid()) and created_by = auth.uid());
create policy "content_runs ws update" on public.content_runs for update to authenticated using (public.is_workspace_member(workspace_id, auth.uid()));
create policy "content_runs ws delete" on public.content_runs for delete to authenticated using (public.workspace_role_of(workspace_id, auth.uid()) in ('owner','admin'));
create trigger content_runs_updated before update on public.content_runs for each row execute function public.tg_set_updated_at();
create index if not exists content_runs_ws_created_idx on public.content_runs (workspace_id, created_at desc);

-- ============ research_projects ============
create table if not exists public.research_projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  brand_id uuid references public.brands(id) on delete set null,
  topic text not null,
  goal text,
  depth text not null default 'standard',
  is_public boolean not null default false,
  share_slug text unique,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.research_projects to authenticated;
grant select on public.research_projects to anon;
grant all on public.research_projects to service_role;
alter table public.research_projects enable row level security;
create policy "rp ws read"   on public.research_projects for select to authenticated using (public.is_workspace_member(workspace_id, auth.uid()));
create policy "rp public read" on public.research_projects for select to anon using (is_public = true);
create policy "rp ws insert" on public.research_projects for insert to authenticated with check (public.is_workspace_member(workspace_id, auth.uid()) and created_by = auth.uid());
create policy "rp ws update" on public.research_projects for update to authenticated using (public.is_workspace_member(workspace_id, auth.uid()));
create policy "rp ws delete" on public.research_projects for delete to authenticated using (public.workspace_role_of(workspace_id, auth.uid()) in ('owner','admin'));
create trigger rp_updated before update on public.research_projects for each row execute function public.tg_set_updated_at();

-- ============ research_runs ============
create table if not exists public.research_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.research_projects(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  status public.run_status not null default 'queued',
  plan jsonb,
  report_markdown text,
  summary text,
  tokens_input int default 0,
  tokens_output int default 0,
  model text,
  error text,
  started_at timestamptz default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.research_runs to authenticated;
grant select on public.research_runs to anon;
grant all on public.research_runs to service_role;
alter table public.research_runs enable row level security;
create policy "rr ws read"   on public.research_runs for select to authenticated using (public.is_workspace_member(workspace_id, auth.uid()));
create policy "rr public read" on public.research_runs for select to anon
  using (exists (select 1 from public.research_projects p where p.id = project_id and p.is_public = true));
create policy "rr ws insert" on public.research_runs for insert to authenticated with check (public.is_workspace_member(workspace_id, auth.uid()));
create policy "rr ws update" on public.research_runs for update to authenticated using (public.is_workspace_member(workspace_id, auth.uid()));

-- ============ research_steps ============
create table if not exists public.research_steps (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.research_runs(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  step_index int not null,
  agent text not null,
  action text,
  thought text,
  result jsonb,
  created_at timestamptz not null default now()
);
grant select, insert on public.research_steps to authenticated;
grant select on public.research_steps to anon;
grant all on public.research_steps to service_role;
alter table public.research_steps enable row level security;
create policy "rs ws read"   on public.research_steps for select to authenticated using (public.is_workspace_member(workspace_id, auth.uid()));
create policy "rs public read" on public.research_steps for select to anon
  using (exists (select 1 from public.research_runs rr join public.research_projects p on p.id = rr.project_id where rr.id = run_id and p.is_public = true));
create policy "rs ws insert" on public.research_steps for insert to authenticated with check (public.is_workspace_member(workspace_id, auth.uid()));
create index if not exists rs_run_idx on public.research_steps (run_id, step_index);

-- ============ research_sources ============
create table if not exists public.research_sources (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.research_runs(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  url text not null,
  title text,
  snippet text,
  relevance numeric,
  fetched boolean default false,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.research_sources to authenticated;
grant select on public.research_sources to anon;
grant all on public.research_sources to service_role;
alter table public.research_sources enable row level security;
create policy "rsrc ws read" on public.research_sources for select to authenticated using (public.is_workspace_member(workspace_id, auth.uid()));
create policy "rsrc public read" on public.research_sources for select to anon
  using (exists (select 1 from public.research_runs rr join public.research_projects p on p.id = rr.project_id where rr.id = run_id and p.is_public = true));
create policy "rsrc ws insert" on public.research_sources for insert to authenticated with check (public.is_workspace_member(workspace_id, auth.uid()));

-- ============ documents (RAG / pgvector) ============
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  source_type text not null default 'web', -- 'web' | 'upload' | 'note'
  source_url text,
  title text,
  content text not null,
  embedding vector(3072),
  metadata jsonb default '{}',
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.documents to authenticated;
grant all on public.documents to service_role;
alter table public.documents enable row level security;
create policy "docs ws read"   on public.documents for select to authenticated using (public.is_workspace_member(workspace_id, auth.uid()));
create policy "docs ws insert" on public.documents for insert to authenticated with check (public.is_workspace_member(workspace_id, auth.uid()));
create policy "docs ws delete" on public.documents for delete to authenticated using (public.is_workspace_member(workspace_id, auth.uid()));

-- match function for similarity search
create or replace function public.match_documents (
  _workspace_id uuid,
  query_embedding vector(3072),
  match_count int default 5
)
returns table (id uuid, title text, content text, source_url text, similarity float)
language sql stable security definer set search_path = public as $$
  select d.id, d.title, d.content, d.source_url, 1 - (d.embedding <=> query_embedding) as similarity
  from public.documents d
  where d.workspace_id = _workspace_id and d.embedding is not null
  order by d.embedding <=> query_embedding
  limit match_count;
$$;

-- ============ usage_counters (per workspace, per month) ============
create table if not exists public.usage_counters (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  period_month date not null, -- first of month
  content_runs int not null default 0,
  research_runs int not null default 0,
  tokens_input bigint not null default 0,
  tokens_output bigint not null default 0,
  updated_at timestamptz not null default now(),
  unique (workspace_id, period_month)
);
grant select on public.usage_counters to authenticated;
grant all on public.usage_counters to service_role;
alter table public.usage_counters enable row level security;
create policy "usage ws read" on public.usage_counters for select to authenticated using (public.is_workspace_member(workspace_id, auth.uid()));

-- ============ Profile + bootstrap workspace on signup ============
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  ws_id uuid;
  base_slug text;
  candidate text;
  attempt int := 0;
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'), new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'member') on conflict do nothing;

  base_slug := lower(regexp_replace(coalesce(split_part(new.email,'@',1), 'team'), '[^a-z0-9]+','-','g'));
  candidate := base_slug;
  while exists (select 1 from public.workspaces where slug = candidate) and attempt < 50 loop
    attempt := attempt + 1;
    candidate := base_slug || '-' || attempt::text;
  end loop;

  insert into public.workspaces (name, slug, created_by, plan)
  values (coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)) || '''s workspace', candidate, new.id, 'free')
  returning id into ws_id;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (ws_id, new.id, 'owner');

  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users for each row execute function public.handle_new_user();
