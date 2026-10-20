# Finish native features first, then app connections

## Phase 1 — Native capabilities (built into REACHER AI)
1. **Logo upload** — replace the "paste a link" logo field in Settings with a real file upload (PNG/JPG/SVG, max 1 MB), stored privately per workspace and shown on PDFs and public reports.
2. **Account actions check** — test in the browser: change password, sign out everywhere, export my data, delete account (on a throwaway test account only). Fix anything broken.
3. **Research report sending** — run one real research project in your account, then send it to a Webhook.site test address and confirm it arrives. Delete the test address after.
4. **Final sweep** — security scan, safety tests, and a quick look at the home, chat, research, campaigns, content, settings and public report pages on desktop and mobile.

## Phase 2 — Connections to other apps
5. **App connections in Settings** — a "Connections" tab where each person can link their own external tools. Starts with services the platform supports per-person (Notion first). Each person signs in to their own account; nothing is shared.
6. **Send to Notion** — once a Notion connection client exists, add "Send to Notion" next to "Send output". Needs a workspace admin to set up the Notion client once (I'll open the setup card for you).
7. **Assistant tools from connected services** — let the research assistant use tools from services a person has connected (via MCP), with a clear list of what's connected and a confirmation before any action that changes something outside the app.

Still on hold: email summaries (your call), legal name/address/jurisdiction (waiting on you).

## Technical details
- Logo: private storage bucket with per-workspace folder RLS; signed URLs for public report rendering.
- Notion: App User Connector, keys encrypted (AES-GCM) in a service-role-only table, keyed by user + connector.
- MCP: extend the existing Settings connection registry; per-user credentials, read-only tools enabled by default, write tools require confirmation.
- Each step browser-verified with your real account before it's marked done.
