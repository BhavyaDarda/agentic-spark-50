# Validation, the ad-funded pivot, and what to build next

## Part 1 — What is actually implemented today (audited, not assumed)

Real and wired end to end:
- Chat-first app shell with conversation history, streaming, tool cards, artifact panel (`app.tsx`, `app.c.$conversationId.tsx`, `app.artifacts.tsx`).
- Research Ninja: multi-agent pipeline (Planner → Searcher → Reader → Synthesizer → Critic → Writer) streaming over SSE, persisting steps, sources, and embeddings.
- Brands, content studio, campaigns, knowledge/RAG ingestion, MCP integrations, team invites and roles, usage view, settings.
- Public shareable reports at `/r/$slug` with a Share dialog, reused slugs, and per-report social meta.
- Security: workspace RLS, hardened database functions, SSRF guard on every server-side URL fetch, quotas and sliding-window limits on chat, content, and research.

Discussed but still only partly there:
- The **sponsor slot on public reports is a hard-coded placeholder**. There is no sponsor table, no selection logic, no impression counting.
- **Pricing still exists**: paid tiers in the plan limits, a pricing story on the landing page, a billing surface in settings, and a Stripe webhook route.
- **The trust surface is computed but hidden**: the Critic score and per-run cost/time are produced by the pipeline and stored, but the UI does not show them as a first-class signal.
- **No citation/visibility loop**: nothing checks whether our published reports or the user's pages get cited by AI answer engines.

## Part 2 — Where this stands against the market (researched today)

What is good and worth doubling down on:
- Auditable, multi-agent research with visible steps and sources. The AI-visibility category is full of tools that are "a dashboard and an invoice" — the repeated 2026 complaint is that they tell you you're invisible and then do nothing about it. We generate, so we can act.
- Public, indexable report pages. That is a distribution engine and the natural ad surface, and almost nobody in the writer category has one.
- Cost honesty. Buyers are actively angry about opaque credit burn and about vendor pricing being "dashboard margin, not data cost."

What is shit or dead weight:
- "AI marketing suite" framing. Brand voice, briefs, and multi-channel copy are commodity in 2026 — that positioning loses on sight.
- Standalone deep research as the headline. ChatGPT, Perplexity, and Gemini ship it free.
- Subscription tiers as the primary story, especially with the ad pivot. Keep the metering, drop the paywall narrative.

Gaps nobody is filling right now, in order of how actionable they are for us:
1. **Close the loop.** Generate → publish → check whether AI engines cite it → feed the answer back into the next run. Trackers measure; writers write; nobody does both in one product.
2. **Make trust the interface.** Every claim links to a source, the Critic score is on the report, and the user can see which claims were weakly supported. Answer-engine coverage is measurably inconsistent (one engine browsed the web on only ~74% of calls in a public production test), so showing evidence quality is a real differentiator, not decoration.
3. **Show the meter.** Tokens, cost, wall time, and sources per run, in the open, while competitors hide it.
4. **Report pages as the product's front door.** Every published report is a landing page that both ranks and gets cited — which is exactly the thing we sell.

## Part 3 — The ad-funded model (no paywall)

Everything free, metered generously, ads only where they cannot damage the work.

Hard rules, enforced in code:
- Never inside an answer, a report body, or the composer.
- One unit per view, always labeled "Sponsored", always dismissible.
- Server-selected from our own sponsor table. No third-party scripts, no tracking pixels, no personal data leaves the app.
- Signed-in workspace surfaces stay ad-free. The promise is "your workspace is never for sale."

The units, best first:
1. **Sponsored source card.** In the Sources rail of a public report, one labeled card that is genuinely relevant to the topic and never mixed into the cited claims. This is the pattern that public 2026 pilots report shipping with no measurable hit to trust and low dismissal rates.
2. **Run sponsorship, opt-in and pre-run.** Before a heavy deep run: "This run is on <brand>. Cool?" The user gets something real — a bigger run — instead of hitting a limit. This is the highest-consent ad format in the product.
3. **The credit line.** Every public report closes with a one-line, editorially written sponsor credit in our own voice, newsletter-style and rotating. The thing people actually read, not a banner.
4. **Tool marketplace, not banners.** Sponsored MCP integrations in the Integrations tab: the ad is a feature you can install.
5. **The footer easter egg.** A rotating, funny "this report was researched by 6 arguing robots and paid for by <brand>" line on public pages, with an occasional joke variant. Charm carries the ad; the ad does not carry the page.

Removed: pricing tiers, checkout, the billing surface, and the paid-plan story. Metering stays for abuse control, and a future "no ads" switch stays possible for anyone who ever pays for seats.

## Part 4 — Build scope for this phase

1. **Sponsors backend.** A `sponsors` table (name, tagline, copy variants, destination URL, logo, topic keywords, active window, weight) plus an impressions/clicks table. Public read of active sponsors only; all writes admin-only. Server-side selection by report topic keywords with weighted rotation and a graceful "no sponsor" state.
2. **Sponsor units on public reports.** Replace the placeholder with the real source card, the rotating credit line, and the funny footer line. Impressions and clicks recorded server-side.
3. **Run sponsorship offer.** Pre-run opt-in card in the research flow that raises the run's depth when accepted, recorded against the sponsor.
4. **Trust surface.** Critic score, source count, and run cost/time shown on the report and in the run detail; weakly supported claims flagged.
5. **Strip pricing.** Remove the paid tiers, billing surface, checkout, and Stripe route; rewrite the landing page's money section as "free, ad-supported, your workspace stays ad-free."
6. **Sponsor admin.** A small internal-only surface to add sponsors and read impression counts.

## Technical notes

- Sponsor selection runs in a server function or the public report loader — never a client-side ad call — so ad blockers, tracking, and layout shift are all non-issues.
- Impression and click writes go through the service-role path already used by usage metering; the sponsor tables get public `SELECT` on active rows only, with no client writes.
- Removing tiers means `PLAN_LIMITS` collapses to one generous free tier; `assertQuota` and the sliding-window limiter stay in place so abuse control survives the pivot.
- The citation/visibility loop (gap 1) is real but bigger than this phase: it needs scheduled engine probes and a history table. Sponsors, trust surface, and the pricing removal come first, then the loop as its own phase.
