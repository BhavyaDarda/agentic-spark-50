// Server-only sponsor selection and event recording.
//
// The whole product is free and ad-funded. Sponsors are stored in our own
// database and rendered server-side: no third-party ad scripts, no tracking
// pixels, no personal data leaving the app. Sponsors appear ONLY on public
// report pages — never inside a report body, never in the signed-in workspace.
//
// `sponsor_events` has no client grants at all, so impressions and clicks are
// written with the service-role client here. Never import this from client code.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export interface PublicSponsor {
  id: string;
  name: string;
  tagline: string;
  body: string | null;
  ctaLabel: string;
  destinationUrl: string;
  logoUrl: string | null;
  /** One rotating, editorial credit line in our own voice. */
  creditLine: string;
}

export interface SponsorAdminRow extends PublicSponsor {
  topicKeywords: string[];
  creditLines: string[];
  weight: number;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  impressions: number;
  clicks: number;
}

export type SponsorSurface = "report_source_card" | "report_credit" | "run_sponsorship";

/** Rotating house lines used when a sponsor ships no credit copy of its own. */
const HOUSE_CREDIT_LINES = [
  "This report was argued over by six robots and paid for by {name}.",
  "{name} covered the compute so this page could stay free and paywall-free.",
  "Reading this cost you nothing. It cost {name} slightly more than nothing.",
  "Sources checked by machines with no opinions. Bill footed by {name}.",
  "Free forever, thanks to {name}, who never got to touch a single finding.",
];

function serviceClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Server is missing Supabase service credentials.");
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function publicClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Server is missing Supabase public credentials.");
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

type SponsorRow = Database["public"]["Tables"]["sponsors"]["Row"];

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 3);
}

/**
 * Relevance is deliberately simple and explainable: how many of the sponsor's
 * own keywords show up in the report topic. A sponsor with zero keywords is a
 * house/untargeted sponsor and stays eligible at the lowest score.
 */
function relevance(sponsor: SponsorRow, topicTokens: Set<string>): number {
  const keywords = sponsor.topic_keywords ?? [];
  if (keywords.length === 0) return 0;
  let hits = 0;
  for (const kw of keywords) {
    const parts = tokenize(kw);
    if (parts.length > 0 && parts.every((p) => topicTokens.has(p))) hits++;
  }
  return hits;
}

function pickWeighted(rows: SponsorRow[]): SponsorRow | null {
  const total = rows.reduce((n, r) => n + Math.max(1, r.weight ?? 1), 0);
  if (total <= 0) return null;
  let ticket = Math.random() * total;
  for (const row of rows) {
    ticket -= Math.max(1, row.weight ?? 1);
    if (ticket <= 0) return row;
  }
  return rows[rows.length - 1] ?? null;
}

function creditLineFor(row: SponsorRow): string {
  const own = (row.credit_lines ?? []).filter((l) => l.trim().length > 0);
  const pool = own.length > 0 ? own : HOUSE_CREDIT_LINES;
  const line = pool[Math.floor(Math.random() * pool.length)] ?? HOUSE_CREDIT_LINES[0]!;
  return line.replaceAll("{name}", row.name);
}

function toPublic(row: SponsorRow): PublicSponsor {
  return {
    id: row.id,
    name: row.name,
    tagline: row.tagline,
    body: row.body,
    ctaLabel: row.cta_label,
    destinationUrl: row.destination_url,
    logoUrl: row.logo_url,
    creditLine: creditLineFor(row),
  };
}

/** Fire-and-forget event write. Never throws — ad bookkeeping must not break a page. */
export async function recordSponsorEvent(
  sponsorId: string,
  kind: "impression" | "click" | "run_sponsorship",
  surface: SponsorSurface,
  projectId?: string | null,
): Promise<void> {
  try {
    await serviceClient().from("sponsor_events").insert({
      sponsor_id: sponsorId,
      kind,
      surface,
      project_id: projectId ?? null,
    });
  } catch (e) {
    console.error("[sponsors] event write failed", e);
  }
}

