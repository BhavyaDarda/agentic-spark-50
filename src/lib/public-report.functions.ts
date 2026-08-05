import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { PublicReport } from "@/lib/public-report.server";

/** Public: fetch a shared research report by slug. No auth, no bearer token. */
export const getPublicReport = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ slug: z.string().trim().min(1).max(120) }).parse(d))
  .handler(async ({ data }): Promise<{ report: PublicReport | null }> => {
    const { loadPublicReport } = await import("@/lib/public-report.server");
    const report = await loadPublicReport(data.slug);
    return { report };
  });
