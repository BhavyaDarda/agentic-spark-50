# Pick up where we paused: grounding, design cleanup, proof, and the citation loop

The Knowledge (Brand Memory) surface at `/app/knowledge` and its sidebar link are in place. Brand memory is still not reachable by the agents, the signed-in screens are still half-glass, and nothing has been driven end to end. This is the rest of that work, in order.

## 1. Make brand memory actually reach the output

- Register a `search_brand_knowledge` tool in the chat orchestrator so the agent can pull the workspace's own documents mid-conversation, with the retrieved chunks shown as a citation-style tool card.
- Call the same retrieval inside the research Synthesizer step, so a research run is grounded in brand documents alongside web sources, and list them in the report's source list distinctly from web sources.
- Empty-knowledge case: the tool returns a clear "no brand documents yet" result instead of an error, and the chat nudges the user to `/app/knowledge`.

## 2. Finish the neo-brutalist pass on the signed-in product

Retokenize the remaining screens so the inside matches the landing page: zero radius, thick black borders, hard offset shadows, no blur.

- Routes: chat conversation, app home, research index + project, campaigns, artifacts, public report, root 404/error screens.
- Chat chrome: the four `ai-elements` files (message, conversation, tool, code-block).
- Fix the `/auth` layout on tall viewports (the split panels currently stretch into a dead colour field).
- Add brutalist empty states and loading skeletons to each `/app` list screen, plus per-route error boundaries.

## 3. Prove it works end to end

- Seed one real account: workspace, brand, a knowledge document, a conversation, a research run, a published report.
- Drive the whole flow in a browser: sign in, chat with streaming and a tool call, run research, publish the report, load `/r/<slug>`, click the sponsor.
- Capture desktop and mobile screenshots, confirm zero console errors, and report anything that breaks rather than papering over it.

## 4. Cleanup

- Remove the unused animation dependencies and the three dead effect components.
- Remove the orphaned workspace helpers and the leftover billing "Cost" tab and unused billing columns.

## 5. The citation loop (the wedge)

- Use the existing `report_citations` table: a scheduled public endpoint asks AI answer engines about each published report's topic and records whether the report's URL is cited.
- Show "cited by" on the public report and a citation panel in the app, so the generate → publish → measure loop is closed.

## Technical notes

- Knowledge retrieval reuses `searchKnowledge` in `src/lib/knowledge.functions.ts`; no schema change.
- Sweep endpoint goes under `src/routes/api/public/*` with a shared-secret check, called on a schedule.
- Design work is presentation-only — no logic changes in those files.
- Cleanup step removes packages; the seeded account is created by migration inserts, not on page load.
