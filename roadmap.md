# Roadmap — REACHER AI action plan (2026-10-03)

## Open
- [x] Finish pass: disposable-account password/deletion flows passed; shared-workspace ownership rejection and transfer tested; runtime MCP credentials encrypted/server-only, caller-scoped tools, redirect refusal, failure isolation and page metadata completed.
- [x] Runtime MCP: public documentation server connected, survived reload, supplied a cited two-sentence assistant answer, then removed; Notion OAuth opened at the provider and the temporary connection was removed.
- [ ] OAuth completion and private provider tool use — blocked: needs the user's provider consent; sign-in initiation only verified, not full Notion authorization.
- [x] External-capability direction: use runtime MCP and linked apps for missing native features; checked the existing Settings connection registry and available per-user services. No additional account was connected or new service action enabled by this review.
- [x] Campaign plan: fixed "response did not match schema" failure; real plan built in browser
- [x] Security scan clean; 8 safety tests pass (run with `bun test`)
- [x] Remaining product verification: export/global sign-out previously verified; wrong password rejected, new password accepted, old password rejected, and disposable account deleted; shared workspace safeguards verified against real disposable accounts.
- [x] Stage 2 follow-up: uploaded logos, public reports and PDF/print verified in the previous pass.
- [x] Stage 3: topic-targeted sponsors + per-keyword stats
- [x] Stage 4: Radar monitors, hourly timer on, manual rerun verified
- [ ] Radar email briefs (deferred by user; needs an email domain)
- [x] Stage 5a: Content Studio webhook export — real saved output received externally; desktop/mobile checked, no browser errors; HTTPS allowlist, signatures, no redirects, bounded payloads, server-side metering, audit receipts
- [x] Stage 5b: saved research webhook export — real delivery verified in the previous pass.
- [ ] Stage 5c: direct Notion export — blocked: no configured per-user client; connection approval declined this turn.
- [x] Stage 6: public evidence map — 5 saved searches, 27 cited passages, source selection verified on a real report; desktop/mobile checked, 4 citation tests pass. Per-search source relationships and private brand documents intentionally omitted rather than inferred.
- [ ] Legal entity, address, jurisdiction (blocked: needs user input)

## Done
- [x] Export safety and evidence privacy tests: 8 passing; build OK
- [x] Verified public report with 24 real sources on desktop/mobile; Settings colour saved, reloaded, and restored; no browser errors
- [x] Public report typography, evidence strip, source list, and unframed reading layout
- [x] Stage 2: PDF download + report branding (browser-tested)
- [x] Stage 1: saved critic score, failed-run banner + retry, stuck runs marked failed, 8-char passwords, long-document chunking (already in place)
- [x] Rebrand, live search, legal pages, accessibility, demo video, demo walkthrough
