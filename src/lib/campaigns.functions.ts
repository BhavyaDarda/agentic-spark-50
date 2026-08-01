import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/** Shape we ask the model for and store in `campaigns.strategy` / `.calendar`. */
export interface CampaignStrategy {
  positioning: string;
  audience: string;
  keyMessage: string;
  channelMix: { channel: string; role: string; budgetShare: number }[];
  kpis: { name: string; target: string }[];
  risks: string[];
}

export interface CalendarItem {
  week: number;
  date: string | null;
  channel: string;
  asset: string;
  owner: string;
}

export const listCampaigns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ workspaceId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("campaigns")
      .select("id, name, objective, channels, status, start_date, end_date, budget, brand_id, updated_at")
      .eq("workspace_id", data.workspaceId)
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getCampaign = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("campaigns")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;

    const { data: assets } = await context.supabase
      .from("content_runs")
      .select("id, kind, title, status, created_at, output_text")
      .eq("campaign_id", data.id)
      .order("created_at", { ascending: false });

    return { campaign: row, assets: assets ?? [] };
  });

const CreateInput = z.object({
  workspaceId: z.string().uuid(),
  brandId: z.string().uuid().nullable().optional(),
  name: z.string().trim().min(2).max(120),
  objective: z.string().trim().max(2000).optional(),
  channels: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
  startDate: z.string().date().nullable().optional(),
  endDate: z.string().date().nullable().optional(),
  budget: z.number().min(0).max(100_000_000).nullable().optional(),
});

export const createCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CreateInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("campaigns")
      .insert({
        workspace_id: data.workspaceId,
        brand_id: data.brandId ?? null,
        name: data.name,
        objective: data.objective ?? null,
        channels: data.channels,
        start_date: data.startDate ?? null,
        end_date: data.endDate ?? null,
        budget: data.budget ?? null,
        status: "draft",
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    const { auditLog } = await import("./security.server");
    await auditLog({
      workspaceId: data.workspaceId,
      actorId: context.userId,
      event: "campaign.created",
      targetTable: "campaigns",
      targetId: row.id,
      metadata: { name: data.name },
    });
    return { id: row.id };
  });

export const updateCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        name: z.string().trim().min(2).max(120).optional(),
        objective: z.string().trim().max(4000).nullable().optional(),
        channels: z.array(z.string().trim().min(1).max(40)).max(12).optional(),
        startDate: z.string().date().nullable().optional(),
        endDate: z.string().date().nullable().optional(),
        budget: z.number().min(0).max(100_000_000).nullable().optional(),
        status: z.enum(["draft", "active", "paused", "complete"]).optional(),
        brandId: z.string().uuid().nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const patch: {
      name?: string;
      objective?: string | null;
      channels?: string[];
      start_date?: string | null;
      end_date?: string | null;
      budget?: number | null;
      status?: string;
      brand_id?: string | null;
    } = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.objective !== undefined) patch.objective = data.objective;
    if (data.channels !== undefined) patch.channels = data.channels;
    if (data.startDate !== undefined) patch.start_date = data.startDate;
    if (data.endDate !== undefined) patch.end_date = data.endDate;
    if (data.budget !== undefined) patch.budget = data.budget;
    if (data.status !== undefined) patch.status = data.status;
    if (data.brandId !== undefined) patch.brand_id = data.brandId;

    const { error } = await context.supabase.from("campaigns").update(patch).eq("id", data.id);

    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("campaigns").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Builds the strategy + calendar for a campaign with one structured model call
 * and stores the result on the campaign row.
 */
