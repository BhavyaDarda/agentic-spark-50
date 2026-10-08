// Scheduled Radar tick. Called by the scheduler, never by browsers.
// Authenticated with a timing-safe RADAR_SECRET check.
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/radar-tick")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { radarAuthorized, radarTick } = await import("@/lib/radar.server");
        if (!radarAuthorized(request)) return new Response("Unauthorized", { status: 401 });
        const origin = process.env["PUBLIC_SITE_ORIGIN"] || new URL(request.url).origin;
        try {
          return Response.json(await radarTick(origin));
        } catch (e) {
          console.error("[radar-tick] failed", e);
          return new Response("Tick failed", { status: 500 });
        }
      },
    },
  },
});
