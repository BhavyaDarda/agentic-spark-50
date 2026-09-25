import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getRunSponsorOffer, acceptRunSponsorship } from "@/lib/sponsors.functions";
import { Button } from "@/components/ui/button";
import { HandCoins, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

/**
 * Pre-run, opt-in sponsorship offer. Shown before a research run on projects
 * that are not already set to the deepest depth.
 *
 * Declining costs the user nothing — the run executes at the project's own
 * depth. Accepting upgrades this project to the "deep" depth (more search
 * queries, more pages read) and means one clearly labeled card sits beside the
 * report IF the user later publishes it. Sponsors never see the reader and
 * never touch a source, a sentence, or a conclusion.
 */
export function SponsorOffer({
  projectId,
  topic,
  depth,
}: {
  projectId: string;
  topic: string;
  depth: string;
}) {
  const qc = useQueryClient();
  const eligible = depth !== "deep";
  const [decision, setDecision] = useState<"pending" | "accepted" | "declined">("pending");

  const offer = useQuery({
    queryKey: ["run-sponsor-offer", projectId],
    queryFn: () => getRunSponsorOffer({ data: { topic } }),
    enabled: eligible,
    staleTime: Infinity,
  });

  const accept = useMutation({
    mutationFn: (sponsorId: string) => acceptRunSponsorship({ data: { sponsorId, projectId } }),
    onSuccess: async () => {
      setDecision("accepted");
      await qc.invalidateQueries({ queryKey: ["research-project", projectId] });
      toast.success("Upgraded to a deep run. Start it whenever you like.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : String(e)),
  });

  const sponsor = offer.data?.sponsor;

  if (decision === "accepted" && sponsor) {
    return (
      <div
        role="status"
        className="brut-sm flex items-center gap-2 bg-primary px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-widest text-primary-foreground"
      >
        <Check className="h-3.5 w-3.5" aria-hidden="true" />
        {sponsor.name} is covering the deep run
      </div>
    );
  }

  if (!eligible || !sponsor || decision === "declined") return null;

  return (
    <section className="brut bg-card" aria-labelledby={`sponsor-offer-${projectId}`}>
      <header className="flex items-center justify-between border-b-[3px] border-border bg-accent px-3 py-1.5">
        <span
          id={`sponsor-offer-${projectId}`}
          className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent-foreground"
        >
          <HandCoins className="h-3.5 w-3.5" aria-hidden="true" />
          optional sponsorship
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-accent-foreground/80">
          your call, always
        </span>
      </header>

      <div className="space-y-4 p-4">
        <p className="text-sm leading-relaxed">
          <span className="font-semibold">{sponsor.name}</span> will cover a deep run on this
          topic: seven search angles instead of {depth === "quick" ? "three" : "five"}, and more
          pages read in full. {sponsor.tagline}
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="brut-sm bg-background p-3">
            <p className="brut-chip mb-2">they get</p>
            <ul className="space-y-1 text-xs leading-relaxed text-muted-foreground">
              <li>One labeled card beside the report — only if you publish it.</li>
              <li>A count of impressions and clicks. Nothing else.</li>
            </ul>
          </div>
          <div className="brut-sm bg-background p-3">
            <p className="brut-chip brut-chip-accent mb-2">they never get</p>
            <ul className="space-y-1 text-xs leading-relaxed text-muted-foreground">
              <li>Any say over sources, wording, or conclusions.</li>
              <li>Anything at all about you or your readers.</li>
            </ul>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => accept.mutate(sponsor.id)} disabled={accept.isPending}>
            {accept.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" aria-hidden="true" />}
            Run it sponsored, at deep depth
          </Button>
          <Button variant="outline" onClick={() => setDecision("declined")}>
            Keep it unsponsored
          </Button>
        </div>
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          same agents, same sources policy, same report format either way
        </p>
      </div>
    </section>
  );
}
