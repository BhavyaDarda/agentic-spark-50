import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const getCurrentWorkspace = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("workspace_members")
      .select("role, workspace:workspaces(*)")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    return {
      role: data.role as "owner" | "admin" | "member",
      workspace: data.workspace as unknown as {
        id: string;
        name: string;
        slug: string;
        plan: string;
      },
    };
  });

export const renameWorkspace = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ workspaceId: z.string().uuid(), name: z.string().trim().min(1).max(80) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("workspaces")
      .update({ name: data.name })
      .eq("id", data.workspaceId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Plan, quotas and current-period usage for the workspace. */
export const getUsage = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ workspaceId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: isMember, error } = await context.supabase.rpc("is_workspace_member", {
      _workspace_id: data.workspaceId,
      _user_id: context.userId,
    });
    if (error) throw new Error(error.message);
    if (!isMember) throw new Error("Not a member of this workspace.");

    const { usageSnapshot, periodResetsAt } = await import("./limits.server");
    const snap = await usageSnapshot(data.workspaceId);
    return { ...snap, resetsAt: periodResetsAt() };
  });

