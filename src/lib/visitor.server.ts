// Server-only anonymous visitor fingerprint for sponsor bookkeeping.
//
// We never store IP addresses or user agents for sponsor events. Instead a
// one-way hash of (ip, user-agent, secret salt, UTC day) is kept so the same
// browser is counted once per day per sponsor. The salt rotates with the day,
// so hashes cannot be joined across days, and without the server-side salt the
// hash cannot be reversed or recomputed by anyone else.
import { createHash } from "crypto";
import { getRequest } from "@tanstack/react-start/server";
import { clientIp } from "@/lib/security.server";

export interface Visitor {
  /** 32-hex-char daily fingerprint, or null when the request has no client signal. */
  hash: string | null;
  /** True for crawlers, link previewers and command-line clients. */
  isBot: boolean;
}

const BOT_UA =
  /bot|crawl|spider|slurp|preview|fetch|curl|wget|python-requests|httpclient|headless|lighthouse|pingdom|monitor|facebookexternalhit|embedly|quora link|whatsapp|telegram|discord|slack|skype/i;

export function visitorFromRequest(request: Request | null | undefined): Visitor {
  if (!request) return { hash: null, isBot: false };
  const ua = request.headers.get("user-agent") ?? "";
  const ip = clientIp(request) ?? "";
  const isBot = !ua || BOT_UA.test(ua);
  if (!ip && !ua) return { hash: null, isBot };

  const salt = process.env["VISITOR_HASH_SALT"] ?? "";
  const day = new Date().toISOString().slice(0, 10);
  const hash = createHash("sha256")
    .update(`${ip}|${ua}|${salt}|${day}`)
    .digest("hex")
    .slice(0, 32);
  return { hash, isBot };
}

/** Convenience for server functions: read the current request, if any. */
export function currentVisitor(): Visitor {
  try {
    return visitorFromRequest(getRequest());
  } catch {
    return { hash: null, isBot: false };
  }
}
