import { allowedWebhookUrl } from "./publishing";

export async function deliverWebhook(url: string, body: string, deliveryId: string, signingSecret?: string) {
  const destination = allowedWebhookUrl(url);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const headers = new Headers({ "Content-Type": "application/json", "X-Reacher-Delivery": deliveryId });
  if (signingSecret) {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey("raw", encoder.encode(signingSecret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(`${timestamp}.${body}`));
    headers.set("X-Reacher-Timestamp", timestamp);
    headers.set("X-Reacher-Signature", `sha256=${Array.from(new Uint8Array(signature), b => b.toString(16).padStart(2, "0")).join("")}`);
  }
  try {
    const response = await fetch(destination, { method: "POST", headers, body, redirect: "manual", signal: AbortSignal.timeout(15_000) });
    await response.body?.cancel();
    return { ok: response.ok, status: response.status, message: response.ok
      ? "The receiving service accepted the output."
      : response.status >= 300 && response.status < 400
        ? "The receiving service redirected the request. Nothing was forwarded."
        : `The receiving service rejected the request (HTTP ${response.status}).` };
  } catch {
    return { ok: false, status: null, message: "Delivery could not be confirmed. Check the receiving service before trying again to avoid duplicates." };
  }
}