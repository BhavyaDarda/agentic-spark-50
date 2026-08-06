import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const sponsorInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(80),
  tagline: z.string().trim().min(1).max(160),
  body: z.string().trim().max(400).optional().nullable(),
  ctaLabel: z.string().trim().min(1).max(40),
  destinationUrl: z.string().trim().url().max(500),
  logoUrl: z.string().trim().url().max(500).optional().nullable(),
  topicKeywords: z.array(z.string().trim().min(2).max(60)).max(40),
  creditLines: z.array(z.string().trim().min(4).max(240)).max(10),
  weight: z.number().int().min(1).max(100),
  isActive: z.boolean(),
});

/** Public: record a sponsor click and hand back the vetted destination. */
export const clickSponsor = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        sponsorId: z.string().uuid(),
        surface: z.enum(["report_source_card", "report_credit", "run_sponsorship"]),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { resolveSponsorClick } = await import("@/lib/sponsors.server");
    const url = await resolveSponsorClick(data.sponsorId, data.surface);
    return { url };
  });

/** Admin-only: sponsors with impression/click totals. */
export const listSponsors = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { listSponsorsWithStats } = await import("@/lib/sponsors.server");
    return listSponsorsWithStats();
  });

export const upsertSponsor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => sponsorInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { saveSponsor } = await import("@/lib/sponsors.server");
    const id = await saveSponsor(data, context.userId);
    return { id };
  });

export const deleteSponsor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { deleteSponsorById } = await import("@/lib/sponsors.server");
    await deleteSponsorById(data.id);
    return { ok: true };
  });

/** Signed-in: offer a sponsor to cover a heavy research run (opt-in, pre-run). */
export const getRunSponsorOffer = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ topic: z.string().trim().min(1).max(400) }).parse(d))
  .handler(async ({ data }) => {
    const { selectSponsorForTopic } = await import("@/lib/sponsors.server");
    const sponsor = await selectSponsorForTopic(data.topic, "run_sponsorship");
    return { sponsor };
  });

/** Signed-in: the user accepted a sponsored run. Recorded, then the run proceeds deeper. */
export const acceptRunSponsorship = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ sponsorId: z.string().uuid(), projectId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data }) => {
    const { recordSponsorEvent } = await import("@/lib/sponsors.server");
    await recordSponsorEvent(data.sponsorId, "run_sponsorship", "run_sponsorship", data.projectId);
    return { ok: true };
  });

/** Signed-in: does the caller hold the platform admin role? UI-gating only. */
export const getIsPlatformAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    return { isAdmin: !!data };
  });
