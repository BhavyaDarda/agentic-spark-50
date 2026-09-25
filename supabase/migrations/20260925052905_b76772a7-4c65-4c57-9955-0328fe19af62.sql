CREATE OR REPLACE FUNCTION public.seed_starter_content(_ws uuid, _user uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare b_id uuid; c_id uuid; p_id uuid; r_id uuid;
begin
  if exists (select 1 from public.brands where workspace_id = _ws and name like 'Sample:%') then return; end if;

  insert into public.brands (workspace_id, name, product, audience, tone, goals, channels, brand_voice, website, created_by)
  values (_ws, 'Sample: Brewline Coffee', 'Specialty coffee subscription, roasted weekly', 'Remote workers aged 25-40 who care about sourcing',
    'Warm, witty, never snobby', 'Grow subscribers 30% this quarter', array['instagram','email','blog'],
    'Short sentences. Talk like a friendly barista, not a sommelier.', 'https://example.com', _user)
  returning id into b_id;

  insert into public.documents (workspace_id, source_type, title, content, metadata)
  values (_ws, 'text', 'Sample: Brewline brand notes',
    'Brewline roasts every Monday and ships Tuesday. Beans come from three direct-trade farms in Colombia, Ethiopia and Guatemala. We never say "artisanal". Subscribers can pause anytime.',
    jsonb_build_object('sample', true, 'brand_id', b_id));

  insert into public.campaigns (workspace_id, brand_id, name, objective, channels, status, strategy, created_by)
  values (_ws, b_id, 'Sample: Autumn subscription push', 'Convert trial buyers into monthly subscribers',
    array['instagram','email'], 'draft',
    jsonb_build_object('summary','Three-week push: farm stories, a pause-anytime guarantee and a referral bonus.'), _user)
  returning id into c_id;

  insert into public.content_runs (workspace_id, brand_id, campaign_id, kind, title, input, output_text, status, model, created_by)
  values
  (_ws, b_id, c_id, 'social_post', 'Sample: Monday roast post', '{"sample":true}'::jsonb,
   'Monday means roast day. Your beans left the farm in Huila, met our roaster this morning, and ship tomorrow. Fresh is not a feature, it is the whole point. Pause anytime.',
   'succeeded', 'sample', _user),
  (_ws, b_id, c_id, 'email', 'Sample: Trial-to-subscriber email', '{"sample":true}'::jsonb,
   E'Subject: Your second bag is already roasting\n\nHi there,\n\nYou tried Brewline once. Here is the deal: a fresh bag every month, roasted the day before it ships, and you can pause whenever life gets busy.\n\nStart your subscription and get 20% off the first three months.\n\nThe Brewline team',
   'succeeded', 'sample', _user);

  insert into public.research_projects (workspace_id, brand_id, topic, goal, depth, created_by)
  values (_ws, b_id, 'Sample: Coffee subscription market trends', 'Find positioning gaps for a direct-trade subscription', 'standard', _user)
  returning id into p_id;

  insert into public.research_runs (project_id, workspace_id, status, plan, report_markdown, summary, model, completed_at)
  values (p_id, _ws, 'succeeded',
    jsonb_build_object('queries', jsonb_build_array('coffee subscription market size','direct trade coffee consumer trust'),
      'critic', E'Clear structure and well-sourced claims. Could quantify churn benchmarks more precisely.\nSCORE: 84'),
    E'# Coffee subscription market trends (sample)\n\n## Key findings\n- Subscription coffee keeps growing as remote work sustains at-home brewing [1].\n- Buyers increasingly ask where beans come from; traceability builds trust [2].\n- Flexible pause options are a leading reason people keep a subscription [1].\n\n## Opportunity\nLead with farm-level transparency plus a no-guilt pause. Few competitors show both.\n\n_This is sample content so you can see what a finished report looks like._',
    'Subscription coffee demand is steady. Traceability and flexible pausing are the strongest retention levers. Brewline can own the "transparent and flexible" position.',
    'sample', now())
  returning id into r_id;

  insert into public.research_sources (run_id, workspace_id, url, title, snippet, relevance, fetched) values
  (r_id, _ws, 'https://en.wikipedia.org/wiki/Subscription_business_model', 'Subscription business model', 'Overview of recurring-revenue models and retention.', 0.82, true),
  (r_id, _ws, 'https://en.wikipedia.org/wiki/Direct_trade', 'Direct trade', 'How direct trade differs from fair trade in coffee sourcing.', 0.9, true);
end $$;

REVOKE ALL ON FUNCTION public.seed_starter_content(uuid, uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare
  ws_id uuid; base_slug text; candidate text; attempt int := 0;
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'), new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role) values (new.id, 'member') on conflict do nothing;

  base_slug := lower(regexp_replace(coalesce(split_part(new.email,'@',1), 'team'), '[^a-z0-9]+','-','g'));
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

  begin
    perform public.seed_starter_content(ws_id, new.id);
  exception when others then
    raise warning 'starter content skipped: %', sqlerrm;
  end;

  return new;
end $function$;