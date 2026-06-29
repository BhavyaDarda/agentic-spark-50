import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const getMyWorkspaces = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("workspace_members")
      .select("role, workspace:workspaces(*)")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => ({
      role: r.role as "owner" | "admin" | "member",
      workspace: r.workspace as unknown as {
        id: string;
        name: string;
        slug: string;
        plan: string;
      },
    }));
  });

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

export const getMembers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ workspaceId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: members, error } = await context.supabase
      .from("workspace_members")
      .select("user_id, role, created_at")
      .eq("workspace_id", data.workspaceId);
    if (error) throw new Error(error.message);
    return members ?? [];
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
