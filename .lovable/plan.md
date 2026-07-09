# Craft pass — hybrid editorial landing, refined product

Goal: kill the generic-AI feel. Landing goes bold and editorial with a real WebGL shader backdrop and scroll-choreographed scenes. Auth and the signed-in app stay calm, dense, precise. One coherent token system across all of it, verified end-to-end with Playwright.

## Design research (before writing code)

Not a moodboard dump — a written spec I commit to before touching files.

- Study 12–15 references across Awwwards SOTD, Linear, Vercel, Anthropic console, Rauno, Emil Kowalski, Basement Studio, Reactbits, 21st.dev, uiverse, Dribbble editorial shots.
- Extract 6 concrete moves I will actually use: type scale rhythm, grid unit, motion easing curve, hover microstates, section transition, cursor treatment.
- Reject moves that don't fit an enterprise marketing-agent product (no neon skateboard vibes, no wellness-soft, no purple gradient slop).
- Deliverable: a short internal `DESIGN_SPEC.md` in `.lovable/` so every subsequent surface reads from the same source.

## Token + primitive refinement (foundation)

Locked palette (Obsidian & Signal), locked type (Space Grotesk + JetBrains Mono, add Instrument Serif for one editorial accent on landing only), Comfortable density.

- Rewrite `src/styles.css` tokens into a real scale:
  - Surfaces: `--surface-0/1/2/3` (obsidian → raised card → floating glass → overlay).
  - Strokes: `--stroke-subtle / --stroke-strong / --stroke-signal`.
  - Signal: `--signal`, `--signal-glow`, `--signal-dim`.
  - Motion: `--ease-out-expo`, `--ease-in-out-quart`, `--dur-fast/base/slow`.
  - Shadows: layered `--shadow-inset-hi / --shadow-depth-1/2/3`.
  - Type scale: fluid `clamp()` display scale for landing, fixed scale for product.
- Refine shadcn primitives (`button`, `card`, `input`, `badge`, `tabs`, `dialog`, `sheet`, `tooltip`) with new variants — no more default look. Add `button` variants: `signal` (accent), `ghost-strong`, `outline-glass`. Add `card` variants: `elevated`, `glass`, `bordered-inset`. Add `badge` `agent-status` variants per agent role.
- Add scaffolded animation utilities: `.reveal-up`, `.reveal-mask`, `.magnetic`, `.tick`, `.marquee-x`.

## Motion + shader stack

