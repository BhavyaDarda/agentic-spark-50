import { assertSafeExternalUrl } from "./ssrf.server";

export function mcpUrl(input: string) {
  const url = assertSafeExternalUrl(input);
  if (url.protocol !== "https:") throw new Error("MCP connections require HTTPS.");
  if (url.hash) throw new Error("Remove the fragment from the MCP URL.");
  return url.toString();
}

export function mcpToolName(id: string, name: string) {
  return `mcp_${id.replace(/-/g, "")}_${name.replace(/[^a-zA-Z0-9_-]/g, "_")}`.slice(0, 64);
}