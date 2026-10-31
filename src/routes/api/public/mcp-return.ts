import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/mcp-return")({
  server: { handlers: { GET: ({ request }) => {
    const url = new URL(request.url);
    // This public page only relays a code; the signed-in opener validates
    // ownership and OAuth state before any credential exchange or data access.
    const result = { type: "reacher-mcp-oauth", id: url.searchParams.get("id"), code: url.searchParams.get("code"), state: url.searchParams.get("state"), issuer: url.searchParams.get("iss"), failed: !!url.searchParams.get("error") };
    const nonce = crypto.randomUUID();
    const json = JSON.stringify(result).replace(/</g, "\\u003c");
    return new Response(`<!doctype html><html><head><title>Connect account · REACHER AI</title></head><body><p>Returning to REACHER AI…</p><script nonce="${nonce}">if(window.opener){window.opener.postMessage(${json},window.location.origin);window.close();}</script></body></html>`, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "Content-Security-Policy": `default-src 'none'; script-src 'nonce-${nonce}'; frame-ancestors 'none'` } });
  } } },
});