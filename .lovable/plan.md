## What this becomes

A single conversational surface — one prompt box, like Claude / ChatGPT — where a Marketing Agent handles brand strategy, campaigns, content, SEO, and competitive research. Research Ninja is not a separate app; it's the underlying multi-agent research capability the Marketing Agent invokes via tools. Users never see "the developer settings", API keys, or a workspace CRUD grid unless they ask for it. Everything else is chat + generated artifacts.

## Market validation (what I already know — deep scan running)

**Competitors and where they leak value**
- Jasper / Copy.ai / Writesonic — template-first, not agentic; brand voice is superficial; no real research grounding → outputs feel generic.
- HubSpot Breeze / Anyword — locked to their suite; expensive; weak on multi-step reasoning.
- Surfer / Frase / Clearscope / MarketMuse — strong SEO scoring, weak generation; no agent loop.
- Perplexity / Genspark / Gemini Deep Research / GPT Deep Research — great research UX, no marketing execution layer, no brand memory, no artifact management.
- Lindy / Relevance AI / Gumloop — powerful but require users to build workflows; wrong audience for marketers.
- ChatGPT/Claude with browsing — no brand grounding, no citations UX, no reusable artifacts.

**Top gaps we exploit**
1. Nobody combines **grounded multi-agent research** + **brand-aware content generation** + **artifact library** in a single chat surface.
2. Citations in outputs are usually decorative; we make **every claim traceable to a source card**.
3. Brand voice is usually a text field; we treat it as a **structured, RAG-embedded brand kernel** (positioning, ICP, tone samples, do/don't) that every generation retrieves.
4. Research is throwaway; we make research projects **first-class, re-runnable, and diffable** over time (great for "monitor competitor X weekly").
5. No enterprise-grade evaluation of outputs — we ship **automatic judge-model scoring + groundedness + citation coverage** per run.
6. No serious cost/usage transparency for marketing teams — we ship **per-run tokens, cost, latency, and eval scores** in the artifact history.
7. Team collaboration is a bolt-on — we ship **workspace + roles + invites + shared artifact library** from day one.
8. No product ships **safe defaults**: leaked-password check, no anon signup, RLS on every table, HMAC-verified webhooks, service-role key never client-reachable.

**Table stakes for 2026 (or it looks like AI slop)**
Streaming responses with visible reasoning steps; markdown + code blocks + tool cards inline; source cards with favicon + title + snippet; artifact side panel (Claude-style); stop/regenerate/branch; keyboard-first; dark mode that isn't just inverted; empty states that teach; per-message copy/export; typing indicator that isn't three dots.

**Anti-patterns to refuse**
Purple→indigo gradients on white. Default Inter everywhere. Generic hero + 3-column features + testimonial slider landing. Sparkles icon as brand mark. Robot avatars. "AI-powered" in the H1. Fake dashboard with mocked line charts. Modal wizards for onboarding. Toast for every action.

## Product surface (chat-first)

```text
┌─ Sidebar (collapsible) ─┐  ┌─ Conversation (hero) ──────────────┐  ┌─ Artifact panel ─┐
│ + New chat              │  │ user: launch a Q2 campaign for...  │  │ (opens when the  │
│ Recent conversations    │  │                                     │  │  agent produces  │
│ ─                       │  │ agent (streaming):                  │  │  a document,     │
│ Brands (chip nav)       │  │   [Research tool] 12 sources cited  │  │  campaign brief, │
│ Artifacts               │  │   [Draft] Blog post v1              │  │  image, or       │
│ Settings                │  │   [SEO check] Score 78              │  │  report)         │
│ ─                       │  │                                     │  │                  │
│ Usage: 142 / 500 runs   │  │ [prompt input, /commands, @brand]   │  │                  │
└─────────────────────────┘  └─────────────────────────────────────┘  └──────────────────┘
```

- One prompt box drives everything. `/commands` for power users (`/research`, `/campaign`, `/blog`, `/seo`, `/image`), `@brand` to scope to a brand, drag-and-drop files to ground the conversation.
- Sidebar is **thin and collapsible** — conversation is the hero. Brands/Artifacts/Settings are lists of things chat has produced, not separate apps.
- Artifact panel opens Claude-style on the right when the agent produces something substantial (report, campaign plan, image, blog post). Users can edit inline; agent can iterate on the artifact.
- Live agent trace: collapsed by default, expandable to see planner → search → read → synthesize → critique steps with per-step tokens/latency.
- No exposed API keys, model pickers, or "developer settings" in the default UI. A small `Advanced` toggle in Settings for power users to override model/temperature per conversation — off by default.

## Agent architecture

```text
User prompt
    │
    ▼
Orchestrator (Marketing Agent)
    │  ── decides: pure content? needs research? needs brand kernel? campaign plan?
    │
    ├─► Brand kernel retrieval (RAG over brand docs, tone samples, past artifacts)
    ├─► Research Ninja tool  ──► Planner → Searcher (Brave/Tavily+SerpAPI fallback)
    │                              → Reader (fetch + clean + chunk)
    │                              → Synthesizer (cited markdown)
    │                              → Critic (groundedness, coverage, bias check)
    ├─► Content generators (blog, ad, social, email, script)
    ├─► SEO tool (Semrush connector — already available)
    ├─► Image generator (Lovable AI image models)
    └─► Judge model (scores every artifact: helpfulness, groundedness, brand fit)
                │
                ▼
        Streamed back with tool cards, artifacts, and eval score
```

- Loop control via AI SDK `stopWhen(stepCountIs(50))` + budget guardrails (max fetches, max tokens per run) enforced server-side and tied to plan tier.
- All prompts, tools, and model choices stay server-side. Client only sees streamed UI messages.

## Tech stack (validated)

Kept: TanStack Start (SSR + type-safe routes + server functions), Lovable Cloud (managed Postgres + auth + storage + secrets), pgvector for RAG, AI SDK + Lovable AI Gateway (Gemini + GPT models, no exposed keys), Tailwind v4 + shadcn (New York) with a custom design system.

Added / hardened:
- **AI Elements** (from ai-sdk.dev) for the chat surface — Conversation, Message, Tool, PromptInput, Shimmer — instead of hand-rolling. Non-negotiable per Lovable's chat UI contract.
- **Stripe (built-in Lovable payments)** for Free / Pro / Team tiers with webhook-verified subscription state.
- **Tavily** or **Brave Search API** for research (via `add_secret`), with a graceful DuckDuckGo scrape fallback. Current build uses only the scrape — that's fragile.
- **Judge model + eval scoring** on every generation (helpfulness 1-5, groundedness 0-1, citation coverage %) stored on `content_runs`.
- **Rate limiting per workspace** at the server-function layer using Postgres (no Redis needed on Cloudflare Workers).
- **Structured audit log** table for security events (auth, role change, billing, agent runs with cost > threshold).

Removed:
- Standalone `/app/brands`, `/app/campaigns`, `/app/content`, `/app/research` CRUD pages as primary nav. They become **filtered views over conversations/artifacts** reachable from the sidebar, not separate apps.

## Design system (distinctive, non-generic)

Direction: **"Terminal for marketers"** — dark-first, high-density, monospace accents, physical-feeling interactions. Think Linear × Raycast × Vercel, not Jasper.

- Palette: near-black `oklch(0.14 0.02 260)` base, warm off-white text, single confident accent (electric mint `oklch(0.78 0.18 165)` for actions and streaming states), muted amber for warnings, no gradients on primary CTAs.
- Type: **JetBrains Mono** for tool cards / metadata / trace / kbd; **Söhne**/Inter for prose (via @fontsource); tabular-nums everywhere numeric.
- Motion: 120-180ms Motion One transitions; streaming shimmer on active tool cards; artifact panel slides in with spring physics; no bounce, no glow.
- Iconography: Lucide for controls only; custom generated brand mark (not Sparkles) as the agent identity.
- Empty states are one-line kbd hints, not illustrations.

I'll ask you to pick a color palette + type pair via the visual-choice question in the next build turn before locking the tokens.

## Security posture (non-negotiable)

Applied globally, not per-feature:
- RLS on every table, scoped via `workspace_members` + `has_role()` SECURITY DEFINER. `user_roles` is separate from `profiles`. No client-writable role columns anywhere.
- Explicit GRANTs on every public table (Data API requires this — RLS alone is not enough).
- `SUPABASE_SERVICE_ROLE_KEY` and `LOVABLE_API_KEY` never leave the server; loaded only inside handler bodies of `.functions.ts` / API routes; never at module scope.
- All server functions that touch user data use `requireSupabaseAuth`. All webhook routes (`/api/public/webhooks/stripe`) verify HMAC with timing-safe compare before any DB write.
- Input validation with Zod on every server function and every API route. Length caps everywhere.
- Leaked-password (HIBP) check enabled via `configure_auth`.
- Google OAuth via Lovable broker (`lovable.auth.signInWithOAuth`), configured this turn to avoid "Unsupported provider".
- No `dangerouslySetInnerHTML`. Markdown rendered via `react-markdown` with `rehype-sanitize`.
- Cost/usage guardrails enforced server-side per workspace per plan; client hints only.
- Structured audit log for auth, role changes, billing events, and any run with cost above threshold.
- Security scan run before publish; findings triaged into `security-memory`.

## Billing (v1)

Lovable's built-in **Stripe payments** (no user Stripe account required, full compliance handling for eligible catalogs). After you approve this plan I'll run `recommend_payment_provider` and then `enable_stripe_payments`.

Suggested tiers (adjustable):
- **Free** — 1 workspace, 1 seat, 20 agent runs / mo, 3 research projects, watermarked exports.
- **Pro $29/mo** — 1 workspace, 3 seats, 500 runs, 50 research projects, no watermark, higher research depth.
- **Team $99/mo** — 3 workspaces, 10 seats, 3000 runs, deep research, priority model routing, audit-log export.

Enforcement: `usage_counters` table + server-side check inside every generation handler. Webhook updates `subscriptions` state; client never trusts billing state.

## Data model additions

On top of existing tables, add:
- `conversations` (workspace_id, title auto-generated by judge model, active_brand_id, created_at, last_message_at)
- `messages` (conversation_id, role, parts jsonb — matches AI SDK `UIMessage`, tokens, cost, eval_score, model)
- `artifacts` (conversation_id, kind: report|blog|ad|social|email|image|campaign, title, content, source_run_id) — unifies today's `content_runs` output into a browseable library
- `audit_log` (workspace_id, actor_id, event, target_table, target_id, metadata, created_at)
- `rate_limits` (workspace_id, bucket, count, window_start) — simple sliding window in Postgres
- `subscriptions` (workspace_id, stripe_customer_id, stripe_subscription_id, plan, status, current_period_end)

RLS + GRANTs applied in the same migration.

## What I'll remove or refactor from the current build

- `/app/brands`, `/app/campaigns`, `/app/content`, `/app/research` become **filtered artifact views** reachable from the collapsed sidebar, not top-level nav. The pages stay but the layout and IA change.
- `src/routes/api/research.ts` becomes an AI SDK tool called by the Marketing Agent's chat endpoint, not a directly-invoked route from a Research page.
- The DuckDuckGo scraper in Research Ninja is replaced by Tavily/Brave with the scraper as fallback.
- `src/lib/content.functions.ts` collapses into tool handlers on the agent, not standalone server fns called from separate pages.
- Design tokens in `src/styles.css` are re-derived from the chosen palette + type pair (you'll pick).

## Validation against the `.md` plan

The existing `.lovable/plan.md` covered the right pieces (multi-tenant, RLS, pgvector, AI SDK, Stripe) but got the **product surface wrong** — it built four CRUD apps + a chat when you actually want **one chat that owns everything**. This revision keeps the backend rigor and rewrites the frontend architecture around a single conversation surface with artifacts.

## Build order (post-approval)

1. Ask you to pick color palette + type pair (visual-choice question) → lock design tokens.
2. Enable Stripe payments; provision `TAVILY_API_KEY` (or Brave) via `add_secret`; configure Google OAuth on Supabase; enable HIBP.
3. Migration: `conversations`, `messages`, `artifacts`, `audit_log`, `rate_limits`, `subscriptions` (+ RLS + GRANTs). Re-shape `content_runs` output into `artifacts`.
4. Landing page + pricing + auth — real content, dark-first, no AI-slop.
5. Install AI Elements (`conversation message prompt-input tool shimmer response`). Build the chat shell + artifact panel + sidebar.
6. Build the Marketing Agent orchestrator: server route `src/routes/api/chat.ts` with tools (research, brand_retrieve, generate_content, seo_analyze, generate_image, save_artifact). AI SDK `stopWhen(stepCountIs(50))`, `sendReasoning: true`, tool cards.
7. Research Ninja as tool: Planner → Search (Tavily) → Reader → Synthesizer → Critic, streamed as nested tool activity.
8. RAG: chunk & embed brand kernel + uploaded docs into `documents`; retrieve inside brand_retrieve tool.
9. Judge model eval scoring on every artifact; surface score chip in artifact list.
10. Stripe checkout + billing portal + webhook; plan-gated usage enforcement.
11. Audit log write-through on sensitive events; rate limiting middleware.
12. Security scan → triage → publish. og:image per route via generated hero images.

### Details for the technically curious

- Chat streaming: `streamText` + `toUIMessageStreamResponse({ originalMessages, sendReasoning: true, onFinish })` — `onFinish` persists assistant message + artifact rows.
- Tool cards render via AI Elements `<Tool>` with `defaultOpen={false}`; research sub-steps render as nested tool activity.
- Reasoning enabled via `providerOptions.lovable.reasoning` on Gemini models; OpenAI reasoning models go through the Responses API path (not used in v1).
- Cost tracking: capture `usage` from AI SDK result, price against the model's rate card server-side, write to `messages.cost_usd`.
- `stopWhen(stepCountIs(50))` + explicit tool budgets inside each tool (`maxFetches`, `maxTokens`) enforced server-side.
- Cloudflare Workers runtime: no Redis, no Node-only packages; rate limiting in Postgres; embeddings via Lovable AI Gateway `/embeddings` (`google/gemini-embedding-001`, 3072 dims — matches existing column).
- Tests: Playwright smoke covering signup → send message → tool card renders → artifact opens → billing checkout redirect (test mode).

## Open confirmations before I build

- OK to enable Stripe (built-in, no account needed) and provision `TAVILY_API_KEY` for research search? Brave is the alternative if you prefer.
- OK to keep the `/app/*` routes as filtered artifact views under the chat shell (not deleted, just re-nav'd)?
- Preferred region for data residency in v1 — US default, or EU?

Approve and I'll start at step 1 with the design-token questions.
