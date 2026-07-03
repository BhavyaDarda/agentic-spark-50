# Enterprise UI Craft Pass

Goal: move Marketing Agent from "working dark SaaS" to a distinctive, enterprise-grade product surface — no generic AI-slop gradients, no purple-on-black clichés. Take direction from Dribbble/Uiverse/21st.dev/shadcn/Referro references, but commit to one coherent visual language across every surface, these reference resources and sites have the resources we need, so pick what is the best from there.

## 1. Pin the taste (one question round)

Ask three visual-preference questions in a single call so every downstream surface locks to the same tokens:

1. **Palette** — 4 curated options tuned for enterprise/agentic products:
  - Noir & Ember (current — dark charcoal + ember orange accent)
  - Obsidian & Signal (near-black + electric cyan signal)
  - Graphite & Sulfur (warm graphite + acid yellow)
  - Ivory & Ink (light-mode: bone white + rich ink, Swiss)
2. **Typography** — 4 pairings rendered in their real fonts:
  - Instrument Serif + Inter (editorial + neutral UI)
  - Space Grotesk + JetBrains Mono (product + technical accents)
  - Sora + Manrope (crisp modern SaaS)
  - Fraunces + Geist (expressive display + engineered body)
3. **Density & motion register** — Compact / Comfortable / Spacious wireframe options, each hinting at motion intensity (subtle vs generous).

No fourth "vibe" question — the three picks encode it.

## 2. Capture + run design directions on the two hero surfaces

Before generating variants, use Playwright to capture the current `/` hero and `/app` (signed-in chat shell empty state). Attach those screenshots to two `design--create_directions` calls, locked to the picked palette/type/density:

- **Direction round A — Landing hero** (headline block + primary CTAs + trust strip). Three variants that differ in composition/hierarchy, not tokens.
- **Direction round B — Chat shell** (sidebar + conversation + composer + artifact panel empty state). Three variants exploring composer placement, tool-card language, and artifact affordance.

Each round ends with an `ask_questions` type=prototype pick. Do not implement until the user chooses.

## 3. Ship the chosen directions with real craft

Once picks land, rebuild in this order — each step verified with Playwright screenshots before moving on:

1. **Design tokens** — Copy the winning palette values verbatim into `src/styles.css` `@theme inline` (oklch), add semantic aliases (`--surface-1/2/3`, `--stroke-subtle/strong`, `--accent-ember`, `--signal`, gradient + shadow tokens). Register fonts via `@fontsource-variable/*` package imports at the top of `styles.css` (never a remote URL `@import`).
2. **Primitive refinement** — Extend shadcn variants used app-wide:
  - Button: add `premium` (gradient + inset highlight), `ghost-strong`, `icon-sm` sizes.
  - Card: add `elevated` and `bordered-inset` variants with layered shadow tokens.
  - Input / PromptInput: refine focus ring (v4 `ring-3` + accent), floating label option.
  - Badge: add `agent-status` variants (planner/searcher/reader/synth/critic) with distinct hues drawn from the palette.
3. **Landing page** — Rebuild `src/routes/index.tsx` from direction A: real hero, agent-lineup section as a horizontal rail with animated status ticks, "How the loop works" diagram, security strip, pricing anchor, footer. Motion via `motion/react` — restrained, deliberate; no purple particle fields.
4. **Chat shell** — Rebuild `src/routes/app.tsx` + `app.index.tsx` + `app.c.$conversationId.tsx` from direction B. Use AI Elements primitives (`Conversation`, `Message`, `MessageResponse`, `PromptInput`, `Shimmer`, `Tool`) as the foundation; customize around them (agent identity mark, tool-card language, citation chips, artifact slide-over). Replace the generic Sparkles identity mark with a generated Marketing Agent logo.
5. **Auth + settings polish** — Match new tokens; add HIBP-enabled password field state, Google button that uses the Lovable broker, and clean two-column workspace/billing layout.
6. **Empty states + loading** — Custom illustrations (SVG, on-brand) for empty chat / no artifacts / no brands / no research projects. Shimmer + skeleton use the new tokens.

## 4. Verify

- `bun run build:dev` clean.
- Playwright pass: `/`, `/auth`, `/app` (signed in via injected Supabase session), `/app/c/<new>`, `/app/artifacts`, `/app/brands`, `/app/settings` — screenshots reviewed for contrast, spacing, and no console errors.
- Fix the lingering SPA invariant (stale `/api/chat` route in browser after prior test) by ensuring in-app links only use typed `<Link>` to real routes; the API route should never be navigated to as a page.

## Technical notes

- Tailwind v4: tokens in `@theme` / `@theme inline`; custom utilities via `@utility`; no `tailwind.config.js`.
- Fonts: `<link>` in `__root.tsx` head OR `@fontsource-variable/*` package import — never remote `@import` in `styles.css`.
- No hardcoded color classes (`bg-black`, `text-white`) in components — every color routes through a semantic token.
- Chat surfaces must keep the AI SDK message/tool/prompt-input contract intact while customizing visuals.
- Auth-gated routes stay under the managed pattern; the `/app` layout already runs `ssr: false` with a real `getUser()` gate.

## Deliverable

A single coherent visual system applied across landing, auth, and the entire signed-in product, driven by user-picked palette/type/density and two rendered direction rounds — not by agent guesswork.