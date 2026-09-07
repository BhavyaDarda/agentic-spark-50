import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getCurrentWorkspace } from "@/lib/workspace.functions";
import { listBrands } from "@/lib/brands.functions";
import {
  listCampaigns,
  getCampaign,
  createCampaign,
  deleteCampaign,
  planCampaign,
  generateCampaignAsset,
  type CalendarItem,
  type CampaignStrategy,
} from "@/lib/campaigns.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Markdown } from "@/components/markdown";
import { Loader2, Plus, Megaphone, Trash2, Wand2, Sparkle } from "lucide-react";
import { toast } from "sonner";
import { RouteError, ListSkeleton, EmptyState } from "@/components/route-error";

export const Route = createFileRoute("/app/campaigns")({
  head: () => ({
    meta: [
      { title: "Campaigns · Marketing Agent" },
      {
        name: "description",
        content:
          "Plan multi-channel campaigns with strategy, channel mix, KPIs and a week-by-week calendar, then generate every asset.",
      },
      { property: "og:title", content: "Campaigns · Marketing Agent" },
      {
        property: "og:description",
        content: "Strategy, channel mix, KPIs and a production calendar for every campaign.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  errorComponent: ({ error }) => <RouteError error={error as Error} />,
  component: CampaignsPage,
});

function CampaignsPage() {
  const ws = useQuery({ queryKey: ["current-workspace"], queryFn: () => getCurrentWorkspace() });
  const workspaceId = ws.data?.workspace?.id;
  const qc = useQueryClient();
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const campaigns = useQuery({
    queryKey: ["campaigns", workspaceId],
    queryFn: () => listCampaigns({ data: { workspaceId: workspaceId! } }),
    enabled: !!workspaceId,
  });
  const brands = useQuery({
    queryKey: ["brands", workspaceId],
    queryFn: () => listBrands({ data: { workspaceId: workspaceId! } }),
    enabled: !!workspaceId,
  });

  const [form, setForm] = useState({
    name: "",
    objective: "",
    channels: "",
    startDate: "",
    endDate: "",
    budget: "",
    brandId: "",
  });

  const create = useMutation({
    mutationFn: () =>
      createCampaign({
        data: {
          workspaceId: workspaceId!,
          name: form.name.trim(),
          objective: form.objective.trim() || undefined,
          channels: form.channels
            .split(",")
            .map((c) => c.trim())
            .filter(Boolean),
          startDate: form.startDate || null,
          endDate: form.endDate || null,
          budget: form.budget ? Number(form.budget) : null,
          brandId: form.brandId || null,
        },
      }),
    onSuccess: ({ id }) => {
      toast.success("Campaign created");
      setCreating(false);
      setForm({ name: "", objective: "", channels: "", startDate: "", endDate: "", budget: "", brandId: "" });
      qc.invalidateQueries({ queryKey: ["campaigns", workspaceId] });
      setOpenId(id);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (id: string) => deleteCampaign({ data: { id } }),
    onSuccess: () => {
      toast.success("Campaign deleted");
      qc.invalidateQueries({ queryKey: ["campaigns", workspaceId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Campaigns</h1>
          <p className="text-sm text-muted-foreground">
            One brief in — strategy, channel mix, KPIs, calendar and every asset out.
          </p>
        </div>
        <Dialog open={creating} onOpenChange={setCreating}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-1 h-4 w-4" />
              New campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>New campaign</DialogTitle>
              <DialogDescription>
                Give the strategist a brief. Everything else is generated.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3">
              <div className="space-y-1.5">
                <Label>Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Q2 self-serve activation"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Objective</Label>
                <Textarea
                  rows={3}
                  value={form.objective}
                  onChange={(e) => setForm({ ...form, objective: e.target.value })}
                  placeholder="Drive 500 trial signups from mid-market ops teams."
                />
              </div>
              <div className="space-y-1.5">
                <Label>Channels (comma separated)</Label>
                <Input
                  value={form.channels}
                  onChange={(e) => setForm({ ...form, channels: e.target.value })}
                  placeholder="LinkedIn, email, blog, paid search"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Start</Label>
                  <Input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>End</Label>
                  <Input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Budget</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.budget}
                    onChange={(e) => setForm({ ...form, budget: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Brand</Label>
                  <select
                    className="h-9 w-full border-[3px] border-border bg-transparent px-3 text-sm"
                    value={form.brandId}
                    onChange={(e) => setForm({ ...form, brandId: e.target.value })}
                  >
                    <option value="">No brand</option>
                    {(brands.data ?? []).map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => create.mutate()} disabled={!form.name.trim() || create.isPending}>
                {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create campaign
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {campaigns.isLoading ? (
        <ListSkeleton count={2} columns={2} lines={3} />
      ) : (campaigns.data?.length ?? 0) === 0 ? (
        <EmptyState
          icon={<Megaphone className="h-5 w-5" strokeWidth={2.5} />}
          title="No campaigns yet"
          description="Give a one-line objective and the strategist fills in positioning, channel mix, KPIs and a week-by-week calendar."
          action={
            <Button onClick={() => setCreating(true)}>
              <Plus className="mr-1 h-4 w-4" /> Create your first campaign
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {campaigns.data!.map((c) => (
            <Card key={c.id} className="border-border/60">
              <CardHeader className="flex flex-row items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-base">{c.name}</CardTitle>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant="secondary" className="font-mono text-[10px] uppercase">
                      {c.status ?? "draft"}
                    </Badge>
                    {(c.channels ?? []).slice(0, 3).map((ch) => (
                      <span key={ch} className="text-xs text-muted-foreground">
                        {ch}
                      </span>
                    ))}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Delete ${c.name}`}
                  onClick={() => {
                    if (confirm(`Delete "${c.name}"?`)) del.mutate(c.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {c.objective && (
                  <p className="line-clamp-2 text-sm text-muted-foreground">{c.objective}</p>
                )}
                <div className="text-xs text-muted-foreground">
                  {c.start_date ?? "—"} → {c.end_date ?? "—"}
                  {c.budget ? ` · budget ${c.budget}` : ""}
                </div>
                <Button size="sm" variant="secondary" onClick={() => setOpenId(c.id)}>
                  Open plan
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CampaignSheet id={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}

function CampaignSheet({ id, onClose }: { id: string | null; onClose: () => void }) {
  const qc = useQueryClient();
  const detail = useQuery({
    queryKey: ["campaign", id],
    queryFn: () => getCampaign({ data: { id: id! } }),
    enabled: !!id,
  });
  const [asset, setAsset] = useState<{ title: string; text: string } | null>(null);

  const plan = useMutation({
    mutationFn: () => planCampaign({ data: { id: id! } }),
    onSuccess: () => {
      toast.success("Plan ready");
      qc.invalidateQueries({ queryKey: ["campaign", id] });
      qc.invalidateQueries({ queryKey: ["campaigns"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const gen = useMutation({
    mutationFn: (row: CalendarItem) =>
      generateCampaignAsset({
        data: { campaignId: id!, channel: row.channel, asset: row.asset },
      }),
    onSuccess: (r, row) => {
      setAsset({ title: `${row.channel} — ${row.asset}`, text: r.text });
      qc.invalidateQueries({ queryKey: ["campaign", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const campaign = detail.data?.campaign;
  const strategy = (campaign?.strategy ?? null) as CampaignStrategy | null;
  const calendar = (campaign?.calendar ?? null) as CalendarItem[] | null;

  return (
    <Sheet open={!!id} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>{campaign?.name ?? "Campaign"}</SheetTitle>
        </SheetHeader>

        {detail.isLoading ? (
          <div className="p-4">
            <ListSkeleton count={2} lines={4} />
          </div>
        ) : !campaign ? (
          <div className="p-4 text-sm text-muted-foreground">Campaign not found.</div>
        ) : (
          <div className="space-y-6 p-4">
            {!strategy ? (
              <Card className="border-primary/30">
                <CardContent className="flex flex-col items-start gap-3 py-6">
                  <p className="text-sm text-muted-foreground">
                    No plan yet. The strategist will produce positioning, channel mix with budget
                    split, KPIs, risks and a production calendar.
                  </p>
                  <Button onClick={() => plan.mutate()} disabled={plan.isPending}>
                    {plan.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Wand2 className="mr-2 h-4 w-4" />
                    )}
                    Build the plan
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <section className="space-y-2">
                  <h3 className="font-display text-sm uppercase tracking-widest text-muted-foreground">
                    Strategy
                  </h3>
                  <Row label="Positioning" value={strategy.positioning} />
                  <Row label="Audience" value={strategy.audience} />
                  <Row label="Key message" value={strategy.keyMessage} />
                </section>

                <section className="space-y-2">
                  <h3 className="font-display text-sm uppercase tracking-widest text-muted-foreground">
                    Channel mix
                  </h3>
                  <div className="space-y-1.5">
                    {strategy.channelMix.map((c) => (
                      <div key={c.channel} className="border-[3px] border-border p-2.5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{c.channel}</span>
                          <span className="font-mono text-xs text-primary">{c.budgetShare}%</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{c.role}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <h3 className="font-display text-sm uppercase tracking-widest text-muted-foreground">
                      KPIs
                    </h3>
                    {strategy.kpis.map((k) => (
                      <div key={k.name} className="text-sm">
                        <span className="text-muted-foreground">{k.name}:</span> {k.target}
                      </div>
                    ))}
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="font-display text-sm uppercase tracking-widest text-muted-foreground">
                      Risks
                    </h3>
                    {strategy.risks.map((r) => (
                      <div key={r} className="text-sm text-muted-foreground">
                        {r}
                      </div>
                    ))}
                  </div>
                </section>

                {calendar && calendar.length > 0 && (
                  <section className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-display text-sm uppercase tracking-widest text-muted-foreground">
                        Calendar
                      </h3>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => plan.mutate()}
                        disabled={plan.isPending}
                      >
                        {plan.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Replan
                      </Button>
                    </div>
                    <div className="divide-y divide-border/60 border-[3px] border-border">
                      {calendar.map((row, i) => (
                        <div key={i} className="flex items-center gap-3 p-2.5">
                          <span className="w-12 font-mono text-xs text-muted-foreground">
                            W{row.week}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm">{row.asset}</div>
                            <div className="text-xs text-muted-foreground">
                              {row.channel}
                              {row.date ? ` · ${row.date}` : ""} · {row.owner}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => gen.mutate(row)}
                            disabled={gen.isPending}
                          >
                            {gen.isPending && gen.variables === row ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Sparkle className="h-4 w-4" />
                            )}
                            <span className="ml-1.5 hidden sm:inline">Generate</span>
                          </Button>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}

            {(detail.data?.assets.length ?? 0) > 0 && (
              <section className="space-y-2">
                <h3 className="font-display text-sm uppercase tracking-widest text-muted-foreground">
                  Generated assets
                </h3>
                <div className="divide-y divide-border/60 border-[3px] border-border">
                  {detail.data!.assets.map((a) => (
                    <button
                      key={a.id}
                      className="flex w-full items-center justify-between p-2.5 text-left hover:bg-secondary/50"
                      onClick={() =>
                        setAsset({ title: a.title ?? a.kind, text: a.output_text ?? "" })
                      }
                    >
                      <span className="truncate text-sm">{a.title ?? a.kind}</span>
                      <Badge variant="secondary" className="font-mono text-[10px] uppercase">
                        {a.status}
                      </Badge>
                    </button>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        <Dialog open={!!asset} onOpenChange={(o) => !o && setAsset(null)}>
          <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{asset?.title}</DialogTitle>
            </DialogHeader>
            <Markdown>{asset?.text ?? ""}</Markdown>
            <DialogFooter>
              <Button
                variant="secondary"
                onClick={() => {
                  void navigator.clipboard.writeText(asset?.text ?? "");
                  toast.success("Copied");
                }}
              >
                Copy
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SheetContent>
    </Sheet>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-sm">
      <span className="text-muted-foreground">{label}: </span>
      {value}
    </div>
  );
}
