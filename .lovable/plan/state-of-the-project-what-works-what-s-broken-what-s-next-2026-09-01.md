# State of the project: what works, what's broken, what's next

Verified this pass: production build (`build OK`), full route/function call-graph audit, database inspection, and a live browser pass over `/`, `/auth`, `/app` (no console errors, `/app` correctly redirects to `/auth`).

## What is genuinely working

| Surface | Evidence |
|---|---|
| Build + typecheck | Latest build log: `build OK`, zero console errors on the three public screens. |
| Landing page | Brutalist kit fully applied: rotated logo tile, oversized hero, agent console slab, marquee, loop grid, capability blocks. Screenshot-verified. |
| Auth | `/auth` split brutal card, Google + email/password, protected-route redirect works. |
| App shell + sidebar | Squared 3-4px borders, workspace/plan chips, all seven nav links resolve to real routes. |
| Chat | Real streaming, three tools (`web_search`, `fetch_page`, `save_artifact`), citations, artifacts, MCP tools injected dynamically. |
| Research Ninja | Six-agent SSE run (Planner/Searcher/Reader/Synthesizer/Critic/Writer), sources persisted, critic score parsed, share toggle wired. |
| Public report `/r/$slug` | Renders report, trust surface (critic score, sources, tokens, duration) and one labelled sponsor. |
| Sponsors | Admin CRUD screen (admin-gated), keyword-weighted rotation, click tracking, pre-run sponsorship offer inside a research project. |
| Team | Invite / revoke / role change / remove, plus `/invite/$token` accept page. |
| Campaigns, Content Studio, Brands, Artifacts | Full CRUD against live data, quota-enforced, no mock data anywhere. |
| Security | RLS on all 23 public tables, SSRF guard, rate limits, audit log, no keys client-side. |

## What has gone to shit

1. **Brand memory / RAG is a lie on the landing page.** `knowledge.functions.ts` (ingest text, ingest URL, vector search, delete) has **zero callers** in the entire app. No UI, and the chat orchestrator never calls `searchKnowledge` — yet the landing page advertises "applied to every output automatically."
2. **Design language is split down the middle.** The shell is squared brutalist; 39 `rounded-md/lg/xl/full` occurrences plus `backdrop-blur` and hardcoded `shadow-black/20|30` survive in `app.index.tsx`, `app.c.$conversationId.tsx`, `app.campaigns.tsx`, `app.artifacts.tsx`, `app.research.*`, `r.$slug.tsx`, `__root.tsx` and all four `ai-elements/*` files. The signed-in product still looks like the old glass build.
3. **Nothing has ever been run end-to-end.** The database has **0 auth users, 0 workspaces, 0 conversations, 0 research runs, 0 sponsors**. Every "working" claim above is code-level, not behaviour-level. No sponsor rows also means the sponsor slot and the ad model are literally inert.
4. **Database security findings still open.** `rate_limits` and `sponsor_events` have RLS enabled with **zero policies** (silent total lockout for any non-service path), 6 `SECURITY DEFINER` functions are executable by signed-in users, 1 extension sits in `public`.
5. **Dead weight.** `gsap` and `ogl` still in `package.json` with zero imports; `src/components/fx/Magnetic.tsx`, `RevealText.tsx`, `Marquee.tsx` are dead (landing re-implements its own marquee); `getMembers` and `getMyWorkspaces` orphaned; a "Cost" tab and unused `stripe_*` columns are billing leftovers.
6. **Auth screen breaks on tall viewports.** At 1280x1800 the split panels stretch, leaving a large dead magenta field and off-centre content.
7. **No workspace switcher** even though users can belong to several, and **no measurement loop** — the differentiator ("did AI engines cite your published report?") is still only a claim.

## Next, in order

### Phase A — make the claims true (highest value)
- Build a Knowledge surface: `/app/knowledge` (or a Brands tab) to paste text / import a URL, list sources with chunk counts, delete.
- Register `search_brand_knowledge` as a chat tool and call it in the research Synthesizer, so brand memory actually reaches output.
- Seed real sponsor rows so the ad model is live, and give the admin screen an impressions/clicks/CTR strip.

### Phase B — finish the design pass
- Retokenize every remaining route and the `ai-elements/*` chrome to the kit: zero radius, 3-4px black borders, hard offsets; delete `backdrop-blur` and `shadow-black/*`.
- Fix the `/auth` tall-viewport layout.
- Add brutalist empty states, skeletons and error boundaries across `/app`.

### Phase C — prove it works
- Seed one full account (workspace, brand, conversation, research run, published report) and drive a Playwright pass over sign-up, chat stream, a research run, publish, and a sponsor click — desktop and mobile, screenshots, zero console errors.

### Phase D — security + cleanup
- Add explicit policies (or deliberate service-role-only lockdown with comments) for `rate_limits` and `sponsor_events`; revoke `EXECUTE` from `authenticated` on the internal `SECURITY DEFINER` helpers; move the public extension.
- Remove `gsap`, `ogl`, `src/components/fx/*`, the orphaned workspace functions, and the billing leftovers.

### Phase E — the wedge
- Citation tracking: store each published report's URL, poll AI engines for whether it gets cited, and show "cited by" on the report and in the app. This is the loop nobody else closes.

## Technical notes
- No schema changes needed for Phase A; `documents` table + pgvector already exist and are policy-covered.
- Phase D migrations are policy/grant-only, no data movement.
- Phase E needs a new table (`report_citations`) plus a cron-triggered route under `src/routes/api/public/*`.
