import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { savedOutput } from "./account-safety";

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
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Locks and preflight run in one database transaction, so concurrent
    // membership edits and partial cleanup cannot strand shared workspaces.
    const { error: cleanupError } = await supabaseAdmin.rpc("cleanup_account_workspaces", { p_user_id: userId });
    if (cleanupError) throw new Error(cleanupError.message);

    const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (delErr) throw new Error("Workspace cleanup completed, but account removal did not finish. Retry deleting your account.");

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
