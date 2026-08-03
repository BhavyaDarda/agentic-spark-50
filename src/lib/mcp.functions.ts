// Model Context Protocol (MCP) connection management.
//
// This module lets a workspace connect external tool servers (MCP) and injects
// their tools into the chat agent. All secrets and probing happen server-side.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { assertCapacity } from "./limits.server";
import { createMCPClient } from "@ai-sdk/mcp";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type SupabaseClient = ReturnType<typeof createClient<Database>>;

const ConnectionInput = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().trim().min(1).max(80),
  url: z.string().trim().url().max(2000),
  transport: z.enum(["http", "sse"]),
  apiKey: z.string().max(2000).optional(),
});

const ByIdInput = z.object({
  workspaceId: z.string().uuid(),
  id: z.string().uuid(),
});

export const listMcpConnections = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ workspaceId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("mcp_connections")
      .select("id, name, url, transport, state, auth_url, last_error, tool_count, created_at")
      .eq("workspace_id", data.workspaceId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { items: rows ?? [] };
  });

export const createMcpConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ConnectionInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertCapacity(data.workspaceId, "mcpServers");

    const parsedUrl = new URL(data.url);
    if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
      throw new Error("Only http(s) MCP servers are supported.");
    }

    let toolCount = 0;
    let state: "ready" | "failed" = "ready";
    let lastError: string | null = null;

    const headers: Record<string, string> = {};
    if (data.apiKey) headers.Authorization = `Bearer ${data.apiKey}`;

    const client = await createMCPClient({
      transport: {
        type: data.transport,
        url: data.url,
        headers,
        redirect: "error",
      },
    });

    try {
      const tools = await client.tools();
      toolCount = Object.keys(tools).length;
    } catch (e) {
      state = "failed";
      lastError = e instanceof Error ? e.message : String(e);
    } finally {
      await client.close().catch(() => {});
    }

    const { data: row, error } = await context.supabase
      .from("mcp_connections")
      .insert({
        workspace_id: data.workspaceId,
        user_id: context.userId,
        name: data.name,
        url: data.url,
        transport: data.transport,
        state,
        last_error: lastError,
        tool_count: toolCount,
        oauth_ciphertext: data.apiKey ?? null,
      })
      .select("id, name, url, transport, state, last_error, tool_count")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteMcpConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ByIdInput.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("mcp_connections")
      .delete()
      .eq("workspace_id", data.workspaceId)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Load ready MCP tools for a workspace. Returns the merged tools and a cleanup
 *  function that must be called after the model turn finishes to close the
 *  underlying MCP clients. */
export async function loadMcpToolsForWorkspace(workspaceId: string, sb: SupabaseClient) {
  const { data: rows, error } = await sb
    .from("mcp_connections")
    .select("id, name, url, transport, oauth_ciphertext, tool_count")
    .eq("workspace_id", workspaceId)
    .eq("state", "ready");
  if (error || !rows || rows.length === 0) return { tools: {}, cleanup: async () => {} };

  const allTools: Record<string, unknown> = {};
  const clients: Awaited<ReturnType<typeof createMCPClient>>[] = [];

  for (const row of rows) {
    const headers: Record<string, string> = {};
    if (row.oauth_ciphertext) headers.Authorization = `Bearer ${row.oauth_ciphertext}`;

    const client = await createMCPClient({
      transport: {
        type: row.transport as "http" | "sse",
        url: row.url,
        headers,
        redirect: "error",
      },
    });
    clients.push(client);

    const tools = await client.tools();
    const safeName = (row.name || "server").toLowerCase().replace(/[^a-z0-9]+/g, "_");
    for (const [toolName, toolDef] of Object.entries(tools)) {
      const namespaced = `${safeName}_${toolName}`;
      allTools[namespaced] = toolDef;
    }
  }

  const cleanup = async () => {
    await Promise.all(clients.map((c) => c.close().catch(() => {})));
  };

  return { tools: allTools, cleanup };
}
