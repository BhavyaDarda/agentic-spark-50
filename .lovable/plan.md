# Marketing Agent — finish to a working end-to-end product

Goal: every route real, every button wired, no stubs, no placeholder copy. Multi-user workspaces with invites and roles, plan limits enforced server-side (no payment processor), and agent tool access that includes each user's own MCP servers. Verified surface by surface with Playwright.

## What exists today (verified)

Working: schema (workspaces, members, invites, brands, campaigns, conversations, messages, artifacts, research projects/runs/steps/sources, documents + `match_documents`, usage_counters, rate_limits, audit_log, user_roles, roles/membership SQL helpers), auth gate on `/app`, chat streaming route with the multi-agent loop, research SSE route, brand CRUD, content generation, conversation CRUD, landing + auth visual pass.

Gaps to close:
- Campaigns page is a placeholder card pointing users elsewhere.
- Settings has no members/invites, no usage view, no MCP section; billing section is prose only.
- No invite accept flow, no role management, no server functions for campaigns.
- Documents table exists but nothing ingests or retrieves brand knowledge.
- No plan-limit enforcement surfaced in the UI (quota errors are invisible).
- No MCP connections at all.
- No tests.

## 1. Campaigns — make it first-class

- `src/lib/campaigns.functions.ts`: list, get, create, update, archive, delete; all through `requireSupabaseAuth`, workspace-scoped.
- Campaign generation reuses the content pipeline but writes a real `campaigns` row: objective, audience, channel mix, calendar (date/channel/asset rows), KPIs, budget split.
- `app.campaigns.tsx` becomes a two-pane surface: campaign list rail + detail with editable brief, calendar table, KPI cards, and "generate assets" that creates linked `content_runs` and artifacts.
- Migration only if a column is genuinely missing (verify `campaigns` columns first; add `calendar jsonb`, `kpis jsonb`, `status` only if absent, with GRANTs untouched since the table already exists).

## 2. Team: invites + roles

- `src/lib/team.functions.ts`: `listMembers`, `inviteMember` (email + role, writes `workspace_invites` with a token), `revokeInvite`, `changeRole`, `removeMember`, `acceptInvite`.
- Authorization: only owner/admin may invite or change roles; enforced with the existing `workspace_role_of` helper server-side, and mirrored in RLS policies for `workspace_invites`/`workspace_members` (add owner/admin policies if missing).
- New public route `src/routes/invite.$token.tsx`: shows workspace name, requires sign-in, then accepts the invite and lands on `/app`.
- Settings gets a **Members** tab: member table with role selects, pending invites with revoke, invite form. Last-owner protection.

## 3. Plans and quotas (no payments)

- `src/lib/limits.server.ts`: single source of truth for plan → limits (content runs/month, research runs/month, MCP servers, seats, brands). Every generating server fn increments `usage_counters` and rejects over-quota with a typed error.
- Settings **Usage** tab: progress bars per meter, reset date, plan badge, "Contact us to upgrade" — no fake Stripe buttons.
- Chat/content/research UIs catch the quota error and render an inline limit notice instead of a generic toast.

## 4. Brand knowledge (RAG) — connect what's already there

- `src/lib/knowledge.functions.ts`: paste-text or URL ingestion → chunk → embed via the AI Gateway → insert into `documents` with brand + workspace scope; plus `listDocuments`, `deleteDocument`.
- Retrieval tool inside the chat agent loop calls `match_documents` scoped to the active brand and returns cited chunks; citations already render in the chat.
- Brand detail page gains a **Knowledge** panel: sources list, add source, delete, per-source chunk count.

## 5. Per-user MCP servers

- `bun add @ai-sdk/mcp`.
- Migration: `mcp_connections` (id, workspace_id, user_id, name, url, transport, state, auth_url, oauth material, timestamps) with GRANTs, RLS scoped to the owning user, `service_role` full.
- `src/lib/mcp.functions.ts`: `listConnections`, `createConnection` (validate https, probe with `client.tools()`, persist `ready` or `authenticating` + `authUrl`, close probe client), `disconnect`, `retry`. OAuth callback as a server route under `src/routes/api/public/mcp/callback.ts` plus `/.well-known/oauth-client` metadata.
- Chat route loads the caller's `ready` connections, namespaces their tools, merges with built-in tools (web search, page read, brand knowledge, artifact write), and closes every client after the stream finishes and on error.
- Settings **Integrations** tab: connection list with state badges, add-server form, authorize button when `authUrl` is pending, disconnect. Defensive UI — array state, 401 handled, never `.map` on undefined.

## 6. Chat + artifacts completion

- Artifact panel: real tabs (Preview / Source / Citations), copy, download, rename, delete, and "save to library" wired to `artifacts`.
- Conversation surface: stop/regenerate, retry on error, model + brand selectors persisted per conversation, tool cards collapsed by default with per-agent icons.
- Sidebar: search, pin, rename, archive, delete all wired (verify each mutation actually invalidates its query).

## 7. Security pass

- Every server fn: `requireSupabaseAuth`, Zod input validation, workspace membership check before any row touch, audit_log write for mutations.
- Rate limiting on generation endpoints via the existing `rate_limits` table.
- No secret ever crosses to the client; MCP tokens never enter model context or UI.
- Run the security scanner and the Supabase linter at the end; fix findings.

## 8. Copy pass — no AI slop

Rewrite every user-facing string: no "unleash", "supercharge", "harness the power", no em-dash-laden marketing filler, no "coming soon" cards. Concrete, specific, product-voice. Empty states describe the next action, not the feature category.

## 9. Verification (Playwright, real)

Authenticated sweep with the injected session across `/`, `/auth`, `/invite/<token>`, `/app`, `/app/c/<id>`, `/app/brands`, `/app/campaigns`, `/app/research`, `/app/artifacts`, `/app/content`, `/app/settings` (all tabs):

- Exercise flows, not just renders: create brand → ingest a knowledge source → start a chat → verify streamed answer with a citation → save artifact → create campaign → generate assets → invite a member → add an MCP server (non-auth test server) → confirm its tool appears.
- Assert zero console errors, desktop 1440 + mobile 390 screenshots, review each capture before claiming done.
- `bun run build:dev` and `tsgo` clean; `bun run lint` clean.

## Technical notes

- All app-internal logic stays in `createServerFn` (`src/lib/*.functions.ts`); only MCP OAuth callback and existing webhooks are server routes.
- Loaders on `/app/*` are safe (gated layout); public routes never call protected fns.
- New tables get GRANTs in the same migration as `CREATE TABLE`, then RLS, then policies.
- Roles stay in `user_roles` / `workspace_members`, never on profiles.
- No new colors outside `src/styles.css` tokens.

## Order of work

1. Limits + security helpers (foundation everything else calls).
2. Team invites/roles + invite route + Settings Members.
3. Campaigns backend + page.
4. Brand knowledge ingestion + retrieval tool.
5. MCP connections (migration, server fns, OAuth route, Settings Integrations, chat tool merge).
6. Chat/artifact completion + sidebar wiring.
7. Copy pass, security scan, full Playwright sweep.
