import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { clickSponsor } from "@/lib/sponsors.functions";
import type { PublicSponsor } from "@/lib/sponsors.server";

/**
 * One clearly labeled sponsor card. It sits beside the findings, never inside
 * them: sponsors cannot influence a report's sources, wording, or conclusions.
 * No third-party scripts, no pixels — the click goes through our own server so
 * the sponsor never sees the reader.
 */
export function SponsorUnit({
  sponsor,
  surface = "report_source_card",
  preview = false,
}: {
  sponsor: PublicSponsor;
  surface?: "report_source_card" | "report_credit";
  /** Renders the card inert — used by the sponsor admin editor. */
  preview?: boolean;
}) {
  const click = useServerFn(clickSponsor);
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    if (busy || preview) return;
    setBusy(true);
    try {
      const { url } = await click({ data: { sponsorId: sponsor.id, surface } });
      if (url) window.open(url, "_blank", "noopener,noreferrer");
    } finally {
      setBusy(false);
    }
  }


  return (
    <aside
      data-slot="sponsor"
      className="brut mt-8 overflow-hidden bg-card"
    >
      <div className="flex items-center justify-between border-b-[3px] border-border bg-primary px-3 py-1.5">
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary-foreground">
          sponsor
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-primary-foreground/80">
          did not touch the findings
        </span>
      </div>

      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
        {sponsor.logoUrl && (
          <img
            src={sponsor.logoUrl}
            alt={`${sponsor.name} logo`}
            loading="lazy"
            className="h-10 w-10 shrink-0 border-[3px] border-border object-contain"
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">{sponsor.name}</p>
          <p className="text-sm text-muted-foreground">{sponsor.tagline}</p>
          {sponsor.body && (
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground/80">{sponsor.body}</p>
          )}
        </div>
        <button
          type="button"
          onClick={handleClick}
          disabled={busy}
          className="brut-sm brut-press shrink-0 bg-accent px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-widest text-accent-foreground disabled:opacity-60"
        >
          {sponsor.ctaLabel}
        </button>
      </div>

      <p className="brut-seam brut-hatch px-4 py-2 text-[11px] italic text-muted-foreground">
        {sponsor.creditLine}
      </p>
    </aside>
  );
}
