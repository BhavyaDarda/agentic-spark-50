import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { WebhookInput, allowedWebhookUrl, exportPayload } from "./publishing";

export const sendOutputWebhook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const parsed = WebhookInput.safeParse(input);
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Check the export details.");
    return parsed.data;
  })
  .handler(async ({ data, context }) => {
    let workspaceId: string;
    let document: { id: string; title: string; markdown: string; summary?: string | null };
    if (data.source === "content") {
      const { data: row, error } = await context.supabase.from("content_runs")
        .select("id, workspace_id, title, kind, status, output_text").eq("id", data.id).maybeSingle();
      if (error || !row || row.status !== "succeeded" || !row.output_text) throw new Error("Completed output not found or access denied.");
      workspaceId = row.workspace_id;
      document = { id: row.id, title: row.title ?? row.kind, markdown: row.output_text };
    } else {
      const { data: project, error } = await context.supabase.from("research_projects")
        .select("id, workspace_id, topic").eq("id", data.id).maybeSingle();
      if (error || !project) throw new Error("Research not found or access denied.");
      const { data: run, error: runError } = await context.supabase.from("research_runs")
        .select("id, report_markdown, summary").eq("project_id", project.id).eq("status", "succeeded")
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (runError || !run?.report_markdown) throw new Error("No completed research report to send.");
      workspaceId = project.workspace_id;
      document = { id: run.id, title: project.topic, markdown: run.report_markdown, summary: run.summary };
    }
    // Privileged metering only after the caller's RLS-authorized read above.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const window = new Date(); window.setUTCSeconds(0, 0);
    const bucket = `publishing.webhook:${context.userId}`;
    const { error: meterError } = await supabaseAdmin.rpc("increment_rate_limit", {
      p_workspace_id: workspaceId, p_bucket: bucket, p_window_start: window.toISOString(),
    });
    if (meterError) throw new Error("Sending is temporarily unavailable. Please try later.");
    const { data: meter, error: readError } = await supabaseAdmin.from("rate_limits")
      .select("count").eq("workspace_id", workspaceId).eq("bucket", bucket).eq("window_start", window.toISOString()).single();
    if (readError || !meter || meter.count > 5) throw new Error("Sending limit reached. Please wait one minute.");
    const deliveryId = crypto.randomUUID();
    const body = exportPayload(data.source, document, deliveryId, new Date().toISOString());
    const { deliverWebhook } = await import("./publishing.server");
    const result = await deliverWebhook(data.url, body, deliveryId, data.signingSecret);
    await supabaseAdmin.from("audit_log").insert({ workspace_id: workspaceId, actor_id: context.userId,
      event: "publishing.webhook", target_table: data.source === "content" ? "content_runs" : "research_projects", target_id: data.id,
      metadata: { deliveryId, host: allowedWebhookUrl(data.url).hostname, ok: result.ok, status: result.status } });
    return { ...result, deliveryId };
  });