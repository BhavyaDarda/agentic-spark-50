# Validation, ad-funded model, and a real Share flow

## Part 1 — Where the product stands vs the market (researched today)

What the market already does well, so we should not "win" there:
- Brand voice engines, campaign briefs, and multi-channel content are commodity in 2026 (Jasper's agentic relaunch, Copy.ai-as-GTM, AirOps workflows). Being "another AI writer" is a dead position.
- Deep-research agents are commodity too (ChatGPT/Perplexity/Gemini all ship them free).

What people are actually angry about (real, sourced complaints):
- Opaque credit burn: users cancel because a $200/mo tool eats credits with no visible cost per output (AirOps cancellation write-ups). Our per-run cost/usage transparency is already a differentiator — surface it hard.
- Output you cannot trust: no citations, no verification, no "why did the agent believe this".
- Nobody closes the loop: writing tools do not tell you whether the content got cited by ChatGPT/Perplexity/Google AI answers (GEO/AEO visibility). Only niche trackers do it, and they don't generate.

Gaps worth acting on (this is where we differentiate):
1. **Generate → publish → get cited → measure, in one loop.** Track whether our own generated pages/answers get cited in AI answers, and feed that back into the next run. Nobody in the writer category does this.
2. **Auditable research** — every claim in a report links to a source, with a critic pass score visible to the user. We already run Planner→Searcher→Reader→Synthesizer→Critic; we just don't expose the trust surface.
3. **Public, shareable, indexable research reports** — free distribution engine and the natural ad surface (see Part 2).
4. **Cost honesty** — show tokens/cost/time per run when everyone else hides it.

What should go out: subscription tiers as the primary story, the "generic AI marketing suite" framing, and any feature that only exists to look full (keep the ones with a real loop).

## Part 2 — Ad-funded, non-intrusive monetization

Recommended model (the whole product free, no paywall):

1. **Sponsored source card (primary revenue).** Inside a research report's Sources rail, one clearly labeled "Sponsored" card that is *actually relevant to the query* and never mixed into the cited claims. This is the ChatGPT-ads pattern that measurably did not dent trust: ads never alter the answer.
2. **Public report pages carry the ads, the app does not.** `/r/$slug` reports are SEO/AEO magnets. One tasteful in-report sponsor unit + one footer "powered by" unit. Signed-in workspace surfaces stay ad-free — that's the "your workspace is never for sale" promise.
3. **"Brought to you by" run sponsorship.** A heavy run (deep research) can be sponsored: the user sees "This deep run was covered by <brand>" *before* it runs, choosing it instead of a limit. It's opt-in, funny, and converts because it buys the user something real.
4. **Tool marketplace, not banners.** Sponsored MCP integrations / tool cards in the Integrations tab — the ad *is* a feature they can install.
5. **The credit-line easter egg.** Every report ends with a one-line, editorially-written sponsor credit in our own voice (newsletter-style, the thing people actually read). Rotating copy, never a banner.

Hard rules baked in: never inside the answer body, never in the composer, one unit per view, always labeled, always dismissible, no third-party tracking pixels (server-side rendered from our own sponsor table), and a "no ads" switch for anyone who ever pays.

Fallback if fill rates disappoint: keep quotas generous and free, and monetize seats + private workspaces only.

## Part 3 — Ship now: the Share action

`/r/$slug` and the `toggleSharing` backend already exist and the detail page has a bare Share button, but there is no real publish UX: no visible link, no copy/open, no revoke confirmation, no share state on the project list.

Scope of this implementation:
- **Share dialog** on the research project page: publish toggle, the full `/r/<slug>` URL in a read-only field, Copy link, Open in new tab, Unpublish. Replaces the current one-shot button.
- **List page**: a `public` badge + quick copy-link action on each project card.
- **Public report page polish**: report header, sponsor slot placeholder (Part 2, item 2), per-report `head()` meta — title, description, og:title/og:description, og:type, twitter:card — so shared links look right and are indexable.

## Technical notes

- Share UI is presentation-only on top of the existing `toggleSharing` server fn; add a `getShareState`-style read only if the slug isn't already returned by `getProject` (it is on the project row, so no new server fn needed).
- `toggleSharing` currently regenerates a slug on every re-publish; make it reuse an existing slug so previously shared links keep working.
- Ads work (Part 2) is a separate follow-up phase: a `sponsors` table with RLS, server-side selection by topic keywords, impression counting through a server fn — no client-side ad scripts.
