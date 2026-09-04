// Scheduled citation sweep. Called by a cron/scheduler, not by browsers.
//
// Security: this prefix bypasses site auth, so the handler authenticates the
// caller itself with a timing-safe comparison against CITATION_SWEEP_SECRET.
// Nothing user-supplied reaches the database beyond a bounded `limit`.
import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "crypto";
import { z } from "zod";

const bodySchema = z.object({ limit: z.number().int().min(1).max(20).optional() });

function authorized(request: Request): boolean {
  const secret = process.env["CITATION_SWEEP_SECRET"];
  if (!secret) return false;
  const provided =
    request.headers.get("x-sweep-secret") ??
    (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const Route = createFileRoute("/api/public/citation-sweep")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!authorized(request)) return new Response("Unauthorized", { status: 401 });

        const raw = await request.json().catch(() => ({}));
        const parsed = bodySchema.safeParse(raw);
        if (!parsed.success) return new Response("Invalid request", { status: 400 });

        const origin = process.env["PUBLIC_SITE_ORIGIN"] || new URL(request.url).origin;

        try {
          const { sweepCitations } = await import("@/lib/citations.server");
          const result = await sweepCitations(origin, parsed.data.limit ?? 5);
          return Response.json(result);
        } catch (e) {
          console.error("[citation-sweep] failed", e);
          return new Response("Sweep failed", { status: 500 });
        }
      },
    },
  },
});
