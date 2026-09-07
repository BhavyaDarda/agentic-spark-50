import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getCurrentWorkspace } from "@/lib/workspace.functions";
import { listBrands } from "@/lib/brands.functions";
import {
  listKnowledge,
  addKnowledgeSource,
  deleteKnowledgeSource,
  searchKnowledge,
} from "@/lib/knowledge.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BrainCircuit, Globe, Loader2, Search, Trash2, FileText } from "lucide-react";
import { toast } from "sonner";
import { RouteError } from "@/components/route-error";

export const Route = createFileRoute("/app/knowledge")({
  head: () => ({
    meta: [
      { title: "Brand Memory · Marketing Agent" },
      {
        name: "description",
        content:
          "Paste notes or import pages once. Every agent run grounds its answers in your own brand knowledge.",
      },
      { property: "og:title", content: "Brand Memory · Marketing Agent" },
      {
        property: "og:description",
        content: "Ground every agent output in your own documents, notes and site pages.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  errorComponent: ({ error }) => <RouteError error={error as Error} />,
  component: KnowledgePage,
});

const NO_BRAND = "__workspace__";

function KnowledgePage() {
  const qc = useQueryClient();
  const ws = useQuery({ queryKey: ["current-workspace"], queryFn: () => getCurrentWorkspace() });
  const workspaceId = ws.data?.workspace?.id;

  const brands = useQuery({
    queryKey: ["brands", workspaceId],
    queryFn: () => listBrands({ data: { workspaceId: workspaceId! } }),
    enabled: !!workspaceId,
  });

  const [brandId, setBrandId] = useState<string>(NO_BRAND);
  const [mode, setMode] = useState<"text" | "url">("text");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [probe, setProbe] = useState("");

  const sources = useQuery({
    queryKey: ["knowledge", workspaceId],
    queryFn: () => listKnowledge({ data: { workspaceId: workspaceId! } }),
    enabled: !!workspaceId,
  });

  const add = useMutation({
    mutationFn: () =>
      addKnowledgeSource({
        data: {
          workspaceId: workspaceId!,
          brandId: brandId === NO_BRAND ? null : brandId,
          ...(title.trim() ? { title: title.trim() } : {}),
          ...(mode === "text" ? { text } : { url: url.trim() }),
        },
      }),
    onSuccess: (r) => {
      toast.success(`Stored “${r.title}” in ${r.chunks} searchable pieces`);
      setText("");
      setUrl("");
      setTitle("");
      qc.invalidateQueries({ queryKey: ["knowledge", workspaceId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : String(e)),
  });

  const remove = useMutation({
    mutationFn: (ids: string[]) => deleteKnowledgeSource({ data: { workspaceId: workspaceId!, ids } }),
    onSuccess: () => {
      toast.success("Source removed from brand memory");
      qc.invalidateQueries({ queryKey: ["knowledge", workspaceId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : String(e)),
  });

  const search = useMutation({
    mutationFn: () =>
      searchKnowledge({ data: { workspaceId: workspaceId!, query: probe.trim(), limit: 5 } }),
    onError: (e) => toast.error(e instanceof Error ? e.message : String(e)),
  });

  const rows = sources.data ?? [];
  const brandName = (id: string | null) =>
    id ? (brands.data ?? []).find((b) => b.id === id)?.name ?? "Deleted brand" : "Whole workspace";

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <p className="brut-chip">retrieval · grounding</p>
        <h1 className="mt-2 font-display text-3xl font-black uppercase tracking-tighter">
          Brand memory
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Paste positioning docs, price lists, tone rules or import a page once. Every chat, campaign
          and research run can pull from this — the agent cites it as brand memory instead of
          guessing.
        </p>
      </header>

      <section className="brut bg-card p-5">
        <div className="mb-4 flex flex-wrap gap-2">
          <Button
            variant={mode === "text" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("text")}
          >
            <FileText className="mr-1 h-3.5 w-3.5" /> Paste text
          </Button>
          <Button
            variant={mode === "url" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("url")}
          >
            <Globe className="mr-1 h-3.5 w-3.5" /> Import a page
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="k-title">Label</Label>
            <Input
              id="k-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={mode === "url" ? "Optional — we read the page title":"Tone of voice v3"}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="k-brand">Applies to</Label>
            <Select value={brandId} onValueChange={setBrandId}>
              <SelectTrigger id="k-brand">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_BRAND}>Whole workspace</SelectItem>
                {(brands.data ?? []).map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-4 space-y-1.5">
          {mode === "text" ? (
            <>
              <Label htmlFor="k-text">Content</Label>
              <Textarea
                id="k-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={8}
                placeholder="Paste anything the agent should treat as ground truth: positioning, ICP notes, pricing, do/don't rules, past winning copy…"
              />
            </>
          ) : (
            <>
              <Label htmlFor="k-url">Page URL</Label>
              <Input
                id="k-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://yourbrand.com/about"
              />
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Public pages only — internal and private addresses are blocked.
              </p>
            </>
          )}
        </div>

        <Button
          className="mt-4"
          disabled={
            !workspaceId ||
            add.isPending ||
            (mode === "text" ? text.trim().length < 40 : url.trim().length < 8)
          }
          onClick={() => add.mutate()}
        >
          {add.isPending ? (
            <>
              <Loader2 className="mr-1 h-4 w-4 animate-spin" /> Embedding
            </>
          ) : (
            <>
              <BrainCircuit className="mr-1 h-4 w-4" /> Add to memory
            </>
          )}
        </Button>
      </section>

      <section className="brut bg-card p-5">
        <h2 className="font-display text-sm font-black uppercase tracking-tight">
          Test what the agent will find
        </h2>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={probe}
              onChange={(e) => setProbe(e.target.value)}
              placeholder="e.g. what tone do we use for enterprise buyers?"
              className="pl-9"
            />
          </div>
          <Button
            variant="outline"
            disabled={probe.trim().length < 2 || search.isPending || !workspaceId}
            onClick={() => search.mutate()}
          >
            {search.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search memory"}
          </Button>
        </div>
        {search.data && (
          <ul className="mt-4 space-y-2">
            {search.data.length === 0 && (
              <li className="text-sm text-muted-foreground">
                Nothing matched. Add a source that covers this.
              </li>
            )}
            {search.data.map((m) => (
              <li key={m.id} className="border-[3px] border-border bg-background p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate text-sm font-semibold">{m.title ?? "Untitled"}</span>
                  <span className="brut-chip shrink-0">
                    {Math.round((m.similarity ?? 0) * 100)}% match
                  </span>
                </div>
                <p className="mt-1.5 line-clamp-3 text-xs text-muted-foreground">{m.content}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-sm font-black uppercase tracking-tight">
          Stored sources {rows.length > 0 && <span className="brut-chip ml-2">{rows.length}</span>}
        </h2>
        {sources.isLoading ? (
          <ListSkeleton count={4} columns={2} lines={2} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<BrainCircuit className="h-5 w-5" strokeWidth={2.5} />}
            title="Memory is empty"
            description="Paste text or add a public page above. Until you do, the agent works from the brand fields alone."
          />
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {rows.map((s) => (
              <li key={s.key} className="brut-sm flex flex-col gap-2 bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold">{s.title}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <span className="brut-chip">{s.sourceType}</span>
                      <span className="brut-chip">{s.chunks} chunks</span>
                      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                        {brandName(s.brandId)}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    aria-label={`Remove ${s.title}`}
                    disabled={remove.isPending}
                    onClick={() => remove.mutate(s.ids)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {s.sourceUrl && (
                  <a
                    href={s.sourceUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="truncate font-mono text-[10px] text-primary underline"
                  >
                    {s.sourceUrl}
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
