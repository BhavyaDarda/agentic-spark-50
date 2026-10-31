import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

function key() {
  const secret = process.env['MCP_CREDENTIAL_SECRET'];
  if (!secret) throw new Error("Connection encryption is not configured.");
  return createHash("sha256").update(secret).digest();
}
export function encryptMcp(value: unknown) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return `v1:${Buffer.concat([iv, cipher.getAuthTag(), data]).toString("base64")}`;
}
export function decryptMcp<T>(value: string): T {
  if (!value.startsWith("v1:")) throw new Error("Reconnect this server to secure its credentials.");
  const data = Buffer.from(value.slice(3), "base64");
  const decipher = createDecipheriv("aes-256-gcm", key(), data.subarray(0, 12));
  decipher.setAuthTag(data.subarray(12, 28));
  return JSON.parse(Buffer.concat([decipher.update(data.subarray(28)), decipher.final()]).toString("utf8")) as T;
}