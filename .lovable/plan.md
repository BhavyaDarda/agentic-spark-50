# Platform Overhaul & Validation Plan — Marketing Agent & Research Ninja

## Phase 1: Strategic Validation & Architecture Assessment Brief
Provide a comprehensive strategic response validating all points in `superprompt.md` and the user's brief:
1. **Viability & Architecture Verdict**: Confirming the decision to overhaul Streamlit/FastAPI prototypes into a unified TanStack Start + Lovable Cloud enterprise SaaS.
2. **Competitive Gap Analysis**: Contrasting commoditized AI content generators (Jasper, Copy.ai) and $20k+/yr competitive battlecard platforms (Klue, Crayon) with our target middle ground: **Citation-backed RAG Research grounding every content piece**.
3. **Security Audit & Guardrails (OWASP LLM Top 10)**: Validating zero exposed API keys (Gateway server-side storage), RLS tenant isolation, HTML sanitization, and mandatory human confirmation before publishing actions.
4. **UI/UX Benchmarking**: Committing to "Dark Enterprise" / "Evidence Visible" aesthetic inspired by Linear, Vercel, Shadcn, and 21st.dev — avoiding generic AI purple/cream slop.

## Phase 2: Author Comprehensive `superprompt.md` in Codebase Root
Write the complete, rigorous `superprompt.md` file directly into the project root (`/superprompt.md`), ensuring it contains:
- Executive Summary and Strategic Brief.
- Detailed technical specifications for TanStack Start, Supabase RLS, `pgvector`, LangGraph/AI SDK orchestration, and LiteLLM/Gateway virtual key management.
- Explicit smart instructions for Lovable / AI coding agents (strict TypeScript, file creation batches, semantic design tokens).
- Single-surface conversational composer workflow where Research Ninja resides inside the Marketing Agent.

## Phase 3: Implement Screenshot Enterprise Operations & Billing Features
Elevate the UI and backend logic to implement the exact features shown in the user's screenshot (`Screenshot 2026-06-30 111454.png`):
1. **App Dashboard (`src/routes/app.index.tsx`)**:
   - Add the interactive Enterprise Operations action bar displaying the pills: **[Add CI build pipeline]**, **[Harden Docker production]**, **[Connect Stripe billing]**, and **[Enable monitoring and alerts]**.
   - Wire these action pills to open enterprise modal configurations and status views.
2. **Operations & Billing Surfaces (`src/routes/app.settings.tsx` & components)**:
   - **CI Build Pipeline & Docker Hardening**: Interactive status cards displaying multi-stage build checks, automated lint/typecheck/DeepEval gates, and secret scanning (gitleaks) readiness.
   - **Connect Stripe Billing**: Seamless subscription tier management (Free / Pro $29 / Team $99) showing monthly run usage counters and Stripe checkout/portal integration.
   - **Monitoring & Alerts**: Observability dashboard preview for Langfuse LLM traces, token budgets, virtual key usage, and Sentry error capture.