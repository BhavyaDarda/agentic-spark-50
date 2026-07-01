// Client-callable server functions for conversations and messages.
// All queries run under the caller's Supabase JWT — RLS ensures workspace isolation.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const uuid = z.string().uuid();

export const listConversations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ workspaceId: uuid, includeArchived: z.boolean().optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("conversations")
      .select("id, title, pinned, archived, active_brand_id, last_message_at, created_at")
      .eq("workspace_id", data.workspaceId)
      .order("pinned", { ascending: false })
      .order("last_message_at", { ascending: false })
      .limit(200);
    if (!data.includeArchived) q = q.eq("archived", false);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getConversation = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: conv, error } = await context.supabase
      .from("conversations")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!conv) return null;
    const { data: messages, error: mErr } = await context.supabase
      .from("messages")
      .select("id, role, parts, model, created_at, eval_score")
      .eq("conversation_id", conv.id)
      .order("created_at", { ascending: true });
    if (mErr) throw new Error(mErr.message);
    return { conversation: conv, messages: messages ?? [] };
  });

export const createConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        workspaceId: uuid,
        title: z.string().trim().max(140).optional(),
        activeBrandId: uuid.nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("conversations")
      .insert({
        workspace_id: data.workspaceId,
        created_by: context.userId,
        title: data.title?.trim() || "New chat",
        active_brand_id: data.activeBrandId ?? null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const renameConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: uuid, title: z.string().trim().min(1).max(140) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("conversations")
      .update({ title: data.title })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setConversationPin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: uuid, pinned: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("conversations")
      .update({ pinned: data.pinned })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const archiveConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: uuid, archived: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("conversations")
      .update({ archived: data.archived })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("conversations").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listArtifacts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        workspaceId: uuid,
        kind: z.string().optional(),
        limit: z.number().int().min(1).max(100).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("artifacts")
      .select("id, kind, title, starred, created_at, brand_id, conversation_id, eval_score")
      .eq("workspace_id", data.workspaceId)
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 50);
    if (data.kind) q = q.eq("kind", data.kind);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });
