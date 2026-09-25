import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const sponsorInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(80),
  tagline: z.string().trim().min(1).max(160),
  body: z.string().trim().max(400).optional().nullable(),
  ctaLabel: z.string().trim().min(1).max(40),
  destinationUrl: z.string().trim().url().max(500).refine((u) => /^https?:\/\//i.test(u), {
    message: "Destination must be an http(s) URL",
  }),
  logoUrl: z
    .string()
    .trim()
    .url()
    .max(500)
    .refine((u) => /^https:\/\//i.test(u), { message: "Logo must be served over https" })
    .optional()
    .nullable(),
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
        projectId: z.string().uuid().nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { resolveSponsorClick } = await import("@/lib/sponsors.server");
    const { currentVisitor } = await import("@/lib/visitor.server");
    const url = await resolveSponsorClick(
      data.sponsorId,
      data.surface,
      currentVisitor(),
      data.projectId ?? null,
    );
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
    const { auditLog } = await import("@/lib/security.server");
    const id = await saveSponsor(data, context.userId);
    await auditLog({
      workspaceId: null,
      actorId: context.userId,
      event: data.id ? "sponsor.updated" : "sponsor.created",
      targetTable: "sponsors",
      targetId: id,
      metadata: { name: data.name, isActive: data.isActive, weight: data.weight },
    });
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
    const { auditLog } = await import("@/lib/security.server");
    await deleteSponsorById(data.id);
    await auditLog({
      workspaceId: null,
      actorId: context.userId,
      event: "sponsor.deleted",
      targetTable: "sponsors",
      targetId: data.id,
    });
    return { ok: true };
  });

/** Signed-in: offer a sponsor to cover a deeper research run (opt-in, pre-run). */
export const getRunSponsorOffer = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ topic: z.string().trim().min(1).max(400) }).parse(d))
  .handler(async ({ data }) => {
    const { selectSponsorForTopic } = await import("@/lib/sponsors.server");
    const { currentVisitor } = await import("@/lib/visitor.server");
    const sponsor = await selectSponsorForTopic(
      data.topic,
      "run_sponsorship",
      null,
      currentVisitor(),
    );
    return { sponsor };
  });

/**
 * Signed-in: the user accepted a sponsored run. The project is upgraded to
 * "deep" depth (more queries, more pages read) — that extra compute is what
 * the sponsor's placement pays for — and the acceptance is recorded.
 */
export const acceptRunSponsorship = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ sponsorId: z.string().uuid(), projectId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    // RLS: only workspace members can update the project. If nothing comes
    // back the caller does not own it, and no event is recorded.
    const { data: updated, error } = await context.supabase
      .from("research_projects")
      .update({ depth: "deep" })
      .eq("id", data.projectId)
      .select("id, depth")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!updated) throw new Error("Project not found.");

    const { recordSponsorEvent } = await import("@/lib/sponsors.server");
    await recordSponsorEvent(
      data.sponsorId,
      "run_sponsorship",
      "run_sponsorship",
      data.projectId,
      { hash: `user:${context.userId}`, isBot: false },
    );
    return { ok: true as const, depth: updated.depth };
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

const inquirySchema = z.object({
  company: z.string().trim().min(2).max(120),
  contactName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255),
  website: z
    .string()
    .trim()
    .max(300)
    .refine((v) => v === "" || /^https?:\/\/[^\s]+\.[^\s]+$/i.test(v), {
      message: "Website must start with http:// or https://",
    })
    .optional(),
  budgetRange: z.enum(["under_1k", "1k_5k", "5k_20k", "20k_plus", "undecided"]),
  topics: z.array(z.string().trim().min(2).max(60)).max(15),
  message: z.string().trim().min(20).max(2000),
  /** Honeypot: real people never fill this. */
  company_url_confirm: z.string().max(0).optional(),
});

export type SponsorInquiryInput = z.infer<typeof inquirySchema>;

/**
 * Public: a prospective sponsor asks to advertise. Stored server-side only
 * (no client can read the table), throttled per visitor, honeypot-protected.
 */
export const submitSponsorInquiry = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => inquirySchema.parse(d))
  .handler(async ({ data }) => {
    const { currentVisitor } = await import("@/lib/visitor.server");
    const visitor = currentVisitor();
    const { createClient } = await import("@supabase/supabase-js");
    const url = process.env["SUPABASE_URL"];
    const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
    if (!url || !key) throw new Error("Server is not configured for inquiries.");
    const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

    if (visitor.hash) {
      const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { count } = await sb
        .from("sponsor_inquiries")
        .select("id", { count: "exact", head: true })
        .eq("ip_hash", visitor.hash)
        .gte("created_at", since);
      if ((count ?? 0) >= 3) {
        throw new Error("You have sent several inquiries recently. Please try again in an hour.");
      }
    }

    const { error } = await sb.from("sponsor_inquiries").insert({
      company: data.company,
      contact_name: data.contactName,
      email: data.email,
      website: data.website || null,
      budget_range: data.budgetRange,
      topics: data.topics,
      message: data.message,
      ip_hash: visitor.hash,
    });
    if (error) throw new Error("Could not save your inquiry. Please try again.");
    return { ok: true as const };
  });

/** Admin-only: sponsor inquiries, newest first. */
export const listSponsorInquiries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("sponsor_inquiries")
      .select("id, company, contact_name, email, website, budget_range, topics, message, status, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return { inquiries: data ?? [] };
  });

/** Admin-only: mark an inquiry as contacted or closed. */
export const setSponsorInquiryStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), status: z.enum(["new", "contacted", "closed"]) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("sponsor_inquiries")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
