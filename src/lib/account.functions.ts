import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Permanently delete the signed-in user's account.
 *
 * Workspaces where the caller is the only member are removed first (child rows
 * cascade); shared workspaces just lose the caller's membership so teammates
 * keep their data. Only then is the auth user deleted.
 */
export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { confirm: string }) =>
    z.object({ confirm: z.literal("DELETE") }).parse(input),
  )
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: memberships, error: memErr } = await supabase
      .from("workspace_members")
      .select("workspace_id, role")
      .eq("user_id", userId);
    if (memErr) throw new Error(memErr.message);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    for (const m of memberships ?? []) {
      const { count } = await supabaseAdmin
        .from("workspace_members")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", m.workspace_id);

      if ((count ?? 0) <= 1) {
        const { error } = await supabaseAdmin
          .from("workspaces")
          .delete()
          .eq("id", m.workspace_id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabaseAdmin
          .from("workspace_members")
          .delete()
          .eq("workspace_id", m.workspace_id)
          .eq("user_id", userId);
        if (error) throw new Error(error.message);
      }
    }

    const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (delErr) throw new Error(delErr.message);

    return { ok: true } as const;
  });
