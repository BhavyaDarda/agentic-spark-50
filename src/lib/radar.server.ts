// Radar: recurring research monitors. Server-only.
//
// A scheduler calls /api/public/radar-tick with RADAR_SECRET. Each tick picks
// ONE due monitor, reruns the normal research pipeline for that project
// (same agents, same quota and rate limits), then writes a "What changed"
// brief comparing the new report with the previous successful one.
// Monitors pause themselves after 3 failures in a row.
import { timingSafeEqual } from "crypto";
import { generateText } from "ai";

const MAX_FAILURES = 3;

export function radarAuthorized(request: Request): boolean {
  const secret = process.env["RADAR_SECRET"];
  if (!secret) return false;
  const provided = request.headers.get("x-radar-secret") ?? "";
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function nextRunAt(cadence: "weekly" | "monthly", from = new Date()): string {
  const d = new Date(from);
  if (cadence === "weekly") d.setUTCDate(d.getUTCDate() + 7);
  else d.setUTCMonth(d.getUTCMonth() + 1);
  return d.toISOString();
}

export async function radarTick(origin: string) {
  const { supabaseAdmin: sb } = await import("@/integrations/supabase/client.server");
  const { data: due } = await sb
    .from("research_monitors")
    .select("*")
    .eq("is_active", true)
    .lte("next_run_at", new Date().toISOString())
    .order("next_run_at", { ascending: true })
    .limit(1);
  const mon = due?.[0];
  if (!mon) return { ran: 0 };

  // Claim it first so an overlapping tick does not run it twice.
  const cadence = mon.cadence === "monthly" ? "monthly" : "weekly";
  await sb
    .from("research_monitors")
    .update({ next_run_at: nextRunAt(cadence), last_run_at: new Date().toISOString() })
    .eq("id", mon.id);

  const { data: prev } = await sb
    .from("research_runs")
    .select("id, report_markdown")
    .eq("project_id", mon.project_id)
    .eq("status", "succeeded")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let failure: string | null = null;
  try {
    const res = await fetch(`${origin}/api/research`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-radar-secret": process.env["RADAR_SECRET"] ?? "",
      },
      body: JSON.stringify({ projectId: mon.project_id }),
    });
    if (!res.ok) failure = `${res.status}: ${(await res.text()).slice(0, 300)}`;
    else await res.text(); // drain the stream until the run finishes
  } catch (e) {
    failure = e instanceof Error ? e.message : String(e);
  }

  const { data: latest } = await sb
    .from("research_runs")
    .select("id, status, error, report_markdown")
    .eq("project_id", mon.project_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!failure && (!latest || latest.status !== "succeeded" || latest.id === prev?.id)) {
    failure = latest?.error ?? "Run did not finish";
  }

  if (failure) {
    const fails = mon.consecutive_failures + 1;
    await sb
      .from("research_monitors")
      .update({
        consecutive_failures: fails,
        last_error: failure.slice(0, 500),
        is_active: fails < MAX_FAILURES,
      })
      .eq("id", mon.id);
    return { ran: 1, ok: false, error: failure };
  }

  await sb
    .from("research_monitors")
    .update({ consecutive_failures: 0, last_error: null })
    .eq("id", mon.id);

  let brief: string;
  if (!prev?.report_markdown) {
    brief = "First monitored run. Future runs will be compared against this one.";
  } else {
    const { createLovableAiGatewayProvider, getLovableApiKey } = await import(
      "@/lib/ai-gateway.server"
    );
    const provider = createLovableAiGatewayProvider(getLovableApiKey());
    const out = await generateText({
      model: provider("google/gemini-2.5-flash"),
      system:
        "You compare two versions of a research report on the same topic. Write a short markdown brief titled nothing, with sections 'New', 'Changed', 'Gone'. Only list differences actually present in the text. If nothing material changed, say so in one sentence.",
      prompt: `PREVIOUS REPORT:\n${prev.report_markdown.slice(0, 12000)}\n\nNEW REPORT:\n${(latest!.report_markdown ?? "").slice(0, 12000)}`,
    });
    brief = out.text.trim() || "No material changes.";
  }

  await sb.from("research_run_diffs").insert({
    project_id: mon.project_id,
    workspace_id: mon.workspace_id,
    run_id: latest!.id,
    previous_run_id: prev?.id ?? null,
    brief,
  });
  return { ran: 1, ok: true };
}
