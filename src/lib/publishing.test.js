import { describe, expect, test } from "bun:test";
import { allowedWebhookUrl, exportPayload } from "./publishing";
import { deliverWebhook } from "./publishing.server";

describe("webhook safety", () => {
  test("permits only HTTPS hosted automation receivers", () => {
    expect(allowedWebhookUrl("https://hooks.zapier.com/hooks/catch/1/abc/").hostname).toBe("hooks.zapier.com");
    expect(allowedWebhookUrl("https://hook.eu2.make.com/abc").hostname).toBe("hook.eu2.make.com");
    for (const url of ["http://webhook.site/a", "https://localhost/a", "https://10.0.0.1/a", "https://hooks.zapier.com.evil.com/a", "https://user:pass@webhook.site/a", "https://webhook.site:8443/a", "https://webhook.site/"]) expect(() => allowedWebhookUrl(url)).toThrow();
  });
  test("exports only chosen output fields, never workspace material", () => {
    const body = JSON.parse(exportPayload("research", { id: "run", title: "Real topic", markdown: "Saved report [1]", workspace_id: "private", prompt: "private prompt" }, "delivery", "date"));
    expect(body.document).toEqual({ id: "run", title: "Real topic", markdown: "Saved report [1]", summary: null });
    expect(JSON.stringify(body)).not.toContain("private");
  });
  test("rejects empty and oversized documents", () => {
    expect(() => exportPayload("content", { id: "a", title: "b", markdown: " " }, "d", "t")).toThrow();
    expect(() => exportPayload("content", { id: "a", title: "b", markdown: "a".repeat(512001) }, "d", "t")).toThrow();
  });
  test("signs the exact body and refuses redirects", async () => {
    const original = globalThis.fetch; let calls = 0;
    globalThis.fetch = async (_url, init) => {
      calls++; expect(init.redirect).toBe("manual");
      const headers = new Headers(init.headers);
      const key = await crypto.subtle.importKey("raw", new TextEncoder().encode("test-secret-at-least-16"), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
      const signature = headers.get("X-Reacher-Signature").slice(7);
      expect(await crypto.subtle.verify("HMAC", key, Uint8Array.from(signature.match(/../g), h => parseInt(h, 16)), new TextEncoder().encode(`${headers.get("X-Reacher-Timestamp")}.${init.body}`))).toBe(true);
      return new Response(null, { status: 302, headers: { location: "http://127.0.0.1" } });
    };
    try { expect((await deliverWebhook("https://webhook.site/a", "actual-body", "receipt", "test-secret-at-least-16")).ok).toBe(false); expect(calls).toBe(1); }
    finally { globalThis.fetch = original; }
  });
});