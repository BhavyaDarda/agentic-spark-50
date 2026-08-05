// Server-only security utilities: sliding-window rate limits + append-only audit log.
// Use these in every mutating server function or API handler.
//
// Design:
//   - `rate_limits` uses a compound PK (workspace_id, bucket, window_start) so each
//     minute has its own row. We sum the last N minutes for a sliding window.
//   - `audit_log` is append-only from the app layer; readable only by workspace
//     owners/admins via RLS.
//   - Both tables have NO authenticated grants. Only `service_role` can touch them.
//     We construct a service-role client here — this file MUST NEVER be imported
//     from client code.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function serviceClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are required on the server for security utilities.",
    );
  }
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type RateLimitBucket =
  | "chat.message"
  | "chat.deep_research"
  | "content.generate"
  | "sponsor.click";

export interface RateLimitConfig {
  /** Number of requests allowed within `windowMinutes`. */
  limit: number;
  /** Sliding window size, in minutes. Minimum 1. */
  windowMinutes: number;
}

const DEFAULTS: Record<RateLimitBucket, RateLimitConfig> = {
  "chat.message": { limit: 60, windowMinutes: 1 },
  "chat.deep_research": { limit: 6, windowMinutes: 10 },
  "content.generate": { limit: 30, windowMinutes: 5 },
  "sponsor.click": { limit: 30, windowMinutes: 5 },
};

/**
 * Consume one token from a sliding-window rate limit.
 * Returns `{ ok: false, retryAfterSeconds }` when the limit is exceeded so the
 * caller can produce a 429 response.
 */
export async function consumeRateLimit(
  workspaceId: string,
  bucket: RateLimitBucket,
  cfg: RateLimitConfig = DEFAULTS[bucket],
): Promise<{ ok: true } | { ok: false; retryAfterSeconds: number }> {
  const sb = serviceClient();
  const now = new Date();
  const currentMinute = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      now.getUTCHours(),
      now.getUTCMinutes(),
    ),
  );
  const windowStart = new Date(currentMinute.getTime() - (cfg.windowMinutes - 1) * 60_000);

  const { data: rows, error } = await sb
    .from("rate_limits")
    .select("count, window_start")
    .eq("workspace_id", workspaceId)
    .eq("bucket", bucket)
    .gte("window_start", windowStart.toISOString());
  if (error) {
    // Fail open (log-only) — we do not want a rate-limit outage to block real work.
    console.error("[rate-limit] read failed", error);
    return { ok: true };
  }
  const total = (rows ?? []).reduce((n, r) => n + (r.count ?? 0), 0);
  if (total >= cfg.limit) {
    return { ok: false, retryAfterSeconds: cfg.windowMinutes * 60 };
  }
  const { error: upsertErr } = await sb.rpc("increment_rate_limit" as never, {
    p_workspace_id: workspaceId,
    p_bucket: bucket,
    p_window_start: currentMinute.toISOString(),
  } as never);
  if (upsertErr) {
    // Fallback to a naive upsert if the RPC isn't installed yet.
    const existing = (rows ?? []).find(
      (r) => new Date(r.window_start).getTime() === currentMinute.getTime(),
    );
    await sb
      .from("rate_limits")
      .upsert(
        {
          workspace_id: workspaceId,
          bucket,
          window_start: currentMinute.toISOString(),
          count: (existing?.count ?? 0) + 1,
        },
        { onConflict: "workspace_id,bucket,window_start" },
      );
  }
  return { ok: true };
}

export interface AuditEntry {
  workspaceId: string | null;
  actorId: string | null;
  event: string;
  targetTable?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/** Fire-and-forget audit write. Never throws — auditing must not break the request. */
export async function auditLog(entry: AuditEntry): Promise<void> {
  try {
    const sb = serviceClient();
    await sb.from("audit_log").insert({
      workspace_id: entry.workspaceId,
      actor_id: entry.actorId,
      event: entry.event,
      target_table: entry.targetTable ?? null,
      target_id: entry.targetId ?? null,
      metadata: (entry.metadata ?? {}) as never,
      ip_address: entry.ipAddress ?? null,
      user_agent: entry.userAgent ?? null,
    });
  } catch (e) {
    console.error("[audit] write failed", e);
  }
}

/** Best-effort extraction of client IP from a Request. */
export function clientIp(req: Request): string | null {
  const h = req.headers;
  return (
    h.get("cf-connecting-ip") ||
    h.get("x-real-ip") ||
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    null
  );
}