- Install `gsap` (with ScrollTrigger + SplitText via GSAP's free plugins), `ogl` (tiny WebGL, <10kb) for the shader backdrop. Keep existing `motion` for component-level animation.
- Build `src/components/fx/SignalShader.tsx`: full-viewport OGL canvas rendering a slow flow-field / caustics fragment shader in obsidian + signal cyan. Reduced-motion respects `prefers-reduced-motion`, downgrades to a static gradient. Pauses when tab hidden.
- Build `src/components/fx/ScrollScene.tsx`: GSAP + ScrollTrigger wrapper for pinned + scrubbed sections.
- Build `src/components/fx/Magnetic.tsx`, `RevealText.tsx` (SplitText line-by-line), `Marquee.tsx`, `CursorHalo.tsx` (subtle, product-off).

## Landing (`src/routes/index.tsx`) — editorial

- Hero: pinned first viewport. Shader backdrop + oversized display headline with per-line masked reveal, Instrument Serif italic accent word, live liquid-glass composer that types itself, agent status rail underneath streaming ticks.
- Trust strip: micro logos, tight tracking.
- "How the loop runs" — scroll-scrubbed diagram: 5 agent nodes (Planner → Searcher → Reader → Synthesizer → Critic) draw connecting SVG paths as you scroll, each node lights up in signal cyan at its keyframe.
- Feature bento — 6 tiles, mixed sizes, real product screenshots inside glass frames, magnetic hover.
- Agent lineup — horizontal-scrolling marquee of agent cards with role, tool access, sample trace.
- Security strip — SOC2/GDPR/SSO with a subtle scanline overlay.
- Pricing — three tiers, one "recommended" with signal-cyan border glow.
- Footer — big wordmark, lots of whitespace.
- Section transitions: masked wipes on scroll, not fades.

## Auth (`src/routes/auth.tsx`)

Split screen. Left: quiet shader panel (same shader, dimmed 40%, blurred). Right: form on `--surface-2` glass card, Google button using the Lovable broker, HIBP-aware password field state, floating labels, refined focus ring using `--signal`.

## Signed-in product (`/app` + children) — refined

Restraint over theatrics. No shader here.

- `AppSidebar`: tighter density, mono workspace label, keyboard-shortcut chips (⌘K), collapsed rail with tooltip. Agent identity mark = a generated Marketing Agent glyph (not Sparkles).
- Chat shell (`app.index.tsx`, `app.c.$conversationId.tsx`): keep AI Elements primitives (`Conversation`, `Message`, `MessageResponse`, `PromptInput`, `Shimmer`, `Tool`). Custom-skin: assistant messages transparent on canvas, user messages a filled `--surface-2` bubble with high-contrast foreground. Tool cards get per-agent iconography + collapsed-by-default accordion. `Shimmer` "Planning…", "Searching web…", "Reading sources…" states.
- Composer: `PromptInput` with `PromptInputTextarea` + `PromptInputFooter` (icon-sm submit), attachment + model chips.
- Artifact panel: right-side slide-over, tabbed (Preview / Source / Citations), copy-to-clipboard microstate.
- Brands / Research / Artifacts / Campaigns / Content / Settings: refit to the new tokens, two-column layouts with a left rail of filters. Bespoke empty-state SVGs per surface (obsidian line art with a signal accent).

## Testing (Playwright, real, not smoke)

For each surface: `/`, `/auth`, `/app`, `/app/c/<new>`, `/app/artifacts`, `/app/brands`, `/app/research`, `/app/settings`:

- Restore Supabase session from injected env for `/app/*`.
- Screenshot desktop 1440 and mobile 390.
- Assert: no console errors, no runtime warnings, `--signal` visible where expected via element screenshots, hero shader canvas mounts, GSAP ScrollTrigger fires, reduced-motion path renders static, tab-visibility pauses RAF loop.
- Save screenshots to `/tmp/browser/craft/` and review each with `code--view` before claiming done.

## SEO + a11y pass

- Per-route `head()` on landing subsections stays as-is (single page); `/auth`, `/app`, and each product child gets its own real title + meta.
- H1 per page, alt text on every image and SVG, `prefers-reduced-motion` honored on shader + GSAP scenes, focus-visible rings on every interactive, min contrast AA on both surfaces (verify with `getComputedStyle`).

## Code quality guardrails

- No new colors outside tokens. Grep gate: fail if `bg-black|text-white|#[0-9a-f]{3,6}` appears in `src/routes/` or `src/components/` outside `styles.css` and `fx/`.
- No `useEffect` + `fetch` for data — TanStack Query only.
- Shader + GSAP kept out of the product bundle via route-level dynamic import; landing pays the cost, `/app` doesn't.
- `bun run build:dev` clean, tsgo clean.

## Order of work (one pass, in this sequence)

1. Design spec + token rewrite + primitive variants.
2. FX primitives (shader, scroll scene, reveal, magnetic, marquee).
3. Landing rebuild + Playwright verify.
4. Auth rebuild + Playwright verify.
5. App shell + chat + tool cards + artifact panel + Playwright verify.
6. Remaining product routes (brands, research, artifacts, campaigns, content, settings) + Playwright verify.
7. Final full-site Playwright sweep, contrast + reduced-motion audit, SEO pass.

## Technical notes

- Tailwind v4: tokens in `@theme inline`, custom utilities via `@utility`, no `tailwind.config.js`.
- Fonts via `@fontsource-variable/*` package imports only (no remote `@import`).
- OGL and GSAP are client-only — import inside `useEffect` or a `.client.tsx` module so SSR doesn't touch `window`.
- Server functions unchanged; this is a UI/presentation pass.
- Auth-gated routes keep the managed `_authenticated`/`app.tsx` gate.

## Deliverable

Landing that stops the scroll, auth that feels crafted, a signed-in product that feels like Linear-meets-Anthropic — all on one Obsidian & Signal system, verified surface by surface with Playwright.
