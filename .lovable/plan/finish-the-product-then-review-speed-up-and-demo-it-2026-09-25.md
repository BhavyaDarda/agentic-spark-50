# Finish the product, then review, speed up, and demo it

The work is split into stages. Each stage ends with something you can see before the next one starts.

## 1. Finish the interrupted work

- **Settings, Account tab:** change your password (you enter your current one first) and a "Delete account" button with a typed confirmation. It uses the deletion action already written on the server.
- **Square off the last round shapes:** the chat message box and the other shared pieces that still show pills. First run a check that the earlier bulk edit to the shared pieces didn't break anything.
- **Starter content for new accounts:** every new sign-up gets a sample brand, one brand-memory note, one finished research report with sources and a critic score, two generated pieces and one campaign. Everything is labelled "Sample".
- **Final checks:** clean build, a security scan with plain-language notes on the findings we accept on purpose, and a test that the scheduled citation check only responds to the correct secret.

## 2. Full capability check (report in chat)

Test each area and mark it as working, partly working or missing:
- Sign up, sign in, Google sign-in, forgot and reset password, sign out, delete account
- Chat with streaming answers and tool cards
- Research Ninja: planning, search, reading sources, writing, critique, cost, publishing, the public link
- Brand Memory, content, campaigns, brands, artifacts, sponsors and settings
- Every server action and public endpoint: whether it needs sign-in, and whether open endpoints check who is calling

Broken items are fixed in this stage.

## 3. Signed-in walkthrough with screenshots

Use a test account in a real browser to go through: sign in, forgot password, a chat with a streaming answer, a Brand Memory search, create and run research, publish it, open the public report (sponsor slot, "how this was made" panel, "Cited by" list), check the citation counts, then the settings tabs. Take a screenshot at each stop. Fix anything that breaks and do the walkthrough again.

## 4. SEO and AI-search (GEO) review and fixes

- Run the SEO review and fix what it finds: page titles and descriptions for every page, social sharing tags, canonical links, robots.txt and a sitemap at reacher-ai.lovable.app.
- For AI answer engines: structured data (Organization and SoftwareApplication on the home page, Article on public reports), clear question-and-answer sections on public reports, and an llms.txt file.
- Check Semrush for the keywords and competitors that matter to the site. Report one clear next step.

## 5. Database and speed optimization

- Measure this project's database usage and the slowest queries first, then fix the worst ones: missing indexes, repeated one-by-one lookups, full lists that should load in pages, and oversized selects.
- Cut repeated AI and API calls: cache embeddings for text that hasn't changed, make research searches run side by side in controlled batches, cache results in the app between pages, and remove unneeded polling.
- Report before-and-after numbers, and note which savings depend on database size or active hours.

## 6. Demo video

Use the video-creator skill to make a Loom-style product demo of about 60 to 90 seconds. It uses the real screenshots and screen captures from stage 3, with captions, narration and music. It will be saved to your Files and can also be embedded on the home page.

## 7. The uploaded .md files: how they will be used

These files cover why AI models give short, lazy or placeholder-filled answers, and how to prevent it. The fixes they describe are organized prompts, required tool use with an evidence block, check-your-own-answer loops, no placeholders, and handling for long outputs that need to continue. They are about output quality, not visual design.

They will be used after stages 1 to 6, in two places:
- **Agent prompts:** rework the chat and Research Ninja prompts along those lines, so answers are complete and backed by evidence.
- **Final website polish:** this uses the remaining .md files you send later.

## Technical notes

- Account: `supabase.auth.updateUser` after re-verifying the current password with `signInWithPassword`. Deletion goes through the existing `src/lib/account.functions.ts`.
- Seed: a migration with `CREATE OR REPLACE handle_new_user`, idempotent inserts, and a "Sample" prefix. Columns are read from `types.ts` before any SQL is written.
- E2E: Playwright under `/tmp/browser/`, with a session minted via `lovable auth-session`.
- SEO: per-route `head()`, `public/robots.txt`, `public/sitemap.xml`, `public/llms.txt`, and JSON-LD in the `/` and `/r/$slug` heads.
- DB: `pg_stat_statements` and `supabase--slow_queries`, then index migrations. React Query `staleTime` defaults set in `router.tsx`.
- Verification: `tsgo`, the build log, `security--run_security_scan`, and curl against `/api/public/citation-sweep`.
