import { mcpUrl } from "./mcp-policy";

/** Bound fetch for Workers; credentials never follow a redirect. */
export const mcpFetch: typeof fetch = async (input, init) => {
  mcpUrl(input instanceof Request ? input.url : String(input));
  const response = await globalThis.fetch(input, { ...init, redirect: "manual", signal: init?.signal ?? AbortSignal.timeout(20_000) });
  if (response.status >= 300 && response.status < 400) throw new Error("MCP redirects are not supported.");
  return response;
};