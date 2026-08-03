// Web Crypto-based PKCE challenge polyfill for edge runtimes (Cloudflare Workers).
// Replaces the Node-only `pkce-challenge` package used by MCP OAuth helpers.

function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function randomVerifier(length = 128): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  let out = "";
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < length; i++) {
    out += chars[randomValues[i]! % chars.length];
  }
  return out;
}

export async function pkceChallenge(verifierLength = 128): Promise<{
  code_verifier: string;
  code_challenge: string;
}> {
  const code_verifier = randomVerifier(verifierLength);
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(code_verifier),
  );
  const code_challenge = base64UrlEncode(digest);
  return { code_verifier, code_challenge };
}

export default pkceChallenge;
