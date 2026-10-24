import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { accountWorkspaceAction, savedOutput } from "./account-safety";

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

    // Preflight every workspace before any destructive write. Unknown counts
    // must never be interpreted as an empty/sole-member workspace.
    const actions = [];
    for (const m of memberships ?? []) {
      const { count, error: countError } = await supabaseAdmin
        .from("workspace_members")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", m.workspace_id);
      if (countError) throw new Error("Could not verify workspace membership. Your account was not deleted.");
      let owners: number | null = null;
      if (m.role === "owner" && count !== null && count > 1) {
        const { count: ownerCount, error: ownerError } = await supabaseAdmin
          .from("workspace_members").select("id", { count: "exact", head: true })
          .eq("workspace_id", m.workspace_id).eq("role", "owner");
        if (ownerError) throw new Error("Could not verify workspace ownership. Your account was not deleted.");
        owners = ownerCount;
      }
      actions.push({ workspaceId: m.workspace_id, action: accountWorkspaceAction(count, m.role, owners) });
    }

    for (const item of actions) {
      if (item.action === "delete") {
        const { error } = await supabaseAdmin
          .from("workspaces")
          .delete()
          .eq("id", item.workspaceId);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabaseAdmin
          .from("workspace_members")
          .delete()
          .eq("workspace_id", item.workspaceId)
          .eq("user_id", userId);
        if (error) throw new Error(error.message);
      }
    }

    const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (delErr) throw new Error(delErr.message);

    return { ok: true } as const;
  });

/** Caller-owned profile and saved outputs only; no credentials, prompts or traces. */
export const exportMyData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: profile, error } = await supabase.from("profiles")
      .select("id, full_name, email, created_at").eq("id", userId).maybeSingle();
    if (error) throw new Error("Could not export your profile.");
    const content = [];
    const artifacts = [];
    const research = [];
    // Paginate explicitly so exports do not silently stop at the API row limit.
    for (let offset = 0; ; offset += 100) {
      const { data: rows, error } = await supabase.from("content_runs")
        .select("id, title, output_text, created_at").eq("created_by", userId).eq("status", "succeeded")
        .order("id").range(offset, offset + 99);
      if (error) throw new Error("Could not export saved content.");
      content.push(...(rows ?? []).map(r => savedOutput({ ...r, markdown: r.output_text })));
      if (!rows || rows.length < 100) break;
    }
    for (let offset = 0; ; offset += 100) {
      const { data: rows, error } = await supabase.from("artifacts")
        .select("id, title, content, created_at").eq("created_by", userId)
        .order("id").range(offset, offset + 99);
      if (error) throw new Error("Could not export saved artifacts.");
      artifacts.push(...(rows ?? []).map(r => savedOutput({ ...r, markdown: r.content })));
      if (!rows || rows.length < 100) break;
    }
    for (let offset = 0; ; offset += 100) {
      const { data: projects, error } = await supabase.from("research_projects")
        .select("id, topic").eq("created_by", userId).order("id").range(offset, offset + 99);
      if (error) throw new Error("Could not export your research.");
      for (const project of projects ?? []) {
        const { data: run, error } = await supabase.from("research_runs")
          .select("id, report_markdown, created_at").eq("project_id", project.id).eq("status", "succeeded")
          .order("created_at", { ascending: false }).limit(1).maybeSingle();
        if (error) throw new Error("Could not export a saved report.");
        if (run?.report_markdown) research.push(savedOutput({ ...run, title: project.topic, markdown: run.report_markdown }));
      }
      if (!projects || projects.length < 100) break;
    }
    return { exportedAt: new Date().toISOString(), profile, content, artifacts, research };
  });
