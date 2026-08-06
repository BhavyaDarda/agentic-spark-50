# Sponsor tooling + Neo-Brutalist design pass

Three things: the sponsor admin screen, the opt-in "let a sponsor cover this run" offer, and a new visual language (neo-brutalist) applied across the product.

## 1. Sponsor admin screen

New admin-only page at `/app/sponsors`, visible in the sidebar only for platform admins.

- Table of sponsors: name, tagline, status (live / paused / scheduled), weight, impressions, clicks, click-through rate.
- Create / edit drawer with every field the backend already accepts: name, tagline, body, CTA label, destination URL, logo URL, topic keywords (chip input), credit lines (one editorial line per row, `{name}` supported), weight slider, active toggle.
- Delete with confirmation.
- Live preview of the sponsor card exactly as readers see it on a public report, updating as you type.
- Empty state that explains the model: sponsors never touch findings, one card per report.

Backend already exists (`listSponsors`, `upsertSponsor`, `deleteSponsor`) and each function re-checks the admin role server-side. The only new server work is a tiny `getIsPlatformAdmin` function so the UI can decide whether to show the nav item — authorization itself stays server-side in the existing functions, so hiding the link is cosmetic only.

## 2. "A sponsor can cover this run" offer

Wired into the research flow, before a heavy run starts.

- When a user picks **deep** (and optionally **standard**) depth, we fetch a matched sponsor for that topic and show an opt-in card: what the sponsor is, what they get (one labeled card on the public report, if the user later publishes), and what they explicitly do not get (no influence on sources, wording, or conclusions; no data about the reader).
- Two clear buttons: "Run it, sponsored" and "Run it unsponsored". Declining is never penalised — the run still executes at the same depth.
- Accepting records the sponsorship (`acceptRunSponsorship`) and pins that sponsor to the project's future public report.
- Shown on the project detail page next to the Run button, and inside the create-project dialog when depth is deep.

## 3. Neo-brutalist design pass

Replace the current "Noir & Ember" glass look with a deliberate neo-brutalist system — cool, quirky, confident, still enterprise-legible.

Design rules:
- Hard edges (radius near zero), thick 2px borders, offset hard shadows instead of blur, no glassmorphism.
- High-contrast base (paper/near-black) with one saturated accent plus one secondary "highlighter" hue used sparingly for labels and states.
- Oversized display type with tight tracking for headings; mono for metadata, IDs, agent traces, token counts.
- Blocks over cards: content sits in stacked slabs with visible seams and label chips ("SPONSOR", "CRITIC 82", "6 AGENTS").
- Motion is snappy and mechanical: instant hover offsets, no soft fades.

Where it applies:
- Design tokens and base component variants (button, card, input, badge, dialog, table) in the shared stylesheet, so every screen inherits it.
- Landing page, auth, the public report page `/r/$slug` (including the trust surface and sponsor card), and the app shell + sidebar.
- The chat surface keeps its density; only its chrome changes.

Everything continues to use semantic tokens — no hard-coded colors — so light and dark stay coherent.

## Technical notes

- New route `src/routes/app.sponsors.tsx`; sponsor form extracted to `src/components/sponsor-form.tsx`; offer card to `src/components/sponsor-offer.tsx`.
- `src/lib/sponsors.functions.ts` gains `getIsPlatformAdmin` (auth middleware + `has_role`). No schema change needed — `sponsors` and `sponsor_events` already carry the columns and policies.
- Tokens, radii, shadow utilities and typography are rewritten in `src/styles.css` (Tailwind v4 `@theme inline` + `@utility`); shadcn variants updated rather than per-component overrides.
- Verification: build + typecheck, then Playwright passes over landing, auth, `/r/$slug`, and the sponsor admin screen with screenshots.

## Not in this pass

The citation-tracking loop (measuring whether AI engines cite your published reports) is the bigger wedge and deserves its own plan — happy to draft it next.
