import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const BrandInput = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().trim().min(1).max(120),
  product: z.string().trim().max(500).optional().or(z.literal("")),
  audience: z.string().trim().max(500).optional().or(z.literal("")),
  tone: z.string().trim().max(200).optional().or(z.literal("")),
  goals: z.string().trim().max(1000).optional().or(z.literal("")),
  channels: z.array(z.string()).max(20).optional(),
  brand_voice: z.string().trim().max(1000).optional().or(z.literal("")),
  website: z.string().trim().max(300).optional().or(z.literal("")),
});

export const listBrands = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ workspaceId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("brands")
      .select("*")
      .eq("workspace_id", data.workspaceId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getBrand = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("brands")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const createBrand = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => BrandInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("brands")
      .insert({
        workspace_id: data.workspaceId,
        name: data.name,
        product: data.product || null,
        audience: data.audience || null,
        tone: data.tone || null,
        goals: data.goals || null,
        channels: data.channels ?? [],
        brand_voice: data.brand_voice || null,
        website: data.website || null,
        created_by: context.userId,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateBrand = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    BrandInput.extend({ id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { id, workspaceId, ...rest } = data;
    const { error } = await context.supabase
      .from("brands")
      .update({
        name: rest.name,
        product: rest.product || null,
        audience: rest.audience || null,
        tone: rest.tone || null,
        goals: rest.goals || null,
        channels: rest.channels ?? [],
        brand_voice: rest.brand_voice || null,
        website: rest.website || null,
      })
      .eq("id", id)
      .eq("workspace_id", workspaceId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteBrand = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("brands").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
