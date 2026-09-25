import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { PublicReport } from "@/lib/public-report.server";

/** Public: fetch a shared research report by slug. No auth, no bearer token. */
export const getPublicReport = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z
      .object({ slug: z.string().trim().min(1).max(120).regex(/^[a-z0-9-]+$/i) })
      .parse(d),
  )
  .handler(async ({ data }): Promise<{ report: PublicReport | null }> => {
    const { loadPublicReport } = await import("@/lib/public-report.server");
    const { currentVisitor } = await import("@/lib/visitor.server");
    const report = await loadPublicReport(data.slug, currentVisitor());
    return { report };
  });
