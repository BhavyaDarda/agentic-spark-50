// Multi-agent Research Ninja endpoint.
// POST /api/research with { projectId } -> SSE stream of step events.
//
// Pipeline (every step is persisted to `research_steps` so the trace is
// auditable after the fact):
//   Orchestrator -> Planner -> Searcher (live web search) -> Reader (SSRF-safe
//   page fetch) -> Brand memory (workspace vectors) -> Synthesizer -> Critic.
//
// Honesty rules:
//   * Every source in the report came back from a real search executed during
//     this run. If live search is unavailable the run fails loudly instead of
//     producing a report "from memory".
//   * Token usage and wall-clock duration are the real numbers the gateway
//     reported; they are stored on the run and shown on the public report.
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { streamText, Output } from "ai";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import {
  CHAT_MODEL,
  createLovableResponsesProvider,
  getLovableApiKey,
  embed,
  responsesOptions,
  type ReasoningEffort,
} from "@/lib/ai-gateway.server";
import { webSearch, readPage, type SearchResult } from "@/lib/web-search.server";

type StepEvent =
  | { type: "step"; agent: string; action?: string; thought?: string; result?: unknown }
  | { type: "source"; url: string; title?: string; snippet?: string }
  | { type: "done"; report: string; summary: string }
  | { type: "error"; message: string };

function sse(event: StepEvent) {
  return `data: ${JSON.stringify(event)}\n\n`;
}

const DEPTH = {
  quick: { queries: 3, resultsPerQuery: 4, readPerQuery: 2, searchDepth: "basic", effort: "low" },
  standard: { queries: 5, resultsPerQuery: 5, readPerQuery: 2, searchDepth: "basic", effort: "medium" },
  deep: { queries: 7, resultsPerQuery: 6, readPerQuery: 3, searchDepth: "advanced", effort: "high" },
} as const satisfies Record<
  string,
  {
    queries: number;
    resultsPerQuery: number;
    readPerQuery: number;
    searchDepth: "basic" | "advanced";
    effort: ReasoningEffort;
  }
>;

type DepthKey = keyof typeof DEPTH;

function depthConfig(depth: string) {
  return DEPTH[(depth in DEPTH ? depth : "standard") as DepthKey];
}

const PlanSchema = z.object({
  queries: z.array(z.string().min(3).max(200)).min(2).max(8),
});

const ReviewSchema = z.object({
  summary: z.string(),
  critique: z.string(),
  score: z.number().int().min(0).max(100),
});

