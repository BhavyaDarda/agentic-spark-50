import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { z } from "zod";

export const CONTACT_KINDS = ["support", "security", "privacy", "legal", "press", "other"] as const;
export type ContactKind = (typeof CONTACT_KINDS)[number];

const contactSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255),
  kind: z.enum(CONTACT_KINDS),
  subject: z.string().trim().min(3).max(160),
  message: z.string().trim().min(20).max(4000),
  /** Honeypot: real people never fill this. */
  website: z.string().max(0).optional(),
});

export type ContactInput = z.infer<typeof contactSchema>;

/**
 * Public contact form. Messages are stored in a table no client role can read;
 * platform admins review them in the app. Throttled per visitor per hour.
 */
export const submitContactMessage = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => contactSchema.parse(d))
  .handler(async ({ data }) => {
    const { currentVisitor } = await import("@/lib/visitor.server");
    const visitor = currentVisitor();
    const { supabaseAdmin: sb } = await import("@/integrations/supabase/client.server");

    if (visitor.hash) {
      const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { count } = await sb
        .from("contact_messages")
        .select("id", { count: "exact", head: true })
        .eq("ip_hash", visitor.hash)
        .gte("created_at", since);
      if ((count ?? 0) >= 5) {
        throw new Error("You have sent several messages recently. Please try again in an hour.");
      }
    }

    const { error } = await sb.from("contact_messages").insert({
      name: data.name,
      email: data.email,
      kind: data.kind,
      subject: data.subject,
      message: data.message,
      ip_hash: visitor.hash,
    });
    if (error) throw new Error("Could not send your message. Please try again.");
    return { ok: true as const };
  });

async function assertAdmin(context: { supabase: SupabaseClient<Database>; userId: string }) {
  const { data: isAdmin } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!isAdmin) throw new Error("Forbidden");
}

/** Admin-only: contact messages, newest first. */
export const listContactMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("contact_messages")
      .select("id, name, email, kind, subject, message, status, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return { messages: data ?? [] };
  });

/** Admin-only: mark a contact message as replied or closed. */
export const setContactMessageStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), status: z.enum(["new", "replied", "closed"]) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("contact_messages")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
