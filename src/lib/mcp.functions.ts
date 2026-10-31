// Model Context Protocol (MCP) connection management.
//
// This module lets a workspace connect external tool servers (MCP) and injects
// their tools into the chat agent. All secrets and probing happen server-side.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { assertCapacity } from "./limits.server";
import { mcpUrl, mcpToolName } from "./mcp-policy";

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
      .eq("workspace_id", data.workspaceId).eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { items: rows ?? [] };
  });

export const createMcpConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ConnectionInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertCapacity(data.workspaceId, "mcpServers");

    const url = mcpUrl(data.url);
    let toolCount = 0;
    let state: "ready" | "failed" = "ready";
    let lastError: string | null = null;

    const headers: Record<string, string> = {};
    if (data.apiKey) headers.Authorization = `Bearer ${data.apiKey}`;

    let client: Awaited<ReturnType<typeof createMCPClient>> | undefined;
    try {
      const { mcpFetch } = await import("./mcp-transport.server");
      client = await createMCPClient({ transport: { type: data.transport, url, headers, redirect: "error", fetch: mcpFetch } });
      const tools = await client.tools();
      toolCount = Object.keys(tools).length;
    } catch (e) {
      state = "failed";
      lastError = "The server could not be verified. Check its address and authorization, then retry.";
    } finally {
      await client?.close().catch(() => {});
    }

    const { data: row, error } = await context.supabase
      .from("mcp_connections")
      .insert({
        workspace_id: data.workspaceId,
        user_id: context.userId,
        name: data.name,
        url,
        transport: data.transport,
        state,
        last_error: lastError,
        tool_count: toolCount,
      })
      .select("id, name, url, transport, state, last_error, tool_count")
      .single();
    if (error) throw new Error(error.message);
    if (data.apiKey) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { encryptMcp } = await import("./mcp-crypto.server");
      const { error: secretError } = await supabaseAdmin.from("mcp_credentials").upsert({ connection_id: row.id, user_id: context.userId, ciphertext: encryptMcp({ bearer: data.apiKey }) });
      if (secretError) {
        await context.supabase.from("mcp_connections").delete().eq("id", row.id).eq("user_id", context.userId);
        throw new Error("Could not securely save this connection.");
      }
    }
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
      .eq("user_id", context.userId)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Load ready MCP tools for a workspace. Returns the merged tools and a cleanup
 *  function that must be called after the model turn finishes to close the
 *  underlying MCP clients. */
export async function loadMcpToolsForWorkspace(workspaceId: string, sb: SupabaseClient, userId: string) {
  const { data: rows, error } = await sb
    .from("mcp_connections")
    .select("id, name, url, transport, tool_count")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .eq("state", "ready");
  if (error || !rows || rows.length === 0) return { tools: {}, cleanup: async () => {} };

  const allTools: Record<string, unknown> = {};
  const clients: Awaited<ReturnType<typeof createMCPClient>>[] = [];

  const { connectionProvider } = await import("./mcp-oauth.server");
  const { mcpFetch } = await import("./mcp-transport.server");
  for (const row of rows) {
    let client: Awaited<ReturnType<typeof createMCPClient>> | undefined;
    try {
      const url = mcpUrl(row.url);
      const connection = await connectionProvider(row.id, userId);
      const credentials = connection.stored;
      const headers: Record<string, string> = {};
      if (credentials.bearer) headers.Authorization = `Bearer ${credentials.bearer}`;
      client = await createMCPClient({ transport: { type: row.transport as "http" | "sse", url, headers, authProvider: credentials.bearer ? undefined : connection.provider, redirect: "error", fetch: mcpFetch } });
      const tools = await client.tools();
      for (const [toolName, toolDef] of Object.entries(tools)) {
        const namespaced = mcpToolName(row.id, toolName);
        allTools[namespaced] = toolDef;
      }
      clients.push(client);
    } catch {
      await client?.close().catch(() => {});
      await sb.from("mcp_connections").update({ state: "failed", last_error: "Connection unavailable. Reconnect to verify access." }).eq("id", row.id).eq("user_id", userId);
    }
  }

  const cleanup = async () => {
    await Promise.all(clients.map((c) => c.close().catch(() => {})));
  };

  return { tools: allTools, cleanup };
}
