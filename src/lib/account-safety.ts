export function accountWorkspaceAction(memberCount: number | null, role: string, ownerCount: number | null) {
  if (memberCount === null || !Number.isInteger(memberCount) || memberCount < 1) {
    throw new Error("Could not verify workspace membership. Your account was not deleted.");
  }
  if (memberCount === 1) return "delete" as const;
  if (role === "owner" && (ownerCount === null || ownerCount < 2)) {
    throw new Error("Transfer ownership of your shared workspace in Settings → Team before deleting your account.");
  }
  return "leave" as const;
}

export function savedOutput(row: { id: string; title: string | null; markdown: string | null; created_at: string }) {
  return { id: row.id, title: row.title, markdown: row.markdown, createdAt: row.created_at };
}