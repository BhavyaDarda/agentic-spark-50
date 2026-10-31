import { expect, test } from "bun:test";
import { mcpUrl, mcpToolName } from "./mcp-policy";

test("MCP bearer connections require public HTTPS without embedded credentials", () => {
  expect(mcpUrl("https://mcp.notion.com/mcp")).toBe("https://mcp.notion.com/mcp");
  for (const url of ["http://mcp.notion.com/mcp", "https://localhost/mcp", "https://127.0.0.1/mcp", "https://user:secret@mcp.notion.com/mcp"]) expect(() => mcpUrl(url)).toThrow();
});
test("connection IDs prevent duplicate display names from colliding", () => {
  expect(mcpToolName("1111", "search")).not.toBe(mcpToolName("2222", "search"));
  expect(mcpToolName("1111", "search.with spaces")).toMatch(/^[a-zA-Z0-9_-]+$/);
});