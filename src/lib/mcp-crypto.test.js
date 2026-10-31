import { expect, test } from "bun:test";
import { encryptMcp, decryptMcp } from "./mcp-crypto.server";

test("MCP credentials are encrypted and authenticated, not stored as raw bearer values", () => {
  const previous = process.env.MCP_CREDENTIAL_SECRET;
  process.env.MCP_CREDENTIAL_SECRET = "test-only-encryption-secret-not-used-by-the-app";
  try {
    const ciphertext = encryptMcp({ bearer: "test-only-credential" });
    expect(ciphertext).not.toContain("test-only-credential");
    expect(decryptMcp(ciphertext)).toEqual({ bearer: "test-only-credential" });
    const bytes = Buffer.from(ciphertext.slice(3), "base64");
    bytes[15] ^= 1;
    expect(() => decryptMcp(`v1:${bytes.toString("base64")}`)).toThrow();
    expect(() => decryptMcp("legacy-plaintext")).toThrow("Reconnect");
  } finally {
    if (previous === undefined) delete process.env.MCP_CREDENTIAL_SECRET;
    else process.env.MCP_CREDENTIAL_SECRET = previous;
  }
});