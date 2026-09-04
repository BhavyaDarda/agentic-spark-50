# Finish the remaining work: the citation loop, polish, and an end-to-end proof

Verified this pass: the latest build is clean (`build OK`), brand memory is wired into both chat and research, the neo-brutalist pass has landed on the app routes, the dead animation packages and effect components are gone, and the orphaned workspace helpers are already removed. The `report_citations` table, its member-read policy, its index, the `research_projects.citations_checked_at` column, and three live starter sponsors all exist in the database. What is still missing is the measurement loop, a few UI states, and any actual end-to-end run.

## 1. Close the loop: citation tracking

The differentiator — "did AI answer engines cite your published report?" — is a table with no writer and no reader.

- A sweep endpoint under `src/routes/api/public/` guarded by a shared secret, so a schedule can call it. For each published report not swept recently, it asks answer engines about the report's topic, records every citing URL that points at the report's public link, upserts into `report_citations`, and stamps `citations_checked_at`.
- Public report page: a "cited by" strip on `/r/$slug` listing the engines and citing pages, shown only when there is something to show.
- In-app: a citation panel inside the research project screen — engine, citing page, first and last seen — plus a count on the research index so the loop is visible where the user works.

## 2. Remaining UI states

- Brutalist empty states and loading skeletons for the `/app` list screens that still render nothing while loading (research, campaigns, artifacts, knowledge, brands, content).
- Per-route `errorComponent` on the `/app` routes so one failed query does not blank the shell. Only `/r/$slug` and the root have one today.
- Sweep the last radius leftovers in `r.$slug.tsx`, `invite.$token.tsx`, and `app.settings.tsx` to match the kit.

## 3. Prove it works end to end

- Seed one real account by migration: workspace, brand, a knowledge document, a conversation, a research run with sources, and a published report with a slug.
- Drive the full flow in a browser: sign in, chat with a streaming tool call, run research, publish, load `/r/<slug>`, click the sponsor, and check the citation panel renders.
- Desktop and mobile screenshots, zero console errors, and a plain report of anything that breaks rather than papering over it.

## Technical notes

- The sweep runs server-side only, uses the existing AI gateway helper for engine queries, and writes with the service-role client; nothing about it is reachable from the browser except through the secret-checked route.
- Citation reads go through a new server function in a `*.functions.ts` module using the authenticated Supabase client, so the existing member-read policy governs access; no schema change is needed.
- Seed rows are literal INSERTs in the migration, not created on page load.
- The six `SECURITY DEFINER` linter findings (`has_role`, `match_documents`, and the internal helpers) stay as deliberate authenticated-RPC exceptions; I will document that decision rather than change them.
