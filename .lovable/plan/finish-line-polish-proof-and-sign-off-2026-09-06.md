# Finish line: polish, proof, and sign-off

The features are all in place and the app builds cleanly. What is left is making every screen feel finished and proving the whole flow works end to end with a real signed-in account.

## 1. Consistent screen states

Every list and detail screen gets the same three treatments in the bold border-and-shadow style used elsewhere:

- Loading: a blocky placeholder grid instead of a bare spinner.
- Empty: a short line explaining what the screen is for plus the one action that fills it (e.g. "No brands yet — add your first brand").
- Failure: the shared failure panel with a retry action.

Screens covered: chat, brands, content, campaigns, research list and detail, artifacts, brand memory, sponsors, settings tabs.

## 2. Remove the last rounded-corner leftovers

Three pages (public report, invite, settings) and the shared building blocks still carry soft corners and blur left from the previous look. Sweep them so the whole app is visually consistent: square corners, thick black borders, hard shadows.

## 3. Demo content for a first-run account

A new signed-in account currently lands on empty screens. Add starter content so the product demonstrates itself immediately: one sample brand, one published research report with sources and a critic score, a couple of generated content pieces, and one campaign. Written as literal database rows, attached to the workspace created on sign-up.

## 4. End-to-end proof with a real account

Sign in as a test account in a real browser and walk the full path, capturing a screenshot at each stop:

sign up / sign in → chat with streaming answer → add brand memory and search it → create a research project and run it → publish it → open the public link and confirm the sponsor slot, the "how this was made" trust panel, and the cited-by strip → check citation counts back inside the app → settings (team, usage, integrations).

Anything broken found here gets fixed in the same pass, then the walk is repeated.

## 5. Final checks and sign-off notes

- Full typecheck and build must be clean.
- Run the security scan and write down, in plain language, the findings that are intentional (internal-only tables that no user can touch directly, the helper functions the database uses on our behalf) so future reviews don't chase them.
- Confirm the scheduled citation measurement endpoint responds only with the correct secret.

## Technical notes

- Shared state components: extend `src/components/route-error.tsx` with `ListSkeleton` and `EmptyState` siblings; wire via each route's `errorComponent` / `pendingComponent`.
- Radius sweep: `src/routes/r.$slug.tsx`, `invite.$token.tsx`, `app.settings.tsx`, plus `src/components/ui/*` primitives actually in use.
- Seed: one migration with literal INSERTs keyed off the sign-up trigger's workspace; no runtime seeding, no page-load seeding.
- E2E: Playwright under `/tmp/browser/`, session minted via `lovable auth-session`, screenshots per step.
- Verification: `bunx tsgo --noEmit`, build log, `security--run_security_scan`, curl against `/api/public/citation-sweep` with and without the secret.
