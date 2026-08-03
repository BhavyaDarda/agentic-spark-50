# Marketing Agent — current state & next-phase plan

## What is fully functional and working today

| Surface | Status | Notes |
|---------|--------|-------|
| Auth (email/password + Google OAuth) | Working | `/auth` with split-screen SignalShader backdrop; Supabase auth wired. |
| Workspace isolation + RLS | Working | Multi-tenant schema; policies enforce workspace/member boundaries. |
| Landing page (`/`) | Working | SignalShader hero, RevealText headline, LiveComposer agent trace, Loop scroll diagram, Bento, Pricing, CTA. |
| App shell (`/app`) | Working | Sidebar, sticky header, workspace/plan badges, sign-out. |
| Chat (`/app/c/$id`) | Working | SSE streaming, web_search / fetch_page / save_artifact tools, citations, artifact buttons, brand/model selectors. |
| Artifact Library (`/app/artifacts`) | Working | Search + kind filter; links back to conversation. |
| Brands (`/app/brands`) | Working | Full CRUD with voice/audience/tone/goals. |
| Content Studio (`/app/content`) | Working | 8 content kinds, brief form, run history, copy/rate actions; quota enforced. |
| Campaigns (`/app/campaigns`) | Working | Create brief → AI strategy (positioning, channel mix, KPIs, risks) → week-by-week calendar → per-row asset generation. |
| Research Ninja (`/app/research`) | Working | Project list, multi-agent streaming (Planner/Searcher/Reader/Synthesizer/Critic/Writer), cited report, run history, public-share toggle backend. |
| Security infra | Working | Rate limits, audit logs, server-side API keys (no client exposure), RLS. |
| Usage quotas | Working | `limits.server.ts` with Free/Pro/Team caps; enforced in content, campaigns, and research. |
| Team backend | Working | `team.functions.ts` covers list/invite/revoke/change-role/remove/accept with capacity checks and audit logs. |
| Database schema for MCP | Created | `mcp_connections` table + RLS + security definer helpers exist. |

## What is missing or only partially wired

| Gap | Why it matters |
|-----|----------------|
| **Team UI in Settings** | Backend exists, but `/app/settings` only shows workspace rename + billing placeholder. Members cannot invite, accept, or manage roles from the UI. |
| **Invite acceptance route** | `src/routes/invite.$token.tsx` does not exist. Invitation links have nowhere to land. |
| **MCP integration** | Table exists, but no functions, routes, or UI to add/connect tool servers. The chat orchestrator cannot load MCP tools yet. |
| **Brand knowledge / RAG UI** | `knowledge.functions.ts` can ingest URLs/pasted text and search vectors, but there is no UI to add or inspect brand knowledge. |
| **Research public share route** | `toggleSharing` exists, but `/r/$slug` route to render a shared report is missing. |
| **Sidebar navigation gaps** | Campaigns, Research, Content are not linked from the sidebar; users must use direct URLs. |
| **Build/typecheck verification** | Last green build was reported, but the recent large additions (campaigns, team, knowledge) need a fresh typecheck + build pass. |
| **UI craft consistency** | The product surfaces still use generic card/form patterns. The Obsidian & Signal landing craft has not been carried into the signed-in app. |

## Proposed next execution phases

### Phase 1 — Team & invites (foundation for multi-user SaaS)
- Add Members and Usage tabs to `/app/settings`.
- Implement invite creation, revoke, role changes, member removal UI.
- Create `/invite/$token` route for accepting invitations.
- Add email copy helper for invite links.
- Verify workspace capacity limits block over-inviting.

### Phase 2 — MCP agent integrations
- Create `src/lib/mcp.functions.ts` with: list, connect, disconnect, OAuth callback handling.
- Add server route `/api/mcp/callback` for OAuth completion.
- Wire MCP tool loading into `/api/chat` so ready connections expose their tools to the model.
- Add Integrations tab in Settings to add/remove MCP servers and view tool counts.
- Validate HTTPS-only URLs in production; keep tokens server-side.

### Phase 3 — Brand knowledge (RAG) UI
- Add Knowledge tab to `/app/brands/$brandId` or a dedicated `/app/knowledge` route.
- UI to paste text or import a URL; list ingested sources with chunk counts.
- Surface `searchKnowledge` in chat as a tool (`search_brand_knowledge`) so the agent can ground answers in uploaded docs.

### Phase 4 — Research public sharing & navigation
- Create `/r/$slug` public route for shared research reports.
- Add Campaigns, Research, Content links to the app sidebar.
- Add workspace switcher if a user belongs to multiple workspaces.

### Phase 5 — Product UI craft pass
- Apply Obsidian & Signal tokens, glass surfaces, and motion consistently across `/app` routes.
- Replace generic empty states with on-brand illustrations/microcopy.
- Add loading skeletons, error boundaries, and refined tool/artifact cards in chat.
- Ensure reduced-motion and accessibility are respected everywhere.

### Phase 6 — Verification & hardening
- Run full TypeScript typecheck and production build.
- Run Playwright smoke tests for auth, chat, campaigns, research, and invite flow.
- Review all RLS policies and security definer functions for search-path correctness.
- Confirm no API keys, tokens, or secrets leak to the browser bundle.

## Decision needed

Which phase should start first?

1. **Team first** — finish multi-user SaaS plumbing (invites, roles, usage UI).
2. **MCP first** — make the agent extensible with external tool servers.
3. **Knowledge first** — ground the agent in uploaded brand/docs context.
4. **Run all in order** — phases 1 through 6 as one continuous pass.

Recommended: **Option 4 (all in order)**. Team and MCP are the two largest remaining gaps between "demo" and "deployable SaaS"; doing them first unlocks the rest.
