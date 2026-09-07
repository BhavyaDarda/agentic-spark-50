# Finish the remaining polish and prove it end to end

Checked before writing this: the latest build is clean, the shared loading placeholder / empty-state / retry panel now exist but no screen uses them yet, and the public report, invite and settings pages plus the shared building blocks still carry soft corners and blur.

## 1. Use the new screen states everywhere

Swap the bare "Loading…" lines and plain "nothing here" text for the blocky placeholders and empty states on: brands, research list, campaigns (list and detail), content, artifacts, brand memory, sponsors. Each empty state says what the screen is for plus the one action that fills it.

## 2. Clear the last soft-corner leftovers

Sweep the public report page, the invitation page, the settings page, and the shared building blocks actually used by the app so everything matches: square corners, thick black borders, hard shadows.

## 3. Starter content for a brand-new account

A fresh signed-in account lands on empty screens today. Add starter rows attached to the workspace created at sign-up: one sample brand, one published research report with sources and a critic score, two generated pieces, one campaign. Written as literal database rows, not created on page load.

## 4. Signed-in walkthrough with screenshots

Sign in as a test account in a real browser and walk: sign in → chat with a streaming answer → add brand memory and search it → create and run a research project → publish it → open the public link and check the sponsor slot, the "how this was made" panel and the cited-by strip → check citation counts back in the app → settings (team, usage, integrations). Screenshot each stop; anything broken gets fixed in the same pass and the walk repeated.

## 5. Final checks and sign-off notes

- Clean typecheck and build.
- Run the security scan and note, in plain language, which findings are intentional (internal-only tables no user can touch, helper functions the database uses on our behalf).
- Confirm the scheduled citation measurement endpoint answers only with the correct secret.

## Technical notes

- Wire `ListSkeleton` / `EmptyState` from `src/components/route-error.tsx` into each `/app` route; keep `errorComponent` as is.
- Radius sweep: `src/routes/r.$slug.tsx`, `invite.$token.tsx`, `app.settings.tsx`, plus in-use `src/components/ui/*` primitives.
- Seed: one migration with literal INSERTs keyed off the sign-up trigger's workspace.
- E2E: Playwright under `/tmp/browser/`, session minted via `lovable auth-session`.
- Verification: `bunx tsgo --noEmit`, build log, security scan, curl against `/api/public/citation-sweep` with and without the secret.
