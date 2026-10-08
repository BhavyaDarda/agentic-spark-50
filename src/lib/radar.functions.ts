import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getRadar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ projectId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const [{ data: monitor }, { data: diffs }] = await Promise.all([
      context.supabase
        .from("research_monitors")
        .select("cadence, is_active, next_run_at, last_run_at, consecutive_failures, last_error")
        .eq("project_id", data.projectId)
        .maybeSingle(),
      context.supabase
        .from("research_run_diffs")
        .select("id, brief, created_at")
        .eq("project_id", data.projectId)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);
    return { monitor: monitor ?? null, diffs: diffs ?? [] };
  });

export const setRadar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        projectId: z.string().uuid(),
        cadence: z.enum(["off", "weekly", "monthly"]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    if (data.cadence === "off") {
      const { error } = await sb.from("research_monitors").delete().eq("project_id", data.projectId);
      if (error) throw new Error(error.message);
      return { ok: true };
    }
    const { data: project } = await sb
      .from("research_projects")
      .select("id, workspace_id")
      .eq("id", data.projectId)
      .maybeSingle();
    if (!project) throw new Error("Project not found");
    const { nextRunAt } = await import("@/lib/radar.server");
    const { error } = await sb.from("research_monitors").upsert(
      {
        project_id: project.id,
        workspace_id: project.workspace_id,
        cadence: data.cadence,
        is_active: true,
        consecutive_failures: 0,
        last_error: null,
        next_run_at: nextRunAt(data.cadence),
        created_by: context.userId,
      },
      { onConflict: "project_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });
