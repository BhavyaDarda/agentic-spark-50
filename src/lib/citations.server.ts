// Server-only citation loop: does anyone actually cite the reports we publish?
//
// Two probes per published report:
//  1. Answer engines — we ask a model the report's own question and look at the
//     URLs it hands back. If our public report URL (or its host) shows up, the
//     report got cited by that engine.
//  2. The open web — a search for the report URL surfaces pages linking to it.
//
// Writes go through the service-role client because `report_citations` has no
// insert grants for any client role. Never import this from client code.
import { createClient } from "@supabase/supabase-js";
import { generateText } from "ai";
import type { Database } from "@/integrations/supabase/types";
import { createLovableAiGatewayProvider, getLovableApiKey } from "@/lib/ai-gateway.server";

/** Models we treat as "answer engines" for the purposes of the sweep. */
const ENGINES = [
  { id: "google/gemini-2.5-flash", label: "Gemini" },
  { id: "openai/gpt-5-mini", label: "ChatGPT" },
] as const;

export interface SweepResult {
  swept: number;
  citationsFound: number;
  projects: { projectId: string; slug: string; found: number }[];
}

function serviceClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Server is missing Supabase service credentials.");
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function extractUrls(text: string): string[] {
  const out: string[] = [];
  const re = /https?:\/\/[^\s<>"')\]]+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) out.push(m[0].replace(/[.,;:]+$/, ""));
  return out;
}

/** Search the open web for pages that link to this report. */
async function webMentions(reportUrl: string, limit = 5) {
  try {
    const res = await fetch(
      `https://html.duckduckgo.com/html/?q=${encodeURIComponent(`"${reportUrl}"`)}`,
      { headers: { "User-Agent": "Mozilla/5.0 (compatible; MarketingAgentCitations/1.0)" } },
    );
    if (!res.ok) return [];
    const html = await res.text();
    const results: { url: string; title: string; snippet: string }[] = [];
    const re =
      /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) && results.length < limit) {
      let url = m[1];
      try {
        const u = new URL(url, "https://duckduckgo.com");
        const uddg = u.searchParams.get("uddg");
        if (uddg) url = decodeURIComponent(uddg);
      } catch {
        /* ignore */
      }
      if (!url.startsWith("http")) continue;
      if (url.startsWith(reportUrl)) continue; // the report itself is not a citation
      results.push({
        url,
        title: m[2].replace(/<[^>]+>/g, "").trim(),
        snippet: m[3].replace(/<[^>]+>/g, "").trim(),
      });
    }
    return results;
  } catch {
    return [];
  }
}

/**
 * Ask one answer engine the report's question and see whether it points at us.
 * Returns the engine's own answer URLs that match our report.
 */
async function engineProbe(
  engine: (typeof ENGINES)[number],
  question: string,
  reportUrl: string,
): Promise<{ citingUrl: string; snippet: string } | null> {
  try {
    const provider = createLovableAiGatewayProvider(getLovableApiKey());
    const { text } = await generateText({
      model: provider(engine.id),
      system:
        "Answer the question briefly, then list the source URLs you would cite, one per line, under a `SOURCES:` heading. Only list URLs you are confident exist.",
      prompt: question,
      maxRetries: 1,
    });
    const urls = extractUrls(text);
    const host = new URL(reportUrl).host;
    const hit = urls.find((u) => u.startsWith(reportUrl) || u.includes(host));
    if (!hit) return null;
    return { citingUrl: hit, snippet: text.slice(0, 600) };
  } catch (e) {
    console.error(`[citations] engine probe failed (${engine.id})`, e);
    return null;
  }
}

/**
 * Sweep published reports for citations. `origin` is the public origin the
 * reports are served from (e.g. https://example.lovable.app).
 */
export async function sweepCitations(origin: string, limit = 5): Promise<SweepResult> {
  const sb = serviceClient();
  const staleBefore = new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString();

  const { data: projects, error } = await sb
    .from("research_projects")
    .select("id, workspace_id, topic, goal, share_slug, citations_checked_at")
    .eq("is_public", true)
    .not("share_slug", "is", null)
    .or(`citations_checked_at.is.null,citations_checked_at.lt.${staleBefore}`)
    .order("citations_checked_at", { ascending: true, nullsFirst: true })
    .limit(limit);

  if (error) throw new Error(error.message);

  const result: SweepResult = { swept: 0, citationsFound: 0, projects: [] };

  for (const project of projects ?? []) {
    const slug = project.share_slug!;
    const reportUrl = `${origin.replace(/\/$/, "")}/r/${slug}`;
    const question = `${project.topic}${project.goal ? ` — ${project.goal}` : ""}`;
    const rows: Database["public"]["Tables"]["report_citations"]["Insert"][] = [];

    for (const engine of ENGINES) {
      const hit = await engineProbe(engine, question, reportUrl);
      if (hit) {
        rows.push({
          project_id: project.id,
          workspace_id: project.workspace_id,
          engine: engine.label,
          citing_url: hit.citingUrl,
          citing_title: `${engine.label} answer for “${project.topic}”`,
          snippet: hit.snippet,
        });
      }
    }

    for (const mention of await webMentions(reportUrl)) {
      rows.push({
        project_id: project.id,
        workspace_id: project.workspace_id,
        engine: "Web",
        citing_url: mention.url,
        citing_title: mention.title || null,
        snippet: mention.snippet || null,
      });
    }

    if (rows.length > 0) {
      const { error: upsertErr } = await sb.from("report_citations").upsert(
        rows.map((r) => ({ ...r, last_seen_at: new Date().toISOString() })),
        { onConflict: "project_id,engine,citing_url" },
      );
      if (upsertErr) console.error("[citations] upsert failed", upsertErr);
    }

    await sb
      .from("research_projects")
      .update({ citations_checked_at: new Date().toISOString() })
      .eq("id", project.id);

    result.swept++;
    result.citationsFound += rows.length;
    result.projects.push({ projectId: project.id, slug, found: rows.length });
  }

  return result;
}
