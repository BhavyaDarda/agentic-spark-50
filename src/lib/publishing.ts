import { z } from "zod";

// Restrict delivery to hosted automation receivers: arbitrary hosts would need
// DNS-pinned egress to rule out private-network targets and rebinding.
export function allowedWebhookUrl(input: string): URL {
  const url = new URL(input);
  const host = url.hostname.toLowerCase();
  const allowed = host === "hooks.zapier.com" || host === "webhook.site" ||
    /^hook(?:\.[a-z0-9-]+)?\.make\.com$/.test(host);
  if (url.protocol !== "https:" || url.port || url.username || url.password || url.hash || !allowed) {
    throw new Error("Use an HTTPS webhook from Zapier, Make, or Webhook.site. Other hosts are not supported yet.");
  }
  if (url.pathname === "/") throw new Error("Enter the complete webhook address.");
  return url;
}

export const WebhookInput = z.object({
  source: z.enum(["content", "research"]),
  id: z.string().uuid(),
  url: z.string().trim().max(2048).refine((v) => {
    try { allowedWebhookUrl(v); return true; } catch { return false; }
  }, "Use a complete HTTPS webhook from Zapier, Make, or Webhook.site."),
  signingSecret: z.string().min(16).max(256).optional(),
});

export function exportPayload(source: "content" | "research", row: {
  id: string; title: string; markdown: string; summary?: string | null;
}, deliveryId: string, createdAt: string) {
  if (!row.markdown.trim()) throw new Error("No completed output to send.");
  const payload = { event: `${source}.exported`, version: 1, deliveryId, createdAt,
    document: { id: row.id, title: row.title, markdown: row.markdown, summary: row.summary ?? null } };
  const body = JSON.stringify(payload);
  if (new TextEncoder().encode(body).byteLength > 512_000) throw new Error("This output is too large to send by webhook.");
  return body;
}