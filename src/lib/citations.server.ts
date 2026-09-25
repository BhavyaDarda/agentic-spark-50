// Server-only citation loop: does anyone actually cite the reports we publish?
//
// Every row written here is an observation from a real, just-executed check:
//
//  1. Answer engine — a search-grounded model (Claude with live web search) is
//     asked the report's own question. If it cites or surfaces our public
//     report URL in its answer, that is recorded as an engine citation.
//  2. The open web — a live search for the report URL returns candidate pages;
//     each candidate is fetched and only stored when its HTML really contains
//     a link to the report.
//
// Nothing here asks a model to "recall" URLs from memory: a hit means the
// report was found on the live web at the moment of the check.
//
// Writes go through the service-role client because `report_citations` has no
// insert grants for any client role. Never import this from client code.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { groundedAnswer, webSearch } from "@/lib/web-search.server";

export const ENGINE_LABELS = {
  claude: "Claude (web search)",
  web: "Web",
} as const;

export interface ProjectCheck {
  projectId: string;
  slug: string;
  found: number;
  engineHit: boolean;
  webMentions: number;
  errors: string[];
}

export interface SweepResult {
  swept: number;
  citationsFound: number;
  projects: ProjectCheck[];
}

type ProjectRow = Pick<
  Database["public"]["Tables"]["research_projects"]["Row"],
  "id" | "workspace_id" | "topic" | "goal" | "share_slug"
>;

function serviceClient() {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !key) throw new Error("Server is missing Supabase service credentials.");
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function normalize(url: string) {
  return url.replace(/[#?].*$/, "").replace(/\/$/, "").toLowerCase();
}

/** Fetch a candidate page and confirm it really links to the report. */
async function confirmMention(candidateUrl: string, reportUrl: string, slug: string) {
  try {
    const { safeFetch } = await import("@/lib/ssrf.server");
    const res = await safeFetch(candidateUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; MarketingAgentCitations/2.0; +https://reacher-ai.lovable.app)",
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5",
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return false;
    const html = (await res.text()).slice(0, 1_500_000);
    const needleFull = normalize(reportUrl);
    const needlePath = `/r/${slug}`;
    return html.toLowerCase().includes(needleFull) || html.includes(needlePath);
  } catch {
    return false;
  }
}

/**
 * Run both probes for one published project and upsert whatever was found.
 * Always stamps `citations_checked_at`, even when nothing was found, so the
 * UI can say "last checked" truthfully.
 */
export async function checkProjectCitations(
  project: ProjectRow,
  origin: string,
): Promise<ProjectCheck> {
  const sb = serviceClient();
  const slug = project.share_slug!;
  const reportUrl = `${origin.replace(/\/$/, "")}/r/${slug}`;
  const reportKey = normalize(reportUrl);
  const question = `${project.topic}${project.goal ? ` — ${project.goal}` : ""}`;
  const rows: Database["public"]["Tables"]["report_citations"]["Insert"][] = [];
  const errors: string[] = [];
  let engineHit = false;

  // 1. Search-grounded answer engine.
  const answer = await groundedAnswer(question, { maxSearches: 3 });
  if (!answer.ok) {
    errors.push(`engine: ${answer.error ?? "failed"}`);
  } else {
    const cited = answer.citedUrls.find((u) => normalize(u).startsWith(reportKey));
    const surfaced = answer.searchedUrls.find((u) => normalize(u).startsWith(reportKey));
    const hit = cited ?? surfaced;
    if (hit) {
      engineHit = true;
      rows.push({
        project_id: project.id,
        workspace_id: project.workspace_id,
        engine: ENGINE_LABELS.claude,
        citing_url: hit,
        citing_title: cited
          ? `Cited in a Claude web-search answer for “${project.topic}”`
          : `Surfaced by Claude web search for “${project.topic}”`,
        snippet: answer.text.slice(0, 600) || null,
      });
    }
  }

  // 2. Pages on the open web that link to the report.
  const mentions = await webSearch(`"${reportUrl}"`, { max: 8 });
  let webMentions = 0;
  if (!mentions.ok) {
    errors.push(`web: ${mentions.error}`);
  } else {
    const candidates = mentions.results.filter((r) => !normalize(r.url).startsWith(reportKey));
    const confirmed = await Promise.all(
      candidates.map(async (c) => ((await confirmMention(c.url, reportUrl, slug)) ? c : null)),
    );
    for (const c of confirmed) {
      if (!c) continue;
      webMentions++;
      rows.push({
        project_id: project.id,
        workspace_id: project.workspace_id,
        engine: ENGINE_LABELS.web,
        citing_url: c.url,
        citing_title: c.title || null,
        snippet: c.snippet || null,
      });
    }
  }

  if (rows.length > 0) {
    const { error: upsertErr } = await sb.from("report_citations").upsert(
      rows.map((r) => ({ ...r, last_seen_at: new Date().toISOString() })),
      { onConflict: "project_id,engine,citing_url" },
    );
    if (upsertErr) errors.push(`upsert: ${upsertErr.message}`);
  }

  await sb
    .from("research_projects")
    .update({ citations_checked_at: new Date().toISOString() })
    .eq("id", project.id);

  return { projectId: project.id, slug, found: rows.length, engineHit, webMentions, errors };
}

/**
 * Sweep the stalest published reports. `origin` is the public origin the
 * reports are served from (e.g. https://reacher-ai.lovable.app).
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
    const check = await checkProjectCitations(project, origin);
    result.swept++;
    result.citationsFound += check.found;
    result.projects.push(check);
  }
  return result;
}
