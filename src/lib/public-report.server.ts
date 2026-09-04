// Server-only assembly of a public research report: the report itself, its
// trust surface (evidence + critic score + what the run cost), and at most one
// clearly labeled sponsor. Never import from client code.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { selectSponsorForTopic, type PublicSponsor } from "@/lib/sponsors.server";

export interface TrustSurface {
  /** Critic score 0-100, when the Critic agent produced one. */
  criticScore: number | null;
  criticNotes: string | null;
  sourceCount: number;
  queryCount: number;
  model: string | null;
  tokensInput: number | null;
  tokensOutput: number | null;
  /** Wall-clock seconds the multi-agent run took. */
  durationSeconds: number | null;
}

export interface ReportCitation {
  engine: string;
  citingUrl: string;
  citingTitle: string | null;
  firstSeenAt: string;
}

export interface PublicReport {
  project: { topic: string; goal: string | null; depth: string };
  run: {
    reportMarkdown: string | null;
    summary: string | null;
    createdAt: string;
  } | null;
  sources: { url: string; title: string | null; snippet: string | null }[];
  trust: TrustSurface;
  sponsor: PublicSponsor | null;
  /** Answer engines and web pages observed citing this report. */
  citations: ReportCitation[];
}

function publicClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Server is missing Supabase public credentials.");
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** The Critic agent ends its review with `SCORE: <0-100>`. */
export function parseCriticScore(critic: string | null | undefined): number | null {
  if (!critic) return null;
  const m = critic.match(/SCORE:\s*(\d{1,3})/i);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n : null;
}

/** Strip the trailing SCORE line so the notes read as prose. */
export function criticNotes(critic: string | null | undefined): string | null {
  if (!critic) return null;
  const cleaned = critic.replace(/SCORE:\s*\d{1,3}\s*$/i, "").trim();
  return cleaned.length > 0 ? cleaned : null;
}

export async function loadPublicReport(slug: string): Promise<PublicReport | null> {
  const sb = publicClient();

  const { data: project } = await sb
    .from("research_projects")
    .select("id, topic, goal, depth, is_public")
    .eq("share_slug", slug)
    .maybeSingle();

  if (!project || !project.is_public) return null;

  const { data: run } = await sb
    .from("research_runs")
    .select(
      "id, report_markdown, summary, model, created_at, plan, tokens_input, tokens_output, started_at, completed_at",
    )
    .eq("project_id", project.id)
    .eq("status", "succeeded")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let sources: PublicReport["sources"] = [];
  if (run) {
    const { data: rows } = await sb
      .from("research_sources")
      .select("url, title, snippet")
      .eq("run_id", run.id)
      .order("created_at", { ascending: true });
    sources = rows ?? [];
  }

  const plan = (run?.plan ?? null) as { queries?: string[]; critic?: string } | null;
  const started = run?.started_at ? Date.parse(run.started_at) : null;
  const completed = run?.completed_at ? Date.parse(run.completed_at) : null;

  const sponsor = await selectSponsorForTopic(
    `${project.topic} ${project.goal ?? ""}`,
    "report_source_card",
    project.id,
  );

  return {
    project: { topic: project.topic, goal: project.goal, depth: project.depth },
    run: run
      ? {
          reportMarkdown: run.report_markdown,
          summary: run.summary,
          createdAt: run.created_at,
        }
      : null,
    sources,
    trust: {
      criticScore: parseCriticScore(plan?.critic),
      criticNotes: criticNotes(plan?.critic),
      sourceCount: sources.length,
      queryCount: plan?.queries?.length ?? 0,
      model: run?.model ?? null,
      tokensInput: run?.tokens_input ?? null,
      tokensOutput: run?.tokens_output ?? null,
      durationSeconds:
        started && completed && completed > started ? Math.round((completed - started) / 1000) : null,
    },
    sponsor,
  };
}
