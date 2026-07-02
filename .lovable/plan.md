
## Scope: build-order steps 1–6

Steps 1–3 are already partially in place (Noir & Ember tokens, Tavily/Google/HIBP provisioned, migration for `conversations`/`messages`/`artifacts`/`audit_log`/`rate_limits`/`subscriptions` applied, `src/routes/api/chat.ts` scaffolded). This plan finishes them cleanly and delivers 4–6 end-to-end.

### 1. Lock design tokens (finalize)
- Confirm Noir & Ember palette + Outfit/Figtree already written to `src/styles.css`; add JetBrains Mono via `@fontsource` for tool cards, `tabular-nums` utility, motion timings (120–180ms), and semantic tokens for `--tool`, `--reasoning`, `--artifact`, `--source-card`.
- Extend shadcn variants (`button`, `badge`, `card`) with `ember` and `terminal` styles. No hardcoded colors anywhere.

### 2. Billing + secrets + auth hardening
- Run `payments--enable_stripe_payments` (built-in Stripe, no BYOK).
- Verify `TAVILY_API_KEY`, `LOVABLE_API_KEY`, Google OAuth, HIBP — all already present; no re-prompt.
- Add `STRIPE_WEBHOOK_SECRET` via `add_secret` for `/api/public/webhooks/stripe`.

### 3. Data model finalization
- Migration audit: confirm RLS + GRANTs on all six new tables, add `match_documents` scoped to `workspace_id` (already present), add `artifacts.eval_score jsonb`, `messages.cost_usd numeric`, `conversations.title_generated bool`. Add `plan_limits` view.
- Retire standalone `content_runs` writes from agent path; keep table for backfill/read.

### 4. Landing + auth + pricing (real content, dark-first)
- Rewrite `src/routes/index.tsx`: hero with live agent-trace mock, "how it works" tri-panel (Research → Brand Kernel → Artifact), pricing (Free/Pro/Team), security strip, FAQ. Real copy — no "AI-powered" clichés, no purple gradients, no sparkles.
- Per-route `head()` with unique title/description + og:image (generated hero) on the landing route only.
- `src/routes/auth.tsx`: polish — Google (via `lovable.auth.signInWithOAuth`) + email/password, HIBP-aware error UX, redirect back to `/app` after session hydrates.
- `src/routes/pricing.tsx` (new) linked to Stripe checkout server fn.

### 5. Chat-first app shell + artifact panel
- Replace `/app` IA:
  - `src/routes/app.tsx` becomes a 3-pane layout: collapsible sidebar (New chat, Recent, Brands chip nav, Artifacts, Settings, Usage meter), Conversation hero, Artifact side panel (Claude-style, resizable, slides in on artifact creation).
  - `src/routes/app.index.tsx` → new-chat landing with `/commands` hint, `@brand` chip picker, drag-drop file grounding.
  - `src/routes/app.c.$conversationId.tsx` → live conversation (AI Elements: `Conversation`, `Message`, `PromptInput`, `Tool`, `Shimmer`, `Response`). URL-driven thread routing, chat `id` = conversationId.
  - Old `/app/brands|campaigns|content|research|research/$id` → convert to **filtered artifact views** (`app.artifacts.tsx`, `app.artifacts.$kind.tsx`) reachable from sidebar; keep brands as a lightweight settings pane, not top-level nav.
- Streaming shimmer on active tool cards; source cards with favicon+title+snippet; per-message copy/regen/branch; keyboard shortcuts (⌘K palette, ⌘⏎ send, ⌘/ toggle sidebar).
- Usage meter reads from `usage_counters` via server fn; no client trust.

### 6. Marketing Agent orchestrator + tools
- `src/routes/api/chat.ts` finalized as the sole chat endpoint. Server-only prompts, models, tool wiring. `streamText` + `toUIMessageStreamResponse({ originalMessages, sendReasoning: true, onFinish })`. `stopWhen(stepCountIs(50))` + per-tool budgets. `onFinish` persists assistant message, artifacts, cost, and eval score in one transaction.
- Tools (all server-side, Zod-validated, rate-limited, workspace-scoped):
  1. `brand_retrieve` — RAG over `documents` filtered by brand + workspace via `match_documents`.
  2. `research` — Research Ninja pipeline as a single tool: Planner → Tavily search → Reader (fetch+clean+chunk+embed) → Synthesizer (cited md) → Critic (groundedness). Emits nested tool activity for the UI trace. DuckDuckGo scrape only as fallback if Tavily fails.
  3. `generate_content` — blog/ad/social/email/script using brand kernel context.
  4. `seo_analyze` — Semrush connector (already available) for keyword + SERP checks.
  5. `generate_image` — Lovable AI image model, stored as artifact.
  6. `save_artifact` — persist to `artifacts`, open panel client-side via stream part.
- Judge model pass on every artifact (helpfulness 1–5, groundedness 0–1, citation coverage %) → `artifacts.eval_score`.
- Server-side plan enforcement before each tool call; 429 with human message when exceeded.
- Audit log write-through on: auth events (already), role change, billing webhook, and any run with cost > $0.25.

### Files touched (high level)
- Edit: `src/styles.css`, `src/routes/__root.tsx`, `src/routes/index.tsx`, `src/routes/auth.tsx`, `src/routes/app.tsx`, `src/routes/app.index.tsx`, `src/routes/api/chat.ts`, `src/routes/api/stripe.webhook.ts`, `src/components/app-sidebar.tsx`, `src/start.ts`.
- New: `src/routes/pricing.tsx`, `src/routes/app.c.$conversationId.tsx`, `src/routes/app.artifacts.tsx`, `src/routes/app.artifacts.$kind.tsx`, `src/components/agent/*` (artifact-panel, tool-card, source-card, usage-meter, command-palette), `src/lib/agent/tools/*.ts` (brand-retrieve, research, generate-content, seo, generate-image, save-artifact), `src/lib/agent/judge.server.ts`, `src/lib/billing.functions.ts`, `src/routes/api/public/webhooks/stripe.ts` (move from current path).
- Migration for schema deltas + `plan_limits` view + audit triggers where safe.
- Retire (route-only, keep files as redirects for one release): `app.brands.tsx`, `app.campaigns.tsx`, `app.content.tsx`, `app.research.index.tsx`, `app.research.$projectId.tsx`.

### Out of scope (steps 7–12)
RAG upload UI polish, deep Judge dashboards, Stripe billing portal deep-link, full audit-log viewer, security scan triage, and Playwright suite land in the next batch.

### Verification
Typecheck + build must be green. Manual smoke: sign in → new chat → send prompt → research tool card streams → artifact panel opens → artifact appears in library → pricing → Stripe test checkout → webhook flips `subscriptions.status`.

Approve and I'll execute in this order.
