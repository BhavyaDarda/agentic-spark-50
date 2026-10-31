import { createMCPClient, type OAuthClientProvider, type OAuthTokens, type OAuthClientInformation } from "@ai-sdk/mcp";
import { encryptMcp, decryptMcp } from "./mcp-crypto.server";
import { mcpFetch } from "./mcp-transport.server";
import { mcpUrl } from "./mcp-policy";

type StoredAuth = {
  bearer?: string;
  tokens?: OAuthTokens;
  client?: OAuthClientInformation;
  verifier?: string;
  state?: string;
  redirectUrl?: string;
};

export async function connectionProvider(id: string, userId: string, redirectUrl?: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: secret, error } = await supabaseAdmin.from("mcp_credentials").select("ciphertext").eq("connection_id", id).eq("user_id", userId).maybeSingle();
  if (error) throw new Error("Could not load connection authorization.");
  const stored = secret ? decryptMcp<StoredAuth>(secret.ciphertext) : {};
  if (redirectUrl) stored.redirectUrl = redirectUrl;
  const save = async () => {
    const { error } = await supabaseAdmin.from("mcp_credentials").upsert({ connection_id: id, user_id: userId, ciphertext: encryptMcp(stored), updated_at: new Date().toISOString() });
    if (error) throw new Error("Could not save connection authorization.");
  };
  let authUrl: string | undefined;
  const provider: OAuthClientProvider = {
    get redirectUrl() {
      if (!stored.redirectUrl) throw new Error("Reconnect to authorize this server.");
      return stored.redirectUrl;
    },
    get clientMetadata() {
      return { client_name: "REACHER AI", redirect_uris: [String(this.redirectUrl)], grant_types: ["authorization_code", "refresh_token"], response_types: ["code"], token_endpoint_auth_method: "none" };
    },
    tokens: () => stored.tokens,
    saveTokens: async (tokens) => { stored.tokens = tokens; await save(); },
    clientInformation: () => stored.client,
    isClientInformationDynamicallyRegistered: () => !!stored.client,
    saveClientInformation: async (client) => { stored.client = client; await save(); },
    redirectToAuthorization: async (url) => { authUrl = mcpUrl(String(url)); await save(); },
    saveCodeVerifier: async (value) => { stored.verifier = value; await save(); },
    codeVerifier: () => { if (!stored.verifier) throw new Error("Authorization expired. Reconnect."); return stored.verifier; },
    state: async () => { stored.state = crypto.randomUUID(); await save(); return stored.state; },
    storedState: () => stored.state,
    saveState: async (state) => { stored.state = state; await save(); },
    validateAuthorizationServerURL: (_server, url) => { mcpUrl(String(url)); },
    invalidateCredentials: async (scope) => {
      if (scope === "all" || scope === "tokens") delete stored.tokens;
      if (scope === "all" || scope === "client") delete stored.client;
      if (scope === "all" || scope === "verifier") delete stored.verifier;
      await save();
    },
  };
  return { provider, stored, authUrl: () => authUrl, save };
}

export async function probeConnection(row: { id: string; url: string; transport: string }, userId: string, redirectUrl: string) {
  const connection = await connectionProvider(row.id, userId, redirectUrl);
  let client: Awaited<ReturnType<typeof createMCPClient>> | undefined;
  try {
    const headers = connection.stored.bearer ? { Authorization: `Bearer ${connection.stored.bearer}` } : undefined;
    client = await createMCPClient({ transport: { type: row.transport as "http" | "sse", url: mcpUrl(row.url), headers, authProvider: headers ? undefined : connection.provider, redirect: "error", fetch: mcpFetch } });
    const tools = await client.tools();
    return { state: "ready" as const, authUrl: null, toolCount: Object.keys(tools).length };
  } catch {
    const authUrl = connection.authUrl();
    return { state: authUrl ? "authenticating" as const : "failed" as const, authUrl: authUrl ?? null, toolCount: 0 };
  } finally {
    await client?.close().catch(() => {});
  }
}