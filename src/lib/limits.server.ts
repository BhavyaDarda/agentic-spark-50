// Server-only allowance + usage metering.
//
// The product is free for everyone and funded by sponsors on public reports, so
// these numbers are ABUSE GUARDS, not a paywall: they exist to stop one
// workspace from burning the shared compute budget, and every tier gets the
// same generous ceiling. There is no upgrade path to sell.
//
// `usage_counters` has no `authenticated` write grants (read-only via RLS), so
// every increment goes through the service-role client here. This file must
// never be imported from client code.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type PlanTier = "free" | "pro" | "team";

export interface PlanLimits {
  label: string;
  contentRuns: number;
  researchRuns: number;
  brands: number;
  seats: number;
  mcpServers: number;
}

/** One generous allowance, applied to every workspace regardless of stored tier. */
export const FREE_ALLOWANCE: PlanLimits = {
  label: "Free",
  contentRuns: 500,
  researchRuns: 100,
  brands: 10,
  seats: 10,
  mcpServers: 10,
};

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  free: FREE_ALLOWANCE,
  pro: FREE_ALLOWANCE,
  team: FREE_ALLOWANCE,
};

export type Meter = "contentRuns" | "researchRuns";

const METER_COLUMN: Record<Meter, "content_runs" | "research_runs"> = {
  contentRuns: "content_runs",
  researchRuns: "research_runs",
};

/** Thrown when a workspace has burned through this month's fair-use allowance. */
export class QuotaError extends Error {
  constructor(
    public meter: Meter,
    public plan: PlanTier,
    public limit: number,
  ) {
    // Prefixed so the client can detect it after crossing the RPC boundary.
    super(
      `QUOTA_EXCEEDED: Fair-use limit reached — ${limit} ${
        meter === "contentRuns" ? "generations" : "research runs"
      } per month. It resets at the start of next month. Nothing to buy; this only exists to keep the free tier alive for everyone.`,
    );
    this.name = "QuotaError";
  }
}

export function isQuotaMessage(message: string): boolean {
  return message.startsWith("QUOTA_EXCEEDED:");
}

function serviceClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Server is missing Supabase service credentials.");
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** First day of the current UTC month, as a `date` string. */
export function currentPeriod(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

export function periodResetsAt(): string {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)).toISOString();
}

export interface UsageSnapshot {
  plan: PlanTier;
  limits: PlanLimits;
  period: string;
  resetsAt: string;
  used: { contentRuns: number; researchRuns: number; tokensIn: number; tokensOut: number };
  counts: { brands: number; seats: number; mcpServers: number };
}

export async function usageSnapshot(workspaceId: string): Promise<UsageSnapshot> {
  const sb = serviceClient();
  const period = currentPeriod();

  const [ws, usage, brands, seats, mcp] = await Promise.all([
    sb.from("workspaces").select("plan").eq("id", workspaceId).maybeSingle(),
    sb
      .from("usage_counters")
      .select("content_runs, research_runs, tokens_input, tokens_output")
      .eq("workspace_id", workspaceId)
      .eq("period_month", period)
      .maybeSingle(),
    sb.from("brands").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId),
    sb
      .from("workspace_members")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId),
    sb
      .from("mcp_connections")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId),
  ]);

  const plan = (ws.data?.plan as PlanTier | undefined) ?? "free";
  return {
    plan,
    limits: PLAN_LIMITS[plan],
    period,
    resetsAt: periodResetsAt(),
    used: {
      contentRuns: usage.data?.content_runs ?? 0,
      researchRuns: usage.data?.research_runs ?? 0,
      tokensIn: Number(usage.data?.tokens_input ?? 0),
      tokensOut: Number(usage.data?.tokens_output ?? 0),
    },
    counts: {
      brands: brands.count ?? 0,
      seats: seats.count ?? 0,
      mcpServers: mcp.count ?? 0,
    },
  };
}

/** Throws `QuotaError` when the workspace has no remaining allowance. */
export async function assertQuota(workspaceId: string, meter: Meter): Promise<UsageSnapshot> {
  const snap = await usageSnapshot(workspaceId);
  const limit = snap.limits[meter];
  if (snap.used[meter] >= limit) throw new QuotaError(meter, snap.plan, limit);
  return snap;
}

/** Throws when adding one more row of `kind` would exceed the plan. */
export async function assertCapacity(
  workspaceId: string,
  kind: "brands" | "seats" | "mcpServers",
): Promise<void> {
  const snap = await usageSnapshot(workspaceId);
  const limit = snap.limits[kind];
  if (snap.counts[kind] >= limit) {
    const noun = kind === "brands" ? "brands" : kind === "seats" ? "seats" : "tool servers";
    throw new Error(
      `QUOTA_EXCEEDED: ${snap.plan} plan includes ${limit} ${noun}. Remove one or move to a higher plan.`,
    );
  }
}

export async function recordUsage(
  workspaceId: string,
  meter: Meter,
  tokens: { input?: number; output?: number } = {},
): Promise<void> {
  try {
    const sb = serviceClient();
    const period = currentPeriod();
    const { data: existing } = await sb
      .from("usage_counters")
      .select("content_runs, research_runs, tokens_input, tokens_output")
      .eq("workspace_id", workspaceId)
      .eq("period_month", period)
      .maybeSingle();

    const column = METER_COLUMN[meter];
    await sb.from("usage_counters").upsert(
      {
        workspace_id: workspaceId,
        period_month: period,
        content_runs: (existing?.content_runs ?? 0) + (column === "content_runs" ? 1 : 0),
        research_runs: (existing?.research_runs ?? 0) + (column === "research_runs" ? 1 : 0),
        tokens_input: Number(existing?.tokens_input ?? 0) + (tokens.input ?? 0),
        tokens_output: Number(existing?.tokens_output ?? 0) + (tokens.output ?? 0),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "workspace_id,period_month" },
    );
  } catch (e) {
    // Metering must never break a successful generation.
    console.error("[usage] record failed", e);
  }
}
