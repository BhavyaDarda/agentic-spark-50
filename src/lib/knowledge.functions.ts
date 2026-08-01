import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/** Split text into overlapping chunks on paragraph boundaries. */
function chunk(text: string, size = 1400, overlap = 160): string[] {
  const clean = text.replace(/\r/g, "").replace(/[ \t]+/g, " ").trim();
  if (clean.length <= size) return clean ? [clean] : [];
  const out: string[] = [];
  let start = 0;
  while (start < clean.length) {
    let end = Math.min(start + size, clean.length);
    if (end < clean.length) {
      const breakAt = clean.lastIndexOf("\n\n", end);
      if (breakAt > start + size * 0.5) end = breakAt;
    }
    out.push(clean.slice(start, end).trim());
    if (end >= clean.length) break;
    start = end - overlap;
  }
  return out.filter((c) => c.length > 40);
}

export const listKnowledge = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({ workspaceId: z.string().uuid(), brandId: z.string().uuid().nullable().optional() })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("documents")
      .select("id, title, source_type, source_url, metadata, created_at, content")
      .eq("workspace_id", data.workspaceId)
      .order("created_at", { ascending: false })
      .limit(500);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    // Group chunks back into the source the user added.
    const groups = new Map<
      string,
      {
        key: string;
        title: string;
        sourceType: string;
        sourceUrl: string | null;
        brandId: string | null;
        chunks: number;
        chars: number;
        createdAt: string;
        ids: string[];
      }
    >();
    for (const r of rows ?? []) {
      const meta = (r.metadata ?? {}) as { brand_id?: string; source_key?: string };
      if (data.brandId && meta.brand_id !== data.brandId) continue;
      if (data.brandId === null && meta.brand_id) continue;
      const key = meta.source_key ?? r.source_url ?? r.id;
      const existing = groups.get(key);
      if (existing) {
        existing.chunks += 1;
        existing.chars += r.content.length;
        existing.ids.push(r.id);
      } else {
        groups.set(key, {
          key,
          title: r.title ?? r.source_url ?? "Untitled source",
          sourceType: r.source_type,
          sourceUrl: r.source_url,
          brandId: meta.brand_id ?? null,
          chunks: 1,
          chars: r.content.length,
          createdAt: r.created_at,
          ids: [r.id],
        });
      }
    }
    return [...groups.values()];
  });

const AddInput = z
  .object({
    workspaceId: z.string().uuid(),
    brandId: z.string().uuid().nullable().optional(),
    title: z.string().trim().min(2).max(200).optional(),
    text: z.string().trim().max(200_000).optional(),
    url: z.string().trim().url().max(2000).optional(),
  })
  .refine((v) => Boolean(v.text || v.url), { message: "Provide pasted text or a URL." });

export const addKnowledgeSource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => AddInput.parse(d))
  .handler(async ({ data, context }) => {
    const { embed } = await import("./ai-gateway.server");
    const { auditLog } = await import("./security.server");

    let body = data.text ?? "";
    let title = data.title ?? "";

    if (data.url) {
      const parsed = new URL(data.url);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
        throw new Error("Only http(s) URLs can be imported.");
      }
      const res = await fetch(parsed.toString(), {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; MarketingAgent/2.0)" },
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) throw new Error(`Could not read that page (HTTP ${res.status}).`);
      const html = await res.text();
      title =
        title ||
        html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() ||
        parsed.hostname;
      body = html
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 120_000);
    }

    const pieces = chunk(body);
    if (pieces.length === 0) throw new Error("There was not enough readable text to store.");

    const sourceKey = crypto.randomUUID();
    const rows: {
      workspace_id: string;
      source_type: string;
      source_url: string | null;
      title: string;
      content: string;
      embedding: string;
      metadata: never;
    }[] = [];

    for (const [i, piece] of pieces.entries()) {
      const vector = await embed(piece);
      rows.push({
        workspace_id: data.workspaceId,
        source_type: data.url ? "web" : "pasted",
        source_url: data.url ?? null,
        title: title || "Pasted note",
        content: piece,
        embedding: vector as unknown as string,
        metadata: {
          brand_id: data.brandId ?? null,
          source_key: sourceKey,
          chunk_index: i,
          added_by: context.userId,
        } as never,
      });
    }

    const { error } = await context.supabase.from("documents").insert(rows);
    if (error) throw new Error(error.message);

    await auditLog({
      workspaceId: data.workspaceId,
      actorId: context.userId,
      event: "knowledge.source.added",
      targetTable: "documents",
      targetId: sourceKey,
      metadata: { chunks: pieces.length, url: data.url ?? null, brand_id: data.brandId ?? null },
    });

    return { sourceKey, chunks: pieces.length, title: title || "Pasted note" };
  });

export const deleteKnowledgeSource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({ workspaceId: z.string().uuid(), ids: z.array(z.string().uuid()).min(1).max(500) })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("documents")
      .delete()
      .eq("workspace_id", data.workspaceId)
      .in("id", data.ids);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Semantic search over workspace knowledge. Used by the UI; the agent has its own tool. */
export const searchKnowledge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        query: z.string().trim().min(2).max(500),
        limit: z.number().int().min(1).max(20).default(5),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { embed } = await import("./ai-gateway.server");
    const vector = await embed(data.query);
    const { data: rows, error } = await context.supabase.rpc("match_documents", {
      _workspace_id: data.workspaceId,
      query_embedding: vector as unknown as string,
      match_count: data.limit,
    });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });
