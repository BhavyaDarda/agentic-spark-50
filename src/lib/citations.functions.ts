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