export const Route = createFileRoute("/api/research")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authHeader = request.headers.get("authorization") ?? "";
        const token = authHeader.replace(/^Bearer\s+/i, "");
        if (!token) return new Response("Unauthorized", { status: 401 });

        const body = (await request.json().catch(() => ({}))) as { projectId?: string };
        const projectId = body.projectId;
        if (!projectId || !z.string().uuid().safeParse(projectId).success) {
          return new Response("projectId required", { status: 400 });
        }

        const SUPABASE_URL = process.env.SUPABASE_URL!;
        const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY!;
        const sb = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
          global: { headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_PUBLISHABLE_KEY } },
          auth: { persistSession: false, autoRefreshToken: false },
        });

        const { data: user } = await sb.auth.getUser(token);
        const userId = user?.user?.id;
        if (!userId) return new Response("Unauthorized", { status: 401 });

        const { data: project, error: projErr } = await sb
          .from("research_projects")
          .select("id, workspace_id, topic, goal, depth")
          .eq("id", projectId)
          .maybeSingle();
        if (projErr || !project) return new Response("Project not found", { status: 404 });

        // One run at a time per project — a second click must not double-spend.
        const { data: inflight } = await sb
          .from("research_runs")
          .select("id")
          .eq("project_id", project.id)
          .in("status", ["queued", "running"])
          .gte("created_at", new Date(Date.now() - 15 * 60_000).toISOString())
          .limit(1);
        if (inflight && inflight.length > 0) {
          return new Response("A run is already in progress for this project.", { status: 409 });
        }

        // Enforce plan quota + per-workspace sliding-window limit before spending
        // any AI/gateway budget on the multi-agent pipeline.
        const { consumeRateLimit, auditLog, clientIp } = await import("@/lib/security.server");
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

        const cfg = depthConfig(project.depth);
        const startedAt = new Date();

        const { data: run, error: runErr } = await sb
          .from("research_runs")
          .insert({
            project_id: project.id,
            workspace_id: project.workspace_id,
            status: "running",
            model: CHAT_MODEL,
            started_at: startedAt.toISOString(),
          })
          .select()
          .single();
        if (runErr || !run) {
          return new Response(runErr?.message ?? "Run create failed", { status: 500 });
        }

        const encoder = new TextEncoder();
        let stepIndex = 0;
        const collectedSources = new Map<string, SearchResult>();
        const tokens = { input: 0, output: 0 };

        const stream = new ReadableStream({
          async start(controller) {
            const writeStep = async (ev: StepEvent) => {
              try {
                controller.enqueue(encoder.encode(sse(ev)));
              } catch {
                /* client disconnected; keep persisting so the run stays auditable */
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

            const fail = async (message: string) => {
              await sb
                .from("research_runs")
                .update({
                  status: "failed",
                  error: message,
                  completed_at: new Date().toISOString(),
                  tokens_input: tokens.input || null,
                  tokens_output: tokens.output || null,
                })
                .eq("id", run.id);
              try {
                controller.enqueue(encoder.encode(sse({ type: "error", message })));
              } catch {
                /* */
              }
              controller.close();
            };

            try {
              const provider = createLovableResponsesProvider(getLovableApiKey());
              const model = provider.model();
              const track = (u: { inputTokens?: number; outputTokens?: number } | undefined) => {
                tokens.input += u?.inputTokens ?? 0;
                tokens.output += u?.outputTokens ?? 0;
              };

              await writeStep({
                type: "step",
                agent: "Orchestrator",
                action: "kickoff",
                thought: `Researching: ${project.topic}`,
                result: { depth: project.depth, model: CHAT_MODEL },
              });

              // ====== PLANNER ======
              const planner = streamText({
                model,
                system: [
                  "You are the Planner of a research team.",
                  `Produce ${cfg.queries} focused web search queries that together cover the topic from different angles: market size and trends, competitors, customer language, risks, and recent news.`,
                  "Each query is a short search-engine phrase, not a sentence. No duplicates.",
                ].join(" "),
                prompt: `Topic: ${project.topic}\nGoal: ${project.goal ?? "Comprehensive deep-dive"}\nDepth: ${project.depth}`,
                output: Output.object({ schema: PlanSchema }),
                providerOptions: responsesOptions("low"),
              });
              const plan = await planner.output;
              track(await planner.usage);
              const queries = [...new Set(plan.queries.map((q) => q.trim()))]
                .filter(Boolean)
                .slice(0, cfg.queries);
              if (queries.length === 0) queries.push(project.topic);

              await writeStep({
                type: "step",
                agent: "Planner",
                action: "decompose",
                thought: `Generated ${queries.length} search queries`,
                result: { queries },
              });

              // ====== SEARCHER + READER ======
              const docs: { url: string; title: string; text: string; query: string }[] = [];
              let searchFailures = 0;
              let providerUsed: string | null = null;

              for (const q of queries) {
                await writeStep({ type: "step", agent: "Searcher", action: "web_search", thought: q });
                const outcome = await webSearch(q, {
                  max: cfg.resultsPerQuery,
                  depth: cfg.searchDepth,
                });
                if (!outcome.ok) {
                  searchFailures++;
                  await writeStep({
                    type: "step",
                    agent: "Searcher",
                    action: "web_search_failed",
                    thought: `Live search failed for "${q}" (${outcome.error})`,
                    result: { query: q, error: outcome.error },
                  });
                  continue;
                }
                providerUsed = outcome.provider;
                const fresh: SearchResult[] = [];
                for (const r of outcome.results) {
                  if (collectedSources.has(r.url)) continue;
                  collectedSources.set(r.url, r);
                  fresh.push(r);
                  await writeStep({ type: "source", url: r.url, title: r.title, snippet: r.snippet });
                }
                await writeStep({
                  type: "step",
                  agent: "Searcher",
                  action: "web_search_result",
                  thought: `${outcome.results.length} results (${fresh.length} new) via ${outcome.provider}`,
                  result: { query: q, provider: outcome.provider, count: outcome.results.length },
                });

                // Read the top pages in parallel; each fetch is SSRF-guarded and time-boxed.
                const toRead = outcome.results.slice(0, cfg.readPerQuery);
                for (const r of toRead) {
                  await writeStep({ type: "step", agent: "Reader", action: "fetch_page", thought: r.url });
                }
                const pages = await Promise.all(toRead.map((r) => readPage(r.url)));
                const embedJobs: Promise<unknown>[] = [];
                pages.forEach((page, i) => {
                  const r = toRead[i]!;
                  if (!page.ok || page.text.length < 200) {
                    void writeStep({
                      type: "step",
                      agent: "Reader",
                      action: "fetch_skipped",
                      thought: `${r.url} — unreadable or blocked`,
                    });
                    return;
                  }
                  if (docs.some((d) => d.url === r.url)) return;
                  docs.push({ url: r.url, title: page.title || r.title, text: page.text, query: q });
                  embedJobs.push(
                    embed(page.text.slice(0, 6000))
                      .then((vec) =>
                        sb.from("documents").insert({
                          workspace_id: project.workspace_id,
                          source_type: "web",
                          source_url: r.url,
                          title: page.title || r.title,
                          content: page.text.slice(0, 6000),
                          embedding: vec as unknown as string,
                          metadata: { run_id: run.id, query: q, project_id: project.id },
                        }),
                      )
                      .catch(() => undefined),
                  );
                });
                await Promise.allSettled(embedJobs);
              }

              if (docs.length === 0 && collectedSources.size === 0) {
                await fail(
                  searchFailures === queries.length
                    ? "Live web search is unavailable right now, so this run was stopped rather than writing an unsourced report. Try again in a few minutes."
                    : "No readable sources were found for this topic. Try a more specific topic or goal.",
                );
                return;
              }

              // ====== BRAND MEMORY (grounding in the workspace's own documents) ======
              const brandPassages: { title: string; sourceUrl: string | null; text: string }[] = [];
              try {
                await writeStep({
                  type: "step",
                  agent: "Brand memory",
                  action: "vector_search",
                  thought: `Retrieving workspace knowledge for: ${project.topic}`,
                });
                const qvec = await embed(`${project.topic}\n${project.goal ?? ""}`);
                const { data: hits } = await sb.rpc("match_documents", {
                  _workspace_id: project.workspace_id,
                  query_embedding: qvec as unknown as string,
                  match_count: 6,
                });
                const webUrls = new Set(docs.map((d) => d.url));
                for (const h of hits ?? []) {
                  // Pages this very run just embedded are web sources, not brand memory.
                  if (h.source_url && webUrls.has(h.source_url)) continue;
                  if ((h.similarity ?? 0) < 0.35) continue;
                  brandPassages.push({
                    title: h.title ?? "Brand document",
                    sourceUrl: h.source_url ?? null,
                    text: (h.content ?? "").slice(0, 1800),
                  });
                }
                await writeStep({
                  type: "step",
                  agent: "Brand memory",
                  action: "result",
                  thought: brandPassages.length
                    ? `${brandPassages.length} internal passages grounded the report`
                    : "No matching brand documents in this workspace",
                  result: { count: brandPassages.length },
                });
              } catch {
                /* brand memory is best-effort; the run continues on web sources */
              }

              // ====== SYNTHESIZER ======
              await writeStep({
                type: "step",
                agent: "Synthesizer",
                action: "compose",
                thought: `Synthesizing from ${docs.length} read pages, ${collectedSources.size} sources and ${brandPassages.length} brand documents`,
              });

              const numbered = [...collectedSources.values()];
              const indexOf = new Map(numbered.map((s, i) => [s.url, i + 1]));
              const corpus = docs
                .map(
                  (d) =>
                    `### Source [${indexOf.get(d.url)}] ${d.title}\nURL: ${d.url}\n\n${d.text.slice(0, 3200)}`,
                )
                .join("\n\n---\n\n");
              const snippetOnly = numbered
                .filter((s) => !docs.some((d) => d.url === s.url))
                .map(
                  (s) =>
                    `[${indexOf.get(s.url)}] ${s.title || s.url} — ${s.url}${s.snippet ? `\n${s.snippet.slice(0, 400)}` : ""}`,
                )
                .join("\n");
              const brandCorpus = brandPassages
                .map(
                  (b, i) =>
                    `### Brand document [B${i + 1}] ${b.title}${b.sourceUrl ? `\nURL: ${b.sourceUrl}` : ""}\n\n${b.text}`,
                )
                .join("\n\n---\n\n");

              const synth = streamText({
                model,
                system: [
                  "You are the Synthesizer on a research team. Write a research report in Markdown for a marketing lead.",
                  "Structure: # Title, ## Executive summary (3 sentences), ## Key findings (bullets, each with a citation), ## Detailed analysis (sub-headings), ## Implications for the brand, ## Recommendations (numbered, specific), ## Open questions, ## References.",
                  "Citations: every factual claim carries an inline citation [n] matching the numbered sources you were given. Internal brand documents are cited as [B1], [B2]. Never cite a number you were not given and never invent a URL.",
                  "Only state what the sources support. Where sources disagree, say so. Where evidence is thin, say 'limited evidence'.",
                  "References: list every cited web source as `[n] Title — URL`, then list internal sources under 'Internal sources'.",
                  "Length: between 700 and 1400 words. No filler, no marketing clichés.",
                ].join("\n"),
                prompt: `Topic: ${project.topic}\nGoal: ${project.goal ?? "Comprehensive deep-dive"}\nRun date: ${startedAt.toISOString().slice(0, 10)}\n\n### Read sources\n${corpus || "(none read in full)"}${
                  snippetOnly ? `\n\n### Additional sources (snippet only)\n${snippetOnly}` : ""
                }${brandCorpus ? `\n\n### Internal brand documents\n${brandCorpus}` : ""}`,
                providerOptions: responsesOptions(cfg.effort),
              });
              let reportText = "";
              for await (const delta of synth.textStream) reportText += delta;
              track(await synth.usage);
              if (reportText.trim().length < 200) {
                await fail("The synthesizer returned an empty report. No tokens were charged beyond this point; try again.");
                return;
              }

              // ====== CRITIC ======
              await writeStep({
                type: "step",
                agent: "Critic",
                action: "review",
                thought: "Scoring the report for evidence, coverage and clarity",
              });

              const review = streamText({
                model,
                system: [
                  "You are the Critic. You receive a research report and the list of sources it was allowed to cite.",
                  "Write `summary`: a 3-sentence executive summary for a busy marketing lead.",
                  "Write `critique`: 2-3 sentences on evidence quality, coverage gaps and any claims that outrun the sources.",
                  "Set `score` 0-100: 90+ only when every claim is cited and the coverage is complete; below 50 when key claims are unsupported.",
                ].join("\n"),
                prompt: `Allowed sources: ${numbered.length} web, ${brandPassages.length} internal.\n\n${reportText.slice(0, 14_000)}`,
                output: Output.object({ schema: ReviewSchema }),
                providerOptions: responsesOptions("low"),
              });
              const verdict = await review.output;
              track(await review.usage);

              const completedAt = new Date();
              await sb
                .from("research_runs")
                .update({
                  status: "succeeded",
                  report_markdown: reportText,
                  summary: verdict.summary,
                  completed_at: completedAt.toISOString(),
                  tokens_input: tokens.input,
                  tokens_output: tokens.output,
                  plan: {
                    queries,
                    critic: `${verdict.critique.trim()}\nSCORE: ${verdict.score}`,
                    search_provider: providerUsed,
                    pages_read: docs.length,
                    sources: numbered.length,
                    brand_passages: brandPassages.length,
                    duration_seconds: Math.round((completedAt.getTime() - startedAt.getTime()) / 1000),
                  },
                })
                .eq("id", run.id);

              await writeStep({
                type: "step",
                agent: "Critic",
                action: "score",
                thought: `Score ${verdict.score}/100`,
                result: { score: verdict.score, critique: verdict.critique },
              });

              // Usage counters: runs + real token totals for the month.
              const periodMonth = new Date();
              periodMonth.setUTCDate(1);
              periodMonth.setUTCHours(0, 0, 0, 0);
              const periodIso = periodMonth.toISOString().slice(0, 10);
              const { data: usage } = await sb
                .from("usage_counters")
                .select("research_runs, tokens_input, tokens_output")
                .eq("workspace_id", project.workspace_id)
                .eq("period_month", periodIso)
                .maybeSingle();
              await sb.from("usage_counters").upsert(
                {
                  workspace_id: project.workspace_id,
                  period_month: periodIso,
                  research_runs: (usage?.research_runs ?? 0) + 1,
                  tokens_input: Number(usage?.tokens_input ?? 0) + tokens.input,
                  tokens_output: Number(usage?.tokens_output ?? 0) + tokens.output,
                },
                { onConflict: "workspace_id,period_month" },
              );

              await auditLog({
                workspaceId: project.workspace_id,
                actorId: userId,
                event: "research.run.completed",
                targetTable: "research_runs",
                targetId: run.id,
                metadata: {
                  model: CHAT_MODEL,
                  score: verdict.score,
                  sources: numbered.length,
                  pages_read: docs.length,
                  tokens_input: tokens.input,
                  tokens_output: tokens.output,
                  search_provider: providerUsed,
                },
                ipAddress: clientIp(request),
                userAgent: request.headers.get("user-agent"),
              });

              await writeStep({ type: "done", report: reportText, summary: verdict.summary });
              controller.close();
            } catch (e) {
              const message = e instanceof Error ? e.message : String(e);
              await fail(message);
            }
          },
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no",
          },
        });
      },
    },
  },
});
