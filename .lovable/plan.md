## Overhaul into a SaaS: Marketing Agent + Research Ninja

The uploaded zips are Python/Streamlit prototypes (FastAPI/Redis/Docker-style stack). Lovable can't host that runtime. Instead I'll rebuild every feature on Lovable's managed equivalent — same architecture intent, modern stack:

```text
TanStack Start (React)  ──  UI / SSR / API routes
        │
Lovable Cloud Auth      ──  email + Google, multi-tenant
        │
Postgres + pgvector     ──  Vector DB / RAG store (replaces standalone Vector DB)
        │
AI SDK + Lovable AI     ──  multi-agent orchestration (replaces FastAPI agents)
        │
Server fns + streaming  ──  SSE/stream responses (replaces Redis pub/sub)
        │
Eval logs + analytics   ──  per-run scoring, traces
        │
Stripe (built-in)       ──  subscriptions + plan-based usage limits
        │
Lovable deploy + GitHub ──  one-click publish, GitHub sync, monitoring
```

### Feature scope (v1, all from the zips)

**Marketing Agent workspace**
- Brand/Project setup: product, audience, tone, goals, channels
- Strategy planner (positioning, ICP, channel mix, KPIs)
- Campaign generator (multi-channel brief + calendar)
- Content generation: blog posts, ad copy, social posts (IG/X/LinkedIn), hashtags, email, video scripts
- Image generation via Lovable AI image models (replaces Gemini/SerpAPI image scrape)
- SEO + competitor analysis (Semrush connector)
- Campaign monitor dashboard (mock metrics + manual KPI entry)

**Research Ninja (multi-agent overhaul)**
- Orchestrator → Planner → Searcher → Reader → Synthesizer → Critic → Writer agents (AI SDK `tool` + `stopWhen(stepCountIs(50))`)
- Web search + page fetch tools, source de-dup, citations
- RAG: chunk & embed docs into `pgvector`, retrieve at synthesis
- Live streamed thinking/steps in UI, final report with citations + export (MD/PDF)
- Saved research projects, re-runnable

**Cross-cutting**
- Workspaces with roles (owner/admin/member), invites
- Asset library (generated images, docs)
- Run history, token/credit usage per run, basic eval (thumbs + rubric scoring by a judge model)
- Stripe subscriptions: Free / Pro / Team with monthly run + token caps enforced server-side

### Data model (Postgres + RLS, all scoped via `workspace_members` + `has_role`)

```text
workspaces, workspace_members, profiles, user_roles (app_role enum)
brands (per workspace)
campaigns, campaign_assets
content_runs (type, input, output, model, tokens, cost, eval_score)
research_projects, research_runs, research_steps, research_sources
documents (id, workspace_id, content, embedding vector(3072), metadata)
subscriptions, usage_counters (per workspace, per month)
```

`user_roles` is a separate table with `has_role()` SECURITY DEFINER. Every public table gets explicit GRANTs + RLS scoped to workspace membership.

### Backend boundaries

- `createServerFn` (RPC) for: brand CRUD, content gen one-shots, research project mutations, usage reads
- Server route `src/routes/api/chat.ts` for streaming Marketing assistant
- Server route `src/routes/api/research.ts` for streaming Research Ninja agent loop
- Server route `src/routes/api/public/webhooks/stripe.ts` for Stripe webhooks (HMAC verified)
- Embeddings via Lovable AI `/v1/embeddings` (`google/gemini-embedding-001`) from server only
- All LLM calls via AI SDK + Lovable AI Gateway helper; default model `google/gemini-3-flash-preview`, with a "deep" tier for synthesis/research

### UI / pages

Public: `/` landing, `/pricing`, `/auth`, `/research/share/$id` (public read-only report)
App (under `_authenticated/`):
- `/app` dashboard (recent runs, usage, quick actions)
- `/app/brands` and `/app/brands/$id`
- `/app/campaigns`, `/app/campaigns/$id` (strategy, calendar, assets)
- `/app/content` (blog / ad / social / email / video / images generators)
- `/app/research` list, `/app/research/$id` (live agent stream + final report)
- `/app/seo` (Semrush-backed competitor + keyword analysis)
- `/app/assets` library
- `/app/settings` (workspace, members/invites, billing, API/connectors)

Design: dark-first, modern enterprise SaaS — not generic indigo/purple. I'll pick a distinctive palette + type system in `styles.css` (semantic tokens only, no hardcoded colors).

### Security & enterprise basics
- RLS on every table, `has_role` for admin checks
- Bearer-attached server fns; `requireSupabaseAuth` on all user-scoped ops
- Server-side usage limit enforcement on every generation endpoint
- Zod validation on all inputs
- Leaked-password (HIBP) check enabled
- Stripe webhook signature verification; never trust client billing state

### Deploy & ops (Lovable equivalents of the requested stack)
- Docker / FastAPI / Redis / GH Actions → replaced by Lovable Cloud (managed Postgres, server functions on Cloudflare Workers, one-click publish, GitHub two-way sync, built-in logs/analytics for monitoring)
- Evaluation: per-run judge-model score stored on `content_runs`, surfaced in dashboard

### Build order

1. Enable Lovable Cloud + Stripe (after confirmation), provision `LOVABLE_API_KEY`
2. Design system + landing/pricing/auth shell
3. Schema migration #1: workspaces, roles, brands, content_runs (+ RLS + GRANTs)
4. Auth pages, workspace bootstrap on first login, member invites
5. Brand setup + Strategy + Campaign generator (server fns + UI)
6. Content generators (blog/ad/social/email/video/images) with streaming
7. Schema migration #2: research_*, documents (pgvector), usage_counters
8. Research Ninja multi-agent loop + live stream UI + RAG ingestion
9. SEO module via Semrush connector
10. Stripe subscriptions, webhook, plan-gated usage enforcement
11. Eval scoring + usage dashboard
12. Polish, empty states, error boundaries, og:image per route, publish

### What I will NOT do (and why)
- No FastAPI / Docker / Redis / GitHub Actions YAML — Lovable Cloud is the runtime; those layers don't apply.
- No copying the Python source into the repo — features are reimplemented in TS server functions.
- No real ad-platform publishing (Meta/Google Ads API) in v1 unless you later add those connectors; campaign monitor uses manual KPI input + mocked charts.
- No third-party email send unless you add a domain in Lovable Email later.

### Open questions before I start building
1. **Design direction**: want me to generate 2–3 visual directions to pick from, or just go with a confident dark enterprise look (think Linear × Vercel)?
2. **Research depth in v1**: cap research agent at ~15 web fetches + ~50 steps per run (Free/Pro)? Higher on Team?
3. **Plan pricing** (for Stripe products): suggested Free (3 runs/mo), Pro $29 (200 runs, 1 workspace), Team $99 (1000 runs, 5 seats) — OK to seed with these, or you'll set prices later?

Approve and I'll start at step 1.
