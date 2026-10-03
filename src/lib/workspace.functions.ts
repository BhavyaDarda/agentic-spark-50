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


const brandingSchema = z.object({
  workspaceId: z.string().uuid(),
  preparedBy: z.string().trim().max(80).nullable(),
  logoUrl: z.string().trim().url().max(500).refine((u) => u.startsWith("https://"), "Logo must use https").nullable(),
  accent: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, "Use a hex colour like #ff00aa").nullable(),
});

/** Report branding shown on published reports and their PDF. Admins/owners only (RLS). */
export const updateBranding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => brandingSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("workspaces")
      .update({ brand_prepared_by: data.preparedBy, brand_logo_url: data.logoUrl, brand_accent: data.accent })
      .eq("id", data.workspaceId)
      .select("id");
    if (error) throw new Error(error.message);
    if (!rows?.length) throw new Error("Only workspace owners and admins can change branding.");
    return { ok: true };
  });

export const getBranding = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ workspaceId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("workspaces")
      .select("brand_prepared_by, brand_logo_url, brand_accent")
      .eq("id", data.workspaceId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return {
      preparedBy: row?.brand_prepared_by ?? null,
      logoUrl: row?.brand_logo_url ?? null,
      accent: row?.brand_accent ?? null,
    };
  });
