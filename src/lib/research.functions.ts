import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const listProjects = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ workspaceId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("research_projects")
      .select("*")
      .eq("workspace_id", data.workspaceId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getProject = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: project, error } = await context.supabase
      .from("research_projects")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!project) return null;

    const { data: runs } = await context.supabase
      .from("research_runs")
      .select("*")
      .eq("project_id", data.id)
      .order("created_at", { ascending: false });

    return { project, runs: runs ?? [] };
  });

export const getRunDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ runId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const [{ data: run }, { data: steps }, { data: sources }] = await Promise.all([
      context.supabase.from("research_runs").select("*").eq("id", data.runId).maybeSingle(),
      context.supabase
        .from("research_steps")
        .select("*")
        .eq("run_id", data.runId)
        .order("step_index", { ascending: true }),
      context.supabase
        .from("research_sources")
        .select("*")
        .eq("run_id", data.runId)
        .order("created_at", { ascending: true }),
    ]);
    return { run, steps: steps ?? [], sources: sources ?? [] };
  });

export const createProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        topic: z.string().trim().min(3).max(400),
        goal: z.string().trim().max(1000).optional(),
        depth: z.enum(["quick", "standard", "deep"]).default("standard"),
        brandId: z.string().uuid().optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("research_projects")
      .insert({
        workspace_id: data.workspaceId,
        brand_id: data.brandId ?? null,
        topic: data.topic,
        goal: data.goal ?? null,
        depth: data.depth,
        created_by: context.userId,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const toggleSharing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), is_public: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    // Reuse any previously issued slug so links shared earlier keep working
    // after a private → public round trip.
    const { data: existing, error: readErr } = await context.supabase
      .from("research_projects")
      .select("share_slug")
      .eq("id", data.id)
      .maybeSingle();
    if (readErr) throw new Error(readErr.message);
    if (!existing) throw new Error("Project not found");

    let slug: string | null = existing.share_slug;
    if (data.is_public && !slug) {
      slug = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
    }

    const { error } = await context.supabase
      .from("research_projects")
      .update({ is_public: data.is_public, share_slug: slug })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true, slug };
  });