/**
 * Select at most one sponsor for a public report, most relevant first with
 * weighted rotation inside the winning relevance tier. Returns `null` when no
 * sponsor is live — the page then renders no ad slot at all, by design.
 */
export async function selectSponsorForTopic(
  topic: string,
  surface: SponsorSurface,
  projectId?: string | null,
): Promise<PublicSponsor | null> {
  let rows: SponsorRow[] = [];
  try {
    // Public client + the "live sponsors" policy: only active, in-window rows.
    const { data, error } = await publicClient().from("sponsors").select("*");
    if (error) throw new Error(error.message);
    rows = data ?? [];
  } catch (e) {
    console.error("[sponsors] selection read failed", e);
    return null;
  }
  if (rows.length === 0) return null;

  const topicTokens = new Set(tokenize(topic));
  const scored = rows.map((r) => ({ row: r, score: relevance(r, topicTokens) }));
  const best = Math.max(...scored.map((s) => s.score));
  const tier = scored.filter((s) => s.score === best).map((s) => s.row);

  const picked = pickWeighted(tier);
  if (!picked) return null;

  await recordSponsorEvent(picked.id, "impression", surface, projectId);
  return toPublic(picked);
}

/** Admin-only listing with impression/click totals. Requires an already-authorized caller. */
export async function listSponsorsWithStats(): Promise<SponsorAdminRow[]> {
  const sb = serviceClient();
  const [{ data: rows, error }, { data: events }] = await Promise.all([
    sb.from("sponsors").select("*").order("created_at", { ascending: false }),
    sb.from("sponsor_events").select("sponsor_id, kind"),
  ]);
  if (error) throw new Error(error.message);

  const tally = new Map<string, { impressions: number; clicks: number }>();
  for (const ev of events ?? []) {
    const entry = tally.get(ev.sponsor_id) ?? { impressions: 0, clicks: 0 };
    if (ev.kind === "click") entry.clicks++;
    else entry.impressions++;
    tally.set(ev.sponsor_id, entry);
  }

  return (rows ?? []).map((row) => ({
    ...toPublic(row),
    topicKeywords: row.topic_keywords ?? [],
    creditLines: row.credit_lines ?? [],
    weight: row.weight,
    isActive: row.is_active,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    impressions: tally.get(row.id)?.impressions ?? 0,
    clicks: tally.get(row.id)?.clicks ?? 0,
  }));
}

export interface SponsorInput {
  id?: string;
  name: string;
  tagline: string;
  body?: string | null;
  ctaLabel: string;
  destinationUrl: string;
  logoUrl?: string | null;
  topicKeywords: string[];
  creditLines: string[];
  weight: number;
  isActive: boolean;
}

/** Create or update a sponsor. Requires an already-authorized admin caller. */
export async function saveSponsor(input: SponsorInput, actorId: string): Promise<string> {
  const sb = serviceClient();
  const payload = {
    name: input.name,
    tagline: input.tagline,
    body: input.body ?? null,
    cta_label: input.ctaLabel,
    destination_url: input.destinationUrl,
    logo_url: input.logoUrl ?? null,
    topic_keywords: input.topicKeywords,
    credit_lines: input.creditLines,
    weight: input.weight,
    is_active: input.isActive,
  };
  if (input.id) {
    const { error } = await sb.from("sponsors").update(payload).eq("id", input.id);
    if (error) throw new Error(error.message);
    return input.id;
  }
  const { data, error } = await sb
    .from("sponsors")
    .insert({ ...payload, created_by: actorId })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id;
}

export async function deleteSponsorById(id: string): Promise<void> {
  const { error } = await serviceClient().from("sponsors").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/** Resolve a sponsor's destination for a click, and record the click. */
export async function resolveSponsorClick(
  sponsorId: string,
  surface: SponsorSurface,
): Promise<string | null> {
  try {
    const { data } = await publicClient()
      .from("sponsors")
      .select("destination_url")
      .eq("id", sponsorId)
      .maybeSingle();
    if (!data) return null;
    await recordSponsorEvent(sponsorId, "click", surface);
    return data.destination_url;
  } catch (e) {
    console.error("[sponsors] click resolve failed", e);
    return null;
  }
}
