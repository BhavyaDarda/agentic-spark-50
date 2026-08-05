// Server-only SSRF guard for every outbound fetch of a caller- or model-supplied
// URL. The Worker runtime has no DNS resolver, so we defend with a strict
// scheme/port/host policy plus IP-literal range checks, and we validate every
// redirect hop manually instead of letting fetch follow them blindly.

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata",
  "metadata.google.internal",
  "instance-data",
  "169.254.169.254",
  "[::1]",
  "::1",
]);

const BLOCKED_SUFFIXES = [
  ".localhost",
  ".local",
  ".internal",
  ".intranet",
  ".lan",
  ".home.arpa",
  ".test",
  ".localdomain",
];

const ALLOWED_PORTS = new Set(["", "80", "443", "8443"]);

function isPrivateIPv4(host: string): boolean {
  const parts = host.split(".");
  if (parts.length !== 4) return false;
  const nums = parts.map((p) => Number(p));
  if (nums.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  const [a, b] = nums as [number, number, number, number];
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true; // link-local / cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 192 && b === 0) return true; // 192.0.0.0/24, 192.0.2.0/24
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a >= 224) return true; // multicast + reserved
  return false;
}

function isPrivateIPv6(hostname: string): boolean {
  if (!hostname.startsWith("[")) return false;
  const ip = hostname.slice(1, -1).toLowerCase();
  if (ip === "::1" || ip === "::") return true;
  if (ip.startsWith("fe80") || ip.startsWith("fec0")) return true; // link/site-local
  const first = ip.split(":")[0] ?? "";
  if (/^f[cd]/.test(first)) return true; // fc00::/7 unique-local
  if (ip.startsWith("::ffff:")) {
    const mapped = ip.slice(7);
    return isPrivateIPv4(mapped);
  }
  return false;
}

export class UnsafeUrlError extends Error {
  constructor(reason: string) {
    super(`Blocked URL: ${reason}`);
    this.name = "UnsafeUrlError";
  }
}

/** Returns a normalized URL or throws `UnsafeUrlError`. */
export function assertSafeExternalUrl(input: string): URL {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new UnsafeUrlError("not a valid URL");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new UnsafeUrlError("only http(s) URLs are allowed");
  }
  if (url.username || url.password) throw new UnsafeUrlError("credentials in URL");
  if (!ALLOWED_PORTS.has(url.port)) throw new UnsafeUrlError("port not allowed");

  const host = url.hostname.toLowerCase();
  if (!host) throw new UnsafeUrlError("missing host");
  if (BLOCKED_HOSTNAMES.has(host)) throw new UnsafeUrlError("internal host");
  if (BLOCKED_SUFFIXES.some((s) => host.endsWith(s))) throw new UnsafeUrlError("internal host");
  if (!host.includes(".") && !host.startsWith("[")) throw new UnsafeUrlError("non-public host");
  if (isPrivateIPv4(host) || isPrivateIPv6(host)) {
    throw new UnsafeUrlError("private network address");
  }
  return url;
}

export function isSafeExternalUrl(input: string): boolean {
  try {
    assertSafeExternalUrl(input);
    return true;
  } catch {
    return false;
  }
}

/**
 * SSRF-safe fetch: validates the target and every redirect hop (max 5), never
 * letting the runtime follow a redirect into a private range.
 */
export async function safeFetch(input: string, init: RequestInit = {}): Promise<Response> {
  let current = assertSafeExternalUrl(input).toString();
  for (let hop = 0; hop < 5; hop++) {
    const res = await fetch(current, { ...init, redirect: "manual" });
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) return res;
      current = assertSafeExternalUrl(new URL(location, current).toString()).toString();
      continue;
    }
    return res;
  }
  throw new UnsafeUrlError("too many redirects");
}
