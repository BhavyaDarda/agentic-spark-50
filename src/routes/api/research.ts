// Multi-agent Research Ninja endpoint.
// POST /api/research with { projectId } -> SSE stream of step events.
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { generateText, tool, stepCountIs } from "ai";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { createLovableAiGatewayProvider, getLovableApiKey, embed } from "@/lib/ai-gateway.server";

type StepEvent =
  | { type: "step"; agent: string; action?: string; thought?: string; result?: unknown }
  | { type: "source"; url: string; title?: string; snippet?: string }
  | { type: "done"; report: string; summary: string }
  | { type: "error"; message: string };

function sse(event: StepEvent) {
  return `data: ${JSON.stringify(event)}\n\n`;
}

// ---- Web search via DuckDuckGo HTML (no API key) ----
async function webSearch(query: string, limit = 8) {
  try {
    const res = await fetch(
      `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
      { headers: { "User-Agent": "Mozilla/5.0 (compatible; MarketingAgentResearch/1.0)" } },
    );
    const html = await res.text();
    const results: { url: string; title: string; snippet: string }[] = [];
    const re =
      /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) && results.length < limit) {
      let url = m[1];
      // DDG wraps with /l/?uddg=...
      try {
        const u = new URL(url, "https://duckduckgo.com");
        const uddg = u.searchParams.get("uddg");
        if (uddg) url = decodeURIComponent(uddg);
      } catch {
        /* ignore */
      }
      const title = m[2].replace(/<[^>]+>/g, "").trim();
      const snippet = m[3].replace(/<[^>]+>/g, "").trim();
      if (url.startsWith("http")) results.push({ url, title, snippet });
    }
    return results;
  } catch (e) {
    return [];
  }
}

async function fetchPage(url: string, maxChars = 12000) {
  try {
    const { safeFetch } = await import("@/lib/ssrf.server");
    const res = await safeFetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; MarketingAgentResearch/1.0)" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return { ok: false as const, text: "", title: "" };

    const html = await res.text();
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const title = titleMatch?.[1]?.trim() ?? "";
    // strip scripts/styles/tags
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, maxChars);
    return { ok: true as const, text, title };
  } catch {
    return { ok: false as const, text: "", title: "" };
  }
}

export const Route = createFileRoute("/api/research")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authHeader = request.headers.get("authorization") ?? "";
        const token = authHeader.replace(/^Bearer\s+/i, "");
        if (!token) return new Response("Unauthorized", { status: 401 });

        const body = (await request.json().catch(() => ({}))) as { projectId?: string };
        const projectId = body.projectId;
        if (!projectId) return new Response("projectId required", { status: 400 });

        const SUPABASE_URL = process.env.SUPABASE_URL!;
        const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY!;
        const sb = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
          global: { headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_PUBLISHABLE_KEY } },
          auth: { persistSession: false, autoRefreshToken: false },
        });

        const { data: user } = await sb.auth.getUser(token);
        if (!user?.user) return new Response("Unauthorized", { status: 401 });
        void user.user.id;

        const { data: project, error: projErr } = await sb
          .from("research_projects")
          .select("*")
          .eq("id", projectId)
          .maybeSingle();
        if (projErr || !project) return new Response("Project not found", { status: 404 });

        // Enforce plan quota + per-workspace sliding-window limit before spending
        // any AI/gateway budget on the multi-agent pipeline.
        const { consumeRateLimit } = await import("@/lib/security.server");
        const { assertQuota, QuotaError } = await import("@/lib/limits.server");
        try {
          await assertQuota(project.workspace_id, "researchRuns");
        } catch (e) {
          if (e instanceof QuotaError) return new Response(e.message, { status: 402 });
          throw e;
        }
        const rl = await consumeRateLimit(project.workspace_id, "chat.deep_research");
        if (!rl.ok) {
          return new Response("Too many research runs. Try again shortly.", {
            status: 429,
            headers: { "Retry-After": String(rl.retryAfterSeconds) },
          });
        }

        // Create run

        const { data: run, error: runErr } = await sb
          .from("research_runs")
          .insert({
            project_id: project.id,
            workspace_id: project.workspace_id,
            status: "running",
            model: "google/gemini-3-flash-preview",
            started_at: new Date().toISOString(),
          })
          .select()
          .single();
        if (runErr || !run) return new Response(runErr?.message ?? "Run create failed", { status: 500 });

        const encoder = new TextEncoder();
        let stepIndex = 0;
        const collectedSources: { url: string; title: string; snippet: string }[] = [];

        const stream = new ReadableStream({
          async start(controller) {
            const writeStep = async (ev: StepEvent) => {
              try {
                controller.enqueue(encoder.encode(sse(ev)));
              } catch {
                /* client disconnected */
              }
              if (ev.type === "step") {
                stepIndex++;
                await sb.from("research_steps").insert({
                  run_id: run.id,
                  workspace_id: project.workspace_id,
                  step_index: stepIndex,
                  agent: ev.agent,
                  action: ev.action ?? null,
                  thought: ev.thought ?? null,
                  result: (ev.result as never) ?? null,
                });
              } else if (ev.type === "source") {
                await sb.from("research_sources").insert({
                  run_id: run.id,
                  workspace_id: project.workspace_id,
                  url: ev.url,
                  title: ev.title ?? null,
                  snippet: ev.snippet ?? null,
                });
              }
            };

            try {
              const gateway = createLovableAiGatewayProvider(getLovableApiKey());
              const model = gateway("google/gemini-3-flash-preview");

              await writeStep({
                type: "step",
                agent: "Orchestrator",
                action: "kickoff",
                thought: `Researching: ${project.topic}`,
              });

              // ====== PLANNER ======
              const planner = await generateText({
                model,
                system:
                  "You are the Planner. Output a JSON array of 4-7 focused web search queries to investigate the topic comprehensively. Reply with ONLY a JSON array of strings.",
                prompt: `Topic: ${project.topic}\nGoal: ${project.goal ?? "Comprehensive deep-dive"}\nDepth: ${project.depth}`,
              });
              let queries: string[] = [];
              try {
                queries = JSON.parse(planner.text.match(/\[[\s\S]*\]/)?.[0] ?? "[]");
              } catch {
                queries = [project.topic];
              }
              queries = queries.slice(0, project.depth === "deep" ? 7 : project.depth === "quick" ? 3 : 5);

              await writeStep({
                type: "step",
                agent: "Planner",
                action: "decompose",
                thought: `Generated ${queries.length} search queries`,
                result: { queries },
              });

              // ====== SEARCHER + READER ======
              const docs: { url: string; title: string; text: string; query: string }[] = [];
              for (const q of queries) {
                await writeStep({
                  type: "step",
                  agent: "Searcher",
                  action: "web_search",
                  thought: q,
                });
                const results = await webSearch(q, 4);
                for (const r of results) {
                  if (collectedSources.find((s) => s.url === r.url)) continue;
                  collectedSources.push(r);
                  await writeStep({ type: "source", url: r.url, title: r.title, snippet: r.snippet });
                }

                // Fetch top 2 per query
                for (const r of results.slice(0, 2)) {
                  await writeStep({
                    type: "step",
                    agent: "Reader",
                    action: "fetch_page",
                    thought: r.url,
                  });
                  const page = await fetchPage(r.url);
                  if (page.ok && page.text.length > 200) {
                    docs.push({ url: r.url, title: page.title || r.title, text: page.text, query: q });

                    // Embed and store
                    try {
                      const vec = await embed(page.text.slice(0, 6000));
                      await sb.from("documents").insert({
                        workspace_id: project.workspace_id,
                        source_type: "web",
                        source_url: r.url,
                        title: page.title || r.title,
                        content: page.text.slice(0, 6000),
                        embedding: vec as unknown as string,
                        metadata: { run_id: run.id, query: q },
                      });
                    } catch {
                      /* embedding failure non-fatal */
                    }
                  }
                }
              }

              // ====== SYNTHESIZER ======
              await writeStep({
                type: "step",
                agent: "Synthesizer",
                action: "compose",
                thought: `Synthesizing from ${docs.length} sources`,
              });

              const corpus = docs
                .map(
                  (d, i) =>
                    `### Source [${i + 1}] ${d.title}\nURL: ${d.url}\n\n${d.text.slice(0, 3000)}`,
                )
                .join("\n\n---\n\n");

              const report = await generateText({
                model,
                system:
                  "You are the Synthesizer. Write a thorough, well-structured research report in Markdown. Use clear sections (Executive Summary, Key Findings, Detailed Analysis, Implications, Recommendations, References). Cite sources inline as [1], [2], etc., matching the provided source numbering. End with a numbered References list with URLs.",
                prompt: `Topic: ${project.topic}\nGoal: ${project.goal ?? ""}\n\n### Sources\n${corpus || "(no sources retrieved — answer from general knowledge and flag uncertainty)"}`,
              });

              // ====== CRITIC ======
              await writeStep({
                type: "step",
                agent: "Critic",
                action: "review",
                thought: "Scoring report for completeness & accuracy",
              });

              const critic = await generateText({
                model,
                system:
                  "You are the Critic. In 2-3 sentences, summarize the strengths and any gaps of the report. Then on a new line write SCORE: <0-100>.",
                prompt: report.text.slice(0, 6000),
              });

              // ====== WRITER (executive summary) ======
              const summary = await generateText({
                model,
                system:
                  "Distill the report into a 3-sentence executive summary suitable for a busy executive.",
                prompt: report.text.slice(0, 8000),
              });

              await sb
                .from("research_runs")
                .update({
                  status: "succeeded",
                  report_markdown: report.text,
                  summary: summary.text,
                  completed_at: new Date().toISOString(),
                  plan: { queries, critic: critic.text },
                })
                .eq("id", run.id);

              // Increment usage
              const periodMonth = new Date();
              periodMonth.setUTCDate(1);
              periodMonth.setUTCHours(0, 0, 0, 0);
              const periodIso = periodMonth.toISOString().slice(0, 10);
              const { data: usage } = await sb
                .from("usage_counters")
                .select("research_runs")
                .eq("workspace_id", project.workspace_id)
                .eq("period_month", periodIso)
                .maybeSingle();
              await sb.from("usage_counters").upsert(
                {
                  workspace_id: project.workspace_id,
                  period_month: periodIso,
                  research_runs: (usage?.research_runs ?? 0) + 1,
                },
                { onConflict: "workspace_id,period_month" },
              );

              await writeStep({ type: "done", report: report.text, summary: summary.text });
              controller.close();
            } catch (e) {
              const message = e instanceof Error ? e.message : String(e);
              await sb
                .from("research_runs")
                .update({ status: "failed", error: message, completed_at: new Date().toISOString() })
                .eq("id", run.id);
              try {
                controller.enqueue(encoder.encode(sse({ type: "error", message })));
              } catch {
                /* */
              }
              controller.close();
            }
          },
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
          },
        });
      },
    },
  },
});

// Suppress unused warnings for imports we may need later when wiring AI SDK tools.
void tool;
void stepCountIs;
void z;

