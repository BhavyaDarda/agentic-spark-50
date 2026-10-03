# Action plan: harden what exists, then add the high-value features

Built in stages. Every stage gets tested in a real browser with the demo account before the next one starts.

## Stage 1: Robustness fixes (from Part 2)
1. **Saved critic score:** each research run stores its reviewer score as a number, so the public badge no longer depends on how the reviewer words its text. Older runs get the score copied over from their existing text.
2. **Failed runs:** if a run fails or is interrupted, the project page shows a clear red banner with the reason and a "Retry" button, not a half-empty report. Runs stuck as "running" for more than 15 minutes get marked as failed.
3. **Long brand documents:** long notes and pages are split into overlapping pieces so the whole document can be searched, not just the first few thousand characters. Each source shows how many pieces it has, and you can re-import older sources.
4. **Password rules:** sign-up, reset and Settings all require at least 8 characters.
5. **Legal and domain details:** the business name, address and jurisdiction stay blank until you provide them. I will need those from you.

## Stage 2: Export and white-label dossiers
- A "Download PDF" button on every public report and inside the project. It uses the browser's clean print layout, so it works on the live site.
- Workspace branding settings: upload a logo, set an accent colour and a "Prepared by" name. Published reports and the PDF then show the agency's branding, with a small "Made with REACHER AI" credit.
- Custom domains per client are left for later. They need hosting work outside the app.

## Stage 3: Sponsors that target topics
- Sponsors can pick categories and keywords, such as fintech, checkout or billing, and choose whether to show only on matching reports.
- The sponsor admin page shows impressions, clicks and click-through rate for each category.

## Stage 4: Radar, recurring research monitors
- On any project you can choose "Monitor weekly" or "Monitor monthly".
- A scheduled job reruns the agents, compares the new report with the last one and writes a "What changed" brief. You see it in the app, and you also get it by email once email sending is set up.
- Monitors respect usage limits and pause after repeated failures.

## Stage 5: Publish to other tools
- One-click sending from the Content Studio to webhooks, which covers Zapier, Make, Ghost and WordPress.
- A direct Notion export. LinkedIn and Webflow need their own account connections, so those come later and only if you want them.

## Stage 6: Reasoning map
- On public reports, an interactive diagram shows the path from the topic to the search queries, then to the pages read, the brand notes used and the final verdict. All of it is built from the real data saved for that run.

## Final checks
A full walkthrough with screenshots, including a demo research run, publish, PDF, a Radar run triggered by hand and a sponsor match. Also a clean build, a security scan and an updated roadmap.

## What I need from you
- Your legal entity name, address and jurisdiction (Stage 1).
- Whether to set up email sending for Radar briefs (Stage 4).

## Technical notes
- Migration: `research_runs.critic_score int`, `error text` reuse, plus backfill using the existing parse function. Add `workspace_branding` columns, `sponsors.categories text[]` / `target_mode`, a `research_monitors` table (cadence, next_run_at, failures), a `research_run_diffs` table and a `publish_destinations` table (encrypted webhook URLs, server-only). All of them get GRANTs and RLS.
- Chunking: about 1,800 characters with 200 overlap in `knowledge.functions.ts`. Embeddings are sent in batches and indexed by `data[].index`.
- Radar: `/api/public/radar-tick` uses a shared-secret check and is triggered by pg_cron + pg_net, which need enabling. Runs reuse the research pipeline as a server module.
- PDF: a print stylesheet plus `window.print()`, because there is no headless browser in the worker. The reasoning map is SVG built from `plan.queries`, `research_sources` and the brand hits.
- Webhook delivery goes through the SSRF guard and is signed with HMAC.
