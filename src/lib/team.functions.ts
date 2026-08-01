import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const WorkspaceId = z.object({ workspaceId: z.string().uuid() });
const Role = z.enum(["owner", "admin", "member"]);

/** Throws unless the caller is owner/admin of the workspace. */
async function requireAdmin(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  userId: string,
) {
  const { data, error } = await supabase.rpc("workspace_role_of", {
    _workspace_id: workspaceId,
    _user_id: userId,
  });
  if (error) throw new Error(error.message);
  const role = data as "owner" | "admin" | "member" | null;
  if (role !== "owner" && role !== "admin") {
    throw new Error("Only workspace owners and admins can manage the team.");
  }
  return role;
}


export const listTeam = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => WorkspaceId.parse(d))
  .handler(async ({ data, context }) => {
    const { memberProfiles } = await import("./team.server");

    const { data: members, error } = await context.supabase
      .from("workspace_members")
      .select("id, user_id, role, created_at")
      .eq("workspace_id", data.workspaceId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);

    const profiles = await memberProfiles((members ?? []).map((m) => m.user_id));
    const byId = new Map(profiles.map((p) => [p.id, p]));

    const { data: invites } = await context.supabase
      .from("workspace_invites")
      .select("id, email, role, created_at, expires_at, accepted_at")
      .eq("workspace_id", data.workspaceId)
      .is("accepted_at", null)
      .order("created_at", { ascending: false });

    const myRole = (members ?? []).find((m) => m.user_id === context.userId)?.role ?? null;

    return {
      myRole: myRole as "owner" | "admin" | "member" | null,
      members: (members ?? []).map((m) => ({
        id: m.id,
        userId: m.user_id,
        role: m.role as "owner" | "admin" | "member",
        joinedAt: m.created_at,
        email: byId.get(m.user_id)?.email ?? null,
        fullName: byId.get(m.user_id)?.fullName ?? null,
        isSelf: m.user_id === context.userId,
      })),
      invites: (invites ?? []).map((i) => ({
        id: i.id,
        email: i.email,
        role: i.role as "owner" | "admin" | "member",
        createdAt: i.created_at,
        expiresAt: i.expires_at,
      })),
    };
  });

export const inviteMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        email: z.string().trim().toLowerCase().email().max(255),
        role: z.enum(["admin", "member"]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, data.workspaceId, context.userId);

    const { assertCapacity } = await import("./limits.server");
    await assertCapacity(data.workspaceId, "seats");

    const { newInviteToken } = await import("./team.server");
    const { auditLog } = await import("./security.server");

    const token = newInviteToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();

    const { data: row, error } = await context.supabase
      .from("workspace_invites")
      .insert({
        workspace_id: data.workspaceId,
        email: data.email,
        role: data.role,
        token,
        invited_by: context.userId,
        expires_at: expiresAt,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    await auditLog({
      workspaceId: data.workspaceId,
      actorId: context.userId,
      event: "team.invite.created",
      targetTable: "workspace_invites",
      targetId: row.id,
      metadata: { email: data.email, role: data.role },
    });

    return { id: row.id, token, expiresAt };
  });

export const revokeInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ workspaceId: z.string().uuid(), inviteId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, data.workspaceId, context.userId);
    const { error } = await context.supabase
      .from("workspace_invites")
      .delete()
      .eq("id", data.inviteId)
      .eq("workspace_id", data.workspaceId);
    if (error) throw new Error(error.message);

    const { auditLog } = await import("./security.server");
    await auditLog({
      workspaceId: data.workspaceId,
      actorId: context.userId,
      event: "team.invite.revoked",
      targetTable: "workspace_invites",
      targetId: data.inviteId,
    });
    return { ok: true };
  });

export const changeMemberRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        userId: z.string().uuid(),
        role: Role,
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const myRole = await requireAdmin(context.supabase, data.workspaceId, context.userId);
    if (data.role === "owner" && myRole !== "owner") {
      throw new Error("Only an owner can grant ownership.");
    }

    const { data: members, error: readErr } = await context.supabase
      .from("workspace_members")
      .select("user_id, role")
      .eq("workspace_id", data.workspaceId);
    if (readErr) throw new Error(readErr.message);

    const target = (members ?? []).find((m) => m.user_id === data.userId);
    if (!target) throw new Error("That person is not in this workspace.");
    const owners = (members ?? []).filter((m) => m.role === "owner");
    if (target.role === "owner" && data.role !== "owner" && owners.length <= 1) {
      throw new Error("A workspace needs at least one owner.");
    }

    const { error } = await context.supabase
      .from("workspace_members")
      .update({ role: data.role })
      .eq("workspace_id", data.workspaceId)
      .eq("user_id", data.userId);
    if (error) throw new Error(error.message);

    const { auditLog } = await import("./security.server");
    await auditLog({
      workspaceId: data.workspaceId,
      actorId: context.userId,
      event: "team.role.changed",
      targetTable: "workspace_members",
      targetId: data.userId,
      metadata: { from: target.role, to: data.role },
    });
    return { ok: true };
  });

export const removeMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ workspaceId: z.string().uuid(), userId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, data.workspaceId, context.userId);

    const { data: members } = await context.supabase
      .from("workspace_members")
      .select("user_id, role")
      .eq("workspace_id", data.workspaceId);
    const target = (members ?? []).find((m) => m.user_id === data.userId);
    if (!target) throw new Error("That person is not in this workspace.");
    if (target.role === "owner" && (members ?? []).filter((m) => m.role === "owner").length <= 1) {
      throw new Error("A workspace needs at least one owner.");
    }

    const { error } = await context.supabase
      .from("workspace_members")
      .delete()
      .eq("workspace_id", data.workspaceId)
      .eq("user_id", data.userId);
    if (error) throw new Error(error.message);

    const { auditLog } = await import("./security.server");
    await auditLog({
      workspaceId: data.workspaceId,
      actorId: context.userId,
      event: "team.member.removed",
      targetTable: "workspace_members",
      targetId: data.userId,
    });
    return { ok: true };
  });

export const peekInvite = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ token: z.string().min(20).max(120) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase.rpc("peek_workspace_invite", {
      _token: data.token,
    });
    if (error) throw new Error(error.message);
    const row = Array.isArray(rows) ? rows[0] : rows;
    if (!row) return null;
    return {
      workspaceId: row.workspace_id as string,
      workspaceName: row.workspace_name as string,
      email: row.email as string,
      role: row.role as "owner" | "admin" | "member",
      expired: row.expired as boolean,
      accepted: row.accepted as boolean,
    };
  });

export const acceptInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ token: z.string().min(20).max(120) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: workspaceId, error } = await context.supabase.rpc("accept_workspace_invite", {
      _token: data.token,
    });
    if (error) {
      const map: Record<string, string> = {
        invite_not_found: "This invitation link is not valid.",
        invite_already_used: "This invitation has already been used.",
        invite_expired: "This invitation has expired. Ask for a new one.",
        invite_email_mismatch: "This invitation was sent to a different email address.",
      };
      const key = Object.keys(map).find((k) => error.message.includes(k));
      throw new Error(key ? map[key]! : error.message);
    }
    return { workspaceId: workspaceId as string };
  });
