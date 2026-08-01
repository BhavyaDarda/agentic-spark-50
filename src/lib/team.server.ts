// Server-only helpers for team management: profile lookups and invite links.
// Never import from client code.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export function teamServiceClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Server is missing Supabase service credentials.");
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export interface MemberProfile {
  id: string;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
}

/** Resolve display info for member user ids. Callers MUST verify membership first. */
export async function memberProfiles(userIds: string[]): Promise<MemberProfile[]> {
  if (userIds.length === 0) return [];
  const sb = teamServiceClient();
  const { data, error } = await sb
    .from("profiles")
    .select("id, email, full_name, avatar_url")
    .in("id", userIds);
  if (error) throw new Error(error.message);
  return (data ?? []).map((p) => ({
    id: p.id,
    email: p.email,
    fullName: p.full_name,
    avatarUrl: p.avatar_url,
  }));
}

export function newInviteToken(): string {
  return `${crypto.randomUUID().replace(/-/g, "")}${crypto.randomUUID().replace(/-/g, "")}`;
}
