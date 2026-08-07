# Neo-brutalist rebuild from the MindLoom kit + product validation

The current "Obsidian/Noir" tokens and the half-applied brutalist pass are the problem: thin 2px seams, acid-yellow on near-black, glass and shader leftovers. We replace the design system wholesale with the exact system from the uploaded kit, then re-verify the product end to end.

## 1. Adopt the kit's design system verbatim

Tokens taken straight from the kit (`src/index.css` + `tailwind.config.ts`), translated into this project's Tailwind v4 CSS-first setup:

- Light default: white paper, pure black ink, black borders. Dark variant included (black paper, white borders) exactly as the kit defines it.
- Colors: magenta primary `hsl(314 100% 50%)` (dark `314 100% 35%`), yellow secondary `hsl(60 100% 50%)` (dark `45 100% 40%`), violet accent `hsl(271 91% 65%)`, red destructive.
- Borders: `4px solid` standard, `6px` thick, radius `0px`, thinner on small screens.
- Shadows: hard offsets `8px 8px 0`, `12px 12px 0`, plus primary/secondary colored variants.
- Motion: `brutal-hover` translate(-4px,-4px) on hover, snap back on active; `brutal-bounce`, `brutal-shake` keyframes.
- Patterns: `brutal-pattern` diagonal hatch and `brutal-dots` at low opacity.
- Typography: Unbounded (display, weights 200-900) + Alata (body), self-hosted via fontsource. Headings `font-weight: 900`, uppercase, tight tracking; body weight 600. Mono kept only for IDs, token counts, traces.

Old tokens removed: ember/cyan palettes, the `brut*` utility set, glass/blur utilities.

## 2. Rebuild the component layer

shadcn primitives get the kit's variants, so every screen inherits the look:

- Button: kit's full variant list (`default`, `outline`, `secondary`, `brutal`, `accent`, `warning`, `destructive`, `ghost`, `link`), heights 10/12/16, black borders + hard shadow + brutal hover.
- Card, Input, Textarea, Select, Dialog, Table, Badge, Tabs, Switch, Tooltip, Sidebar: 4px black borders, hard shadows, zero radius, uppercase mono labels.
- Chip/label treatment for metadata ("SPONSOR", "CRITIC 82", "6 AGENTS") rebuilt on the new tokens.

## 3. Rebuild the screens

- **Landing (`/`)**: remove the WebGL shader, GSAP reveal and magnetic/glass layers entirely (delete `src/components/fx/*`, drop `ogl`/`gsap`). Rebuild as brutalist slabs: rotated logo tile, oversized uppercase hero, marquee strip, bordered feature blocks in an offset grid, hatch/dot backdrop, sticky bordered header, block footer.
- **Auth (`/auth`)**: kit's split brutal card, thick borders, hard shadow, Google + email.
- **App shell + sidebar**: black-bordered rail, uppercase nav, active item as a filled magenta block.
- **Chat surface**: keeps its density and AI Elements structure; only chrome changes (bordered composer, block message rows, tool cards as bordered slabs).
- **Research project + index, Campaigns, Content, Artifacts, Brands, Settings, Sponsors admin**: retokenized to the new slab language, no layout logic changes.
- **Public report `/r/$slug`** and the sponsor card: brutalist slabs, trust surface as a bordered metric strip, sponsor unit as a black-bordered block with a magenta label bar.

## 4. Validation pass (what's real, what's next)

After the redesign, verify and report:

- Build + typecheck green; Playwright pass over `/`, `/auth`, `/app`, `/app/research`, `/app/sponsors`, `/r/$slug` with screenshots at desktop and mobile, checking for overflow, contrast, and console errors.
- Confirm the functional inventory actually works: chat streaming, research multi-agent run, share/publish flow, sponsor selection + click tracking, knowledge ingestion, team invites, MCP tools, quotas.
- Security posture re-check (RLS, grants, SSRF guard, quota enforcement) and a written "what's next" recommendation, with the citation-tracking loop (do AI engines cite your published reports) as the proposed next wedge.

## Technical notes

- `src/styles.css` rewritten: kit tokens as HSL custom properties, mapped through `@theme inline`, brutal utilities as `@utility` blocks (Tailwind v4 has no `@layer utilities`).
- Fonts via `@fontsource/unbounded` and `@fontsource/alata` imports in `__root.tsx`; no remote `@import`.
- `bun remove ogl gsap` and delete `src/components/fx/`; no other dependency changes.
- No backend, schema, or server-function changes in this pass.
