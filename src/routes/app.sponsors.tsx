import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  listSponsors,
  upsertSponsor,
  deleteSponsor,
  getIsPlatformAdmin,
} from "@/lib/sponsors.functions";
import {
  SponsorForm,
  emptyDraft,
  draftFrom,
  type SponsorDraft,
} from "@/components/sponsor-form";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Loader2, Megaphone } from "lucide-react";
import { toast } from "sonner";
import { RouteError } from "@/components/route-error";

export const Route = createFileRoute("/app/sponsors")({
  head: () => ({
    meta: [
      { title: "Sponsors · Marketing Agent" },
      {
        name: "description",
        content:
          "Manage the sponsors that fund free research reports: copy, targeting, rotation weight, impressions and clicks.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  errorComponent: ({ error }) => <RouteError error={error as Error} />,
  component: SponsorsAdmin,
});

function SponsorsAdmin() {
  const qc = useQueryClient();
  const admin = useQuery({ queryKey: ["is-platform-admin"], queryFn: () => getIsPlatformAdmin() });
  const isAdmin = admin.data?.isAdmin === true;

  const sponsors = useQuery({
    queryKey: ["sponsors"],
    queryFn: () => listSponsors(),
    enabled: isAdmin,
  });

  const [draft, setDraft] = useState<SponsorDraft | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: (d: SponsorDraft) =>
      upsertSponsor({
        data: {
          ...(d.id ? { id: d.id } : {}),
          name: d.name.trim(),
          tagline: d.tagline.trim(),
          body: d.body.trim() || null,
          ctaLabel: d.ctaLabel.trim(),
          destinationUrl: d.destinationUrl.trim(),
          logoUrl: d.logoUrl.trim() || null,
          topicKeywords: d.topicKeywords,
          creditLines: d.creditLines.map((l) => l.trim()).filter((l) => l.length >= 4),
          weight: d.weight,
          isActive: d.isActive,
        },
      }),
    onSuccess: () => {
      toast.success("Sponsor saved");
      setDraft(null);
      qc.invalidateQueries({ queryKey: ["sponsors"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : String(e)),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteSponsor({ data: { id } }),
    onSuccess: () => {
      toast.success("Sponsor deleted");
      setPendingDelete(null);
      qc.invalidateQueries({ queryKey: ["sponsors"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : String(e)),
  });

  if (admin.isLoading) {
    return <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Checking access…</div>;
  }

  if (!isAdmin) {
    return (
      <div className="brut mx-auto max-w-lg bg-card p-6">
        <p className="brut-chip brut-chip-accent">403</p>
        <h1 className="mt-3 text-xl font-bold">Sponsors are platform-level</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Only platform admins manage the sponsors that fund free reports. Your workspace data is
          untouched by this screen.
        </p>
      </div>
    );
  }

  const rows = sponsors.data ?? [];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="brut-chip">ad-funded engine</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Sponsors</h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            One card per published report, served from our own database. No third-party scripts, no
            pixels, no reader data leaving the app — and never inside a report body.
          </p>
        </div>
        {!draft && (
          <Button onClick={() => setDraft(emptyDraft())}>
            <Plus className="mr-1 h-4 w-4" /> New sponsor
          </Button>
        )}
      </header>

      {draft ? (
        <section className="brut bg-card p-5">
          <h2 className="mb-4 text-base font-bold uppercase tracking-tight">
            {draft.id ? "Edit sponsor" : "New sponsor"}
          </h2>
          <SponsorForm
            draft={draft}
            onChange={setDraft}
            onSubmit={() => save.mutate(draft)}
            onCancel={() => setDraft(null)}
            saving={save.isPending}
          />
        </section>
      ) : sponsors.isLoading ? (
        <ListSkeleton count={3} lines={2} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Megaphone className="h-5 w-5" strokeWidth={2.5} />}
          title="No sponsors yet"
          description="Reports show no ad slot at all until a sponsor is live. Add one and it appears beside published reports whose topic matches its keywords."
          action={
            <Button onClick={() => setDraft(emptyDraft())}>
              <Plus className="mr-1 h-4 w-4" /> Add the first sponsor
            </Button>
          }
        />
      ) : (
        <div className="brut overflow-x-auto bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-[3px] border-border bg-secondary text-left font-mono text-[10px] uppercase tracking-[0.16em]">
                <th className="px-3 py-2">Sponsor</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Weight</th>
                <th className="px-3 py-2 text-right">Impr.</th>
                <th className="px-3 py-2 text-right">Clicks</th>
                <th className="px-3 py-2 text-right">CTR</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const ctr = row.impressions > 0 ? (row.clicks / row.impressions) * 100 : 0;
                return (
                  <tr key={row.id} className="border-b-[3px] border-border/40 last:border-b-0">
                    <td className="px-3 py-2.5">
                      <div className="font-semibold">{row.name}</div>
                      <div className="max-w-md truncate text-xs text-muted-foreground">
                        {row.tagline}
                      </div>
                      {row.topicKeywords.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {row.topicKeywords.slice(0, 4).map((k) => (
                            <span key={k} className="brut-chip">
                              {k}
                            </span>
                          ))}
                          {row.topicKeywords.length > 4 && (
                            <span className="font-mono text-[10px] text-muted-foreground">
                              +{row.topicKeywords.length - 4}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={row.isActive ? "brut-chip" : "brut-chip brut-chip-accent"}>
                        {row.isActive ? "live" : "paused"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono">{row.weight}</td>
                    <td className="px-3 py-2.5 text-right font-mono">{row.impressions}</td>
                    <td className="px-3 py-2.5 text-right font-mono">{row.clicks}</td>
                    <td className="px-3 py-2.5 text-right font-mono">{ctr.toFixed(1)}%</td>
                    <td className="px-3 py-2.5">
                      <div className="flex justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="icon-sm"
                          aria-label={`Edit ${row.name}`}
                          onClick={() => setDraft(draftFrom(row))}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon-sm"
                          aria-label={`Delete ${row.name}`}
                          onClick={() => setPendingDelete(row.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this sponsor?</AlertDialogTitle>
            <AlertDialogDescription>
              The card stops appearing immediately. Recorded impressions and clicks go with it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => pendingDelete && remove.mutate(pendingDelete)}
              disabled={remove.isPending}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
