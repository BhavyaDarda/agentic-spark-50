import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export interface CitationRow {
  id: string;
  engine: string;
  citingUrl: string;
  citingTitle: string | null;
  snippet: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
}

/** Citations recorded for one research project. RLS scopes this to workspace members. */
export const listCitations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ projectId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }): Promise<{ citations: CitationRow[] }> => {
    const { data: rows, error } = await context.supabase
      .from("report_citations")
      .select("id, engine, citing_url, citing_title, snippet, first_seen_at, last_seen_at")
      .eq("project_id", data.projectId)
      .order("last_seen_at", { ascending: false });
    if (error) throw new Error(error.message);
    return {
      citations: (rows ?? []).map((r) => ({
        id: r.id,
        engine: r.engine,
        citingUrl: r.citing_url,
        citingTitle: r.citing_title,
        snippet: r.snippet,
        firstSeenAt: r.first_seen_at,
        lastSeenAt: r.last_seen_at,
      })),
    };
  });

/** Citation counts for a workspace's projects, so the list screen can show them. */
export const citationCounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ workspaceId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }): Promise<Record<string, number>> => {
    const { data: rows, error } = await context.supabase
      .from("report_citations")
      .select("project_id")
      .eq("workspace_id", data.workspaceId);
    if (error) throw new Error(error.message);
    const counts: Record<string, number> = {};
    for (const row of rows ?? []) counts[row.project_id] = (counts[row.project_id] ?? 0) + 1;
    return counts;
  });

/** Minimum gap between manual checks of the same report. */
const REFRESH_COOLDOWN_MS = 60 * 60 * 1000;

export interface RefreshResult {
  ok: boolean;
  found: number;
  engineHit: boolean;
  webMentions: number;
  checkedAt: string;
  /** Set when the check was skipped because it ran recently. */
  nextAllowedAt?: string;
  errors: string[];
}

/**
 * Run the citation check for one published report right now. Workspace
 * members only (RLS on the project read); throttled to once an hour per
 * report because each check performs live web searches.
 */
export const refreshCitations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ projectId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }): Promise<RefreshResult> => {
    const { data: project, error } = await context.supabase
      .from("research_projects")
      .select("id, workspace_id, topic, goal, share_slug, is_public, citations_checked_at")
      .eq("id", data.projectId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!project) throw new Error("Project not found.");
    if (!project.is_public || !project.share_slug) {
      throw new Error("Publish the report first — only public reports can be cited.");
    }

    const last = project.citations_checked_at ? Date.parse(project.citations_checked_at) : 0;
    if (last && Date.now() - last < REFRESH_COOLDOWN_MS) {
      return {
        ok: true,
        found: 0,
        engineHit: false,
        webMentions: 0,
        checkedAt: project.citations_checked_at!,
        nextAllowedAt: new Date(last + REFRESH_COOLDOWN_MS).toISOString(),
        errors: [],
      };
    }

    const { checkProjectCitations } = await import("@/lib/citations.server");
    const { SITE } = await import("@/lib/site");
    const origin = process.env["PUBLIC_SITE_ORIGIN"] || SITE.origin;
    const check = await checkProjectCitations(project, origin);
    return {
      ok: check.errors.length === 0,
      found: check.found,
      engineHit: check.engineHit,
      webMentions: check.webMentions,
      checkedAt: new Date().toISOString(),
      errors: check.errors,
    };
  });
