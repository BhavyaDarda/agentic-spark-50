import { expect, test } from "bun:test";
import { accountWorkspaceAction, savedOutput } from "./account-safety";

test("unknown member counts never authorize workspace deletion", () => {
  expect(() => accountWorkspaceAction(null, "owner", 1)).toThrow();
  expect(() => accountWorkspaceAction(0, "owner", 1)).toThrow();
});
test("sole-member workspaces can be removed", () => {
  expect(accountWorkspaceAction(1, "owner", 1)).toBe("delete");
});
test("shared workspaces retain an owner", () => {
  expect(() => accountWorkspaceAction(2, "owner", 1)).toThrow("Transfer ownership");
  expect(accountWorkspaceAction(2, "owner", 2)).toBe("leave");
  expect(accountWorkspaceAction(2, "member", null)).toBe("leave");
});
test("account output exports omit prompts and agent traces", () => {
  expect(savedOutput({ id: "saved", title: "Report", markdown: "Saved result", created_at: "date", prompt: "private", traces: ["private"], workspace_id: "private" })).toEqual({ id: "saved", title: "Report", markdown: "Saved result", createdAt: "date" });
});