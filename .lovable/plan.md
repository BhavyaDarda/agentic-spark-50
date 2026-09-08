# Finish the product: audit, password reset, starter content, and proof

Checked before writing this: the app has no "forgot password" link, no reset screen and no reset code anywhere; the round shapes that remain live in the shared building blocks (progress bar, slider, skeleton, tooltip/menu popovers), not in the pages themselves; and new accounts get a workspace, membership and free plan created automatically at sign-up, so starter content has to be added by that same sign-up step rather than as fixed rows.

## 1. Full capability audit (written up for you in plain language)

Walk every surface and every backend action and report what works, what is half-wired, and what is missing:

- Chat: streaming answers, tool cards, brand-memory lookup, artifact saving.
- Research Ninja: plan, search, read, synthesize, critique; sources, critic score, cost, publish, public link.
- Content, campaigns, brands, brand memory, artifacts, sponsors, settings (team, usage, integrations).
- Every server action and public endpoint: which need sign-in, which are open, and whether each open one checks its caller.

Output: one short report in chat, plus anything broken fixed in the same pass.

## 2. Complete the account flows

- Add "Forgot password?" on the sign-in screen, which emails a reset link.
- Add the reset screen the link lands on, where the user sets a new password.
- Add a password change in settings that asks for the current password.
- Verify sign-up, sign-in, Google sign-in and sign-out end to end, including that the header/sidebar reflects who is signed in.

## 3. Square off the last round shapes

The usage bar, the sponsor form slider, the loading placeholder and the small popovers still use pill and soft shapes. Sweep the shared building blocks so the whole app is square-cornered with thick black borders.

## 4. Starter content for brand-new accounts

Extend the sign-up step so a new account opens onto a working product instead of empty screens: one sample brand, one short brand-memory note, one finished research project with sources and a critic score, two generated pieces, one campaign. Clearly labelled as samples so nobody mistakes them for their own work.

## 5. Signed-in walkthrough with screenshots

Sign in as a test account in a real browser and walk: sign in → forgot/reset password → chat with a streaming answer → brand memory search → create and run research → publish → open the public link and check the sponsor slot, the "how this was made" panel and the cited-by strip → citation counts back in the app → settings tabs. Screenshot each stop, fix whatever breaks, repeat the walk.

## 6. Final checks and security notes

- Clean typecheck and build.
- Security scan, with a plain-language note on which findings are intentional.
- Confirm the scheduled citation endpoint answers only with the correct secret.

## Technical notes

- Reset flow: `resetPasswordForEmail` with `redirectTo: ${origin}/reset-password`, new public route `src/routes/reset-password.tsx` handling the recovery session and calling `updateUser({ password })`; settings change sends `current_password`.
- Radius sweep: `src/components/ui/progress.tsx`, `slider.tsx`, `skeleton.tsx`, `tooltip.tsx`, `drawer.tsx`, and the menu/popover primitives in use.
- Starter content: migration that updates `handle_new_user` to insert the sample brand, document, campaign, content runs and a succeeded research run + sources for the new workspace; idempotent, no runtime or page-load seeding.
- Audit: trace `src/lib/*.functions.ts`, `src/routes/api/*`, RLS/grants per table; E2E via Playwright under `/tmp/browser/` with a session minted by `lovable auth-session`.
- Verification: `bunx tsgo --noEmit`, build log, `security--run_security_scan`, curl against `/api/public/citation-sweep` with and without the secret.
