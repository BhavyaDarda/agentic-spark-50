import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const authorizeMcpConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.from("mcp_connections").select("id,url,transport").eq("id", data.id).eq("user_id", context.userId).single();
    if (error || !row) throw new Error("Connection unavailable.");
    const request = getRequest();
    const url = new URL(request.url);
    const forwarded = url.hostname === "localhost" ? request.headers.get("x-forwarded-host") : null;
    const callback = new URL("/api/public/mcp-return", forwarded ? `https://${forwarded}` : url.origin);
    callback.searchParams.set("id", row.id);
    const { probeConnection } = await import("./mcp-oauth.server");
    const result = await probeConnection(row, context.userId, callback.toString());
    const { error: updateError } = await context.supabase.from("mcp_connections").update({ state: result.state, auth_url: result.authUrl, tool_count: result.toolCount, last_error: result.state === "failed" ? "Authorization failed. Check the server and retry." : null }).eq("id", row.id).eq("user_id", context.userId);
    if (updateError) throw new Error("Could not update connection status.");
    return result;
  });

export const completeMcpAuthorization = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid(), code: z.string().min(1).max(4000), state: z.string().min(1).max(200), issuer: z.string().url().optional() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.from("mcp_connections").select("id,url,transport,state").eq("id", data.id).eq("user_id", context.userId).single();
    if (error || !row || row.state !== "authenticating") throw new Error("Authorization is no longer pending.");
    const { connectionProvider, probeConnection } = await import("./mcp-oauth.server");
    const connection = await connectionProvider(row.id, context.userId);
    if (!connection.stored.state || connection.stored.state !== data.state || !connection.stored.redirectUrl) throw new Error("Authorization did not match. Reconnect.");
    const { auth } = await import("@ai-sdk/mcp");
    const { mcpFetch } = await import("./mcp-transport.server");
    try {
      const outcome = await auth(connection.provider, { serverUrl: row.url, authorizationCode: data.code, callbackState: data.state, callbackIssuer: data.issuer, fetchFn: mcpFetch });
      if (outcome !== "AUTHORIZED") throw new Error("Authorization incomplete");
      delete connection.stored.state;
      await connection.save();
      const result = await probeConnection(row, context.userId, connection.stored.redirectUrl);
      const { error: updateError } = await context.supabase.from("mcp_connections").update({ state: result.state, auth_url: null, tool_count: result.toolCount, last_error: result.state !== "ready" ? "The server could not be verified after authorization." : null }).eq("id", row.id).eq("user_id", context.userId);
      if (updateError || result.state !== "ready") throw new Error("Verification failed");
      return { ok: true };
    } catch {
      throw new Error("Could not finish authorization. Retry connecting this server.");
    }
  });