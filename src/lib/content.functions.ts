import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { generateText } from "ai";
import { createLovableAiGatewayProvider, getLovableApiKey } from "./ai-gateway.server";

const CONTENT_KINDS = [
  "blog",
  "ad_copy",
  "social_post",
  "hashtags",
  "email",
  "video_script",
  "strategy",
  "campaign",
] as const;

const RunInput = z.object({
  workspaceId: z.string().uuid(),
  brandId: z.string().uuid().optional().nullable(),
  campaignId: z.string().uuid().optional().nullable(),
  kind: z.enum(CONTENT_KINDS),
  title: z.string().trim().max(200).optional(),
  prompt: z.string().trim().min(3).max(8000),
  channel: z.string().trim().max(60).optional(),
  tone: z.string().trim().max(120).optional(),
  length: z.enum(["short", "medium", "long"]).optional(),
});

function systemFor(kind: (typeof CONTENT_KINDS)[number]) {
  const base =
    "You are Marketing Agent, a senior brand strategist & copywriter. Produce sharp, on-brand, channel-aware output. Use Markdown. No fluff.";
  switch (kind) {
    case "blog":
      return `${base} Write an SEO-friendly blog post with H1, intro hook, scannable sections (H2/H3), a TL;DR callout, and a closing CTA.`;
    case "ad_copy":
      return `${base} Produce 5 distinct ad variations. Each: Headline (max 40 chars), Primary Text (max 125 chars), Description (max 30 chars), CTA. Output as a numbered list.`;
    case "social_post":
      return `${base} Produce 3 variants tuned to the requested platform. Include hooks, body, and a CTA. Suggest 5-8 hashtags after each.`;
    case "hashtags":
      return `${base} Produce 20 highly relevant hashtags grouped as: 5 broad, 10 niche, 5 long-tail. Return as a Markdown list.`;
    case "email":
      return `${base} Produce an email with: Subject (max 60 chars), Preheader (max 90 chars), Body (3-5 short paragraphs), single primary CTA, P.S. line.`;
    case "video_script":
      return `${base} Produce a 60-90 second script in HOOK / BUILD / PAYOFF / CTA blocks with on-screen text directions.`;
    case "strategy":
      return `${base} Produce a Marketing Strategy doc with: Positioning, ICP, Channel Mix (table), Messaging Pillars, 30-day Plan, KPIs.`;
    case "campaign":
      return `${base} Produce a Campaign brief: Objective, Audience, Key Message, Channel breakdown (table), Calendar table (Week / Channel / Asset / Owner), Success metrics.`;
  }
}

function brandContext(b: {
  name?: string | null;
  product?: string | null;
  audience?: string | null;
  tone?: string | null;
  goals?: string | null;
  brand_voice?: string | null;
} | null) {
  if (!b) return "";
  return [
    `Brand: ${b.name ?? ""}`,
    b.product && `Product: ${b.product}`,
    b.audience && `Audience: ${b.audience}`,
    b.tone && `Tone: ${b.tone}`,
    b.brand_voice && `Brand voice: ${b.brand_voice}`,
    b.goals && `Goals: ${b.goals}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export const generateContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => RunInput.parse(d))
  .handler(async ({ data, context }) => {
    // Enforce monthly usage cap (free=10, pro=200, team=1000)
    const { data: ws } = await context.supabase
      .from("workspaces")
      .select("plan")
      .eq("id", data.workspaceId)
      .maybeSingle();
    const plan = (ws?.plan as "free" | "pro" | "team" | undefined) ?? "free";
    const cap = plan === "team" ? 1000 : plan === "pro" ? 200 : 10;
    const periodMonth = new Date();
    periodMonth.setUTCDate(1);
    periodMonth.setUTCHours(0, 0, 0, 0);
    const periodIso = periodMonth.toISOString().slice(0, 10);

    const { data: usage } = await context.supabase
      .from("usage_counters")
      .select("content_runs")
      .eq("workspace_id", data.workspaceId)
      .eq("period_month", periodIso)
      .maybeSingle();
    if ((usage?.content_runs ?? 0) >= cap) {
      throw new Error(
        `Monthly limit reached for ${plan} plan (${cap} runs). Upgrade in Settings → Billing.`,
      );
    }

    // Brand context
    let brand: Awaited<ReturnType<typeof context.supabase.from>> | null = null;
    if (data.brandId) {
      const { data: b } = await context.supabase
        .from("brands")
        .select("*")
        .eq("id", data.brandId)
        .maybeSingle();
      brand = b as never;
    }
    const ctx = brandContext(brand as never);

    // Create run row (running)
    const { data: run, error: runErr } = await context.supabase
      .from("content_runs")
      .insert({
        workspace_id: data.workspaceId,
        brand_id: data.brandId ?? null,
        campaign_id: data.campaignId ?? null,
        kind: data.kind,
        title: data.title ?? null,
        input: { prompt: data.prompt, channel: data.channel, tone: data.tone, length: data.length },
        status: "running",
        created_by: context.userId,
      })
      .select()
      .single();
    if (runErr) throw new Error(runErr.message);

    try {
      const gateway = createLovableAiGatewayProvider(getLovableApiKey());
      const model = gateway("google/gemini-3-flash-preview");
      const lengthHint =
        data.length === "long"
          ? "Aim for 900-1400 words."
          : data.length === "short"
            ? "Keep it under 200 words."
            : "Aim for 400-700 words.";

      const { text, usage: u } = await generateText({
        model,
        system: systemFor(data.kind),
        prompt:
          (ctx ? `### Brand context\n${ctx}\n\n` : "") +
          (data.channel ? `### Channel\n${data.channel}\n\n` : "") +
          (data.tone ? `### Tone override\n${data.tone}\n\n` : "") +
          `### Brief\n${data.prompt}\n\n${lengthHint}`,
      });

      await context.supabase
        .from("content_runs")
        .update({
          status: "succeeded",
          output_text: text,
          model: "google/gemini-3-flash-preview",
          tokens_input: (u as { inputTokens?: number } | undefined)?.inputTokens ?? 0,
          tokens_output: (u as { outputTokens?: number } | undefined)?.outputTokens ?? 0,
        })
        .eq("id", run.id);

      // Increment usage
      await context.supabase.rpc as never; // noop typing helper
      await context.supabase
        .from("usage_counters")
        .upsert(
          {
            workspace_id: data.workspaceId,
            period_month: periodIso,
            content_runs: (usage?.content_runs ?? 0) + 1,
          },
          { onConflict: "workspace_id,period_month" },
        );

      return { id: run.id, text };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await context.supabase
        .from("content_runs")
        .update({ status: "failed", error: msg })
        .eq("id", run.id);
      throw new Error(msg);
    }
  });

export const listRuns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ workspaceId: z.string().uuid(), limit: z.number().int().min(1).max(100).default(25) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("content_runs")
      .select("id, kind, title, status, model, eval_score, created_at, output_text")
      .eq("workspace_id", data.workspaceId)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const rateRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), rating: z.number().int().min(-1).max(1) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("content_runs")
      .update({ user_rating: data.rating })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