export const planCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: campaign, error } = await context.supabase
      .from("campaigns")
      .select("id, workspace_id, name, objective, channels, start_date, end_date, budget, brand_id")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!campaign) throw new Error("Campaign not found.");

    const { assertQuota, recordUsage } = await import("./limits.server");
    await assertQuota(campaign.workspace_id, "contentRuns");

    let brandBlock = "";
    if (campaign.brand_id) {
      const { data: brand } = await context.supabase
        .from("brands")
        .select("name, product, audience, tone, brand_voice, goals, channels")
        .eq("id", campaign.brand_id)
        .maybeSingle();
      if (brand) {
        brandBlock = [
          `Brand: ${brand.name}`,
          brand.product && `Product: ${brand.product}`,
          brand.audience && `Audience: ${brand.audience}`,
          brand.tone && `Tone: ${brand.tone}`,
          brand.brand_voice && `Voice: ${brand.brand_voice}`,
          brand.goals && `Goals: ${brand.goals}`,
        ]
          .filter(Boolean)
          .join("\n");
      }
    }

    const { generateText, Output } = await import("ai");
    const { createLovableAiGatewayProvider, getLovableApiKey } = await import(
      "./ai-gateway.server"
    );
    const gateway = createLovableAiGatewayProvider(getLovableApiKey());

    const schema = z.object({
      positioning: z.string(),
      audience: z.string(),
      keyMessage: z.string(),
      channelMix: z.array(
        z.object({ channel: z.string(), role: z.string(), budgetShare: z.number() }),
      ),
      kpis: z.array(z.object({ name: z.string(), target: z.string() })),
      risks: z.array(z.string()),
      calendar: z.array(
        z.object({
          week: z.number(),
          date: z.string().nullable(),
          channel: z.string(),
          asset: z.string(),
          owner: z.string(),
        }),
      ),
    });

    const prompt = [
      `Campaign: ${campaign.name}`,
      campaign.objective ? `Objective: ${campaign.objective}` : "",
      campaign.channels?.length ? `Requested channels: ${campaign.channels.join(", ")}` : "",
      campaign.start_date ? `Starts: ${campaign.start_date}` : "",
      campaign.end_date ? `Ends: ${campaign.end_date}` : "",
      campaign.budget ? `Total budget: ${campaign.budget}` : "",
      brandBlock ? `\nBrand context:\n${brandBlock}` : "",
      "",
      "Build the plan. budgetShare values are percentages that sum to 100. Provide 8-16 calendar rows spread across the campaign window; use ISO dates when a window is given, otherwise null. Keep 3-6 KPIs with measurable targets and 2-4 concrete risks.",
    ]
      .filter(Boolean)
      .join("\n");

    const { output, usage } = await generateText({
      model: gateway("google/gemini-3.6-flash"),
      system:
        "You are a senior campaign strategist. Produce specific, executable plans grounded in the brief. No filler, no generic marketing language.",
      prompt,
      output: Output.object({ schema }),
    });

    const { calendar, ...strategy } = output;

    const { error: updErr } = await context.supabase
      .from("campaigns")
      .update({
        strategy: strategy as never,
        calendar: calendar as never,
        status: "active",
      })
      .eq("id", campaign.id);
    if (updErr) throw new Error(updErr.message);

    await recordUsage(campaign.workspace_id, "contentRuns", {
      input: usage?.inputTokens ?? 0,
      output: usage?.outputTokens ?? 0,
    });

    return { strategy: strategy as CampaignStrategy, calendar: calendar as CalendarItem[] };
  });

/** Generates one deliverable for a calendar row and links it to the campaign. */
export const generateCampaignAsset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        campaignId: z.string().uuid(),
        channel: z.string().trim().min(1).max(60),
        asset: z.string().trim().min(2).max(200),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: campaign, error } = await context.supabase
      .from("campaigns")
      .select("id, workspace_id, brand_id, name, objective, strategy")
      .eq("id", data.campaignId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!campaign) throw new Error("Campaign not found.");

    const { assertQuota, recordUsage } = await import("./limits.server");
    await assertQuota(campaign.workspace_id, "contentRuns");

    const kind =
      /email/i.test(data.channel) ? "email"
      : /blog|article|seo/i.test(data.asset) ? "blog"
      : /video|reel|tiktok|short/i.test(data.asset) ? "video_script"
      : /ad|paid|ppc/i.test(data.channel + data.asset) ? "ad_copy"
      : "social_post";

    const { data: run, error: runErr } = await context.supabase
      .from("content_runs")
      .insert({
        workspace_id: campaign.workspace_id,
        campaign_id: campaign.id,
        brand_id: campaign.brand_id,
        kind: kind as never,
        title: `${data.channel} — ${data.asset}`,
        input: { channel: data.channel, asset: data.asset } as never,
        status: "running",
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (runErr) throw new Error(runErr.message);

    try {
      const { generateText } = await import("ai");
      const { createLovableAiGatewayProvider, getLovableApiKey } = await import(
        "./ai-gateway.server"
      );
      const gateway = createLovableAiGatewayProvider(getLovableApiKey());
      const model = "google/gemini-3.6-flash";

      const { text, usage } = await generateText({
        model: gateway(model),
        system:
          "You are a senior marketing copywriter. Write the asset exactly as it should ship, in Markdown. Match the channel's format and length conventions. No preamble, no explanation of what you are doing.",
        prompt: [
          `Campaign: ${campaign.name}`,
          campaign.objective ? `Objective: ${campaign.objective}` : "",
          campaign.strategy
            ? `Strategy: ${JSON.stringify(campaign.strategy).slice(0, 3000)}`
            : "",
          `Channel: ${data.channel}`,
          `Deliverable: ${data.asset}`,
        ]
          .filter(Boolean)
          .join("\n"),
      });

      await context.supabase
        .from("content_runs")
        .update({
          status: "succeeded",
          output_text: text,
          model,
          tokens_input: usage?.inputTokens ?? 0,
          tokens_output: usage?.outputTokens ?? 0,
        })
        .eq("id", run.id);

      await context.supabase.from("artifacts").insert({
        workspace_id: campaign.workspace_id,
        brand_id: campaign.brand_id,
        kind,
        title: `${campaign.name}: ${data.asset}`,
        content: text,
        created_by: context.userId,
        metadata: { campaign_id: campaign.id, channel: data.channel } as never,
      });

      await recordUsage(campaign.workspace_id, "contentRuns", {
        input: usage?.inputTokens ?? 0,
        output: usage?.outputTokens ?? 0,
      });

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
