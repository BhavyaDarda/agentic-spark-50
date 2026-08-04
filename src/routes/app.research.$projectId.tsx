import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { getProject, getRunDetail, toggleSharing } from "@/lib/research.functions";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Markdown } from "@/components/markdown";
import {
  Loader2,
  Play,
  ExternalLink,
  Share2,
  CheckCircle2,
  Sparkles,
  Brain,
  Search,
  FileText,
  Shield,
  Copy,
  Globe,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";


export const Route = createFileRoute("/app/research/$projectId")({
  head: () => ({ meta: [{ title: "Research · Marketing Agent" }] }),
  component: ResearchDetail,
});

type StreamEvent =
  | { type: "step"; agent: string; action?: string; thought?: string; result?: unknown }
  | { type: "source"; url: string; title?: string; snippet?: string }
  | { type: "done"; report: string; summary: string }
  | { type: "error"; message: string };

const AGENT_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  Orchestrator: Sparkles,
  Planner: Brain,
  Searcher: Search,
  Reader: FileText,
  Synthesizer: Sparkles,
  Critic: Shield,
};

function ResearchDetail() {
  const { projectId } = Route.useParams();
  const qc = useQueryClient();
  const proj = useQuery({
    queryKey: ["research-project", projectId],
    queryFn: () => getProject({ data: { id: projectId } }),
  });

  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const runDetail = useQuery({
    queryKey: ["run-detail", activeRunId],
    queryFn: () => getRunDetail({ data: { runId: activeRunId! } }),
    enabled: !!activeRunId,
  });

  useEffect(() => {
    if (!activeRunId && proj.data?.runs?.[0]) setActiveRunId(proj.data.runs[0].id);
  }, [proj.data, activeRunId]);

  const [liveEvents, setLiveEvents] = useState<StreamEvent[]>([]);
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const start = async () => {
    if (streaming) return;
    setLiveEvents([]);
    setStreaming(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      const ac = new AbortController();
      abortRef.current = ac;
      const res = await fetch("/api/research", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ projectId }),
        signal: ac.signal,
      });
      if (!res.ok || !res.body) throw new Error(await res.text());
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const chunks = buf.split("\n\n");
        buf = chunks.pop() ?? "";
        for (const c of chunks) {
          const line = c.split("\n").find((l) => l.startsWith("data: "));
          if (!line) continue;
          try {
            const ev = JSON.parse(line.slice(6)) as StreamEvent;
            setLiveEvents((p) => [...p, ev]);
            if (ev.type === "done" || ev.type === "error") {
              await qc.invalidateQueries({ queryKey: ["research-project", projectId] });
            }
          } catch {
            /* ignore */
          }
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg);
    } finally {
      setStreaming(false);
      abortRef.current = null;
      qc.invalidateQueries({ queryKey: ["research-project", projectId] });
    }
  };

  const [shareOpen, setShareOpen] = useState(false);
  const [sharePending, setSharePending] = useState(false);

  const setSharing = async (next: boolean) => {
    setSharePending(true);
    try {
      await toggleSharing({ data: { id: projectId, is_public: next } });
      await qc.invalidateQueries({ queryKey: ["research-project", projectId] });
      toast.success(next ? "Report published" : "Sharing disabled");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setSharePending(false);
    }
  };


  if (proj.isLoading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (!proj.data) return <div className="text-sm text-muted-foreground">Not found.</div>;

  const p = proj.data.project;
  const liveSteps = liveEvents.filter((e) => e.type === "step");
  const liveSources = liveEvents.filter((e) => e.type === "source");
  const doneEv = liveEvents.find((e) => e.type === "done") as
    | { type: "done"; report: string; summary: string }
    | undefined;
  const persistedRun = runDetail.data?.run;
  const persistedSteps = runDetail.data?.steps ?? [];
  const persistedSources = runDetail.data?.sources ?? [];

  const showReport = doneEv?.report ?? persistedRun?.report_markdown ?? null;
  const showSummary = doneEv?.summary ?? persistedRun?.summary ?? null;
  const steps = streaming || liveSteps.length ? liveSteps : persistedSteps.map(s => ({
    type: "step" as const,
    agent: s.agent,
    action: s.action ?? undefined,
    thought: s.thought ?? undefined,
  }));
  const sources = streaming || liveSources.length ? liveSources : persistedSources.map(s => ({
    type: "source" as const,
    url: s.url,
    title: s.title ?? undefined,
    snippet: s.snippet ?? undefined,
  }));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{p.topic}</h1>
          {p.goal && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{p.goal}</p>}
          <div className="mt-2 flex items-center gap-2 text-xs">
            <span className="rounded-md bg-muted px-2 py-0.5 font-mono">{p.depth}</span>
            {p.is_public && (
              <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-emerald-400">
                public
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShareOpen(true)}>
            <Share2 className="mr-1 h-4 w-4" />
            Share
          </Button>

          <Button onClick={start} disabled={streaming}>
            {streaming ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-1 h-4 w-4" />
            )}
            {streaming ? "Running…" : "Run agents"}
          </Button>
        </div>
      </div>

      {/* Past runs */}
      {(proj.data.runs?.length ?? 0) > 0 && !streaming && (
        <div className="flex flex-wrap gap-2">
          {proj.data.runs.map((r) => (
            <button
              key={r.id}
              onClick={() => setActiveRunId(r.id)}
              className={`rounded-md border px-2 py-1 text-xs ${
                activeRunId === r.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              {new Date(r.created_at).toLocaleString()} · {r.status}
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        {/* Agent trace */}
        <Card className="lg:max-h-[78vh] lg:overflow-y-auto">
          <CardHeader>
            <CardTitle className="text-base">Agent trace</CardTitle>
          </CardHeader>
          <CardContent>
            {steps.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Click <strong>Run agents</strong> to start.
              </p>
            ) : (
              <ol className="space-y-3">
                {steps.map((s, i) => {
                  const Icon = AGENT_ICON[s.agent] ?? Sparkles;
                  return (
                    <li key={i} className="flex gap-3">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium">
                          {s.agent}
                          {s.action && (
                            <span className="ml-1 font-mono text-xs text-muted-foreground">
                              · {s.action}
                            </span>
                          )}
                        </div>
                        {s.thought && (
                          <div className="line-clamp-3 text-xs text-muted-foreground">
                            {s.thought}
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
                {streaming && (
                  <li className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" /> Working…
                  </li>
                )}
                {doneEv && (
                  <li className="flex items-center gap-2 text-xs text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" /> Completed
                  </li>
                )}
              </ol>
            )}

            {sources.length > 0 && (
              <div className="mt-6 border-t border-border/60 pt-4">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Sources ({sources.length})
                </div>
                <ul className="space-y-2">
                  {sources.map((s, i) => (
                    <li key={i} className="text-xs">
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noreferrer"
                        className="line-clamp-1 text-primary hover:underline"
                      >
                        [{i + 1}] {s.title || s.url}
                      </a>
                      {s.snippet && (
                        <div className="line-clamp-2 text-muted-foreground">{s.snippet}</div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Report */}
        <Card className="lg:max-h-[78vh] lg:overflow-y-auto">
          <CardHeader>
            <CardTitle className="text-base">Report</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {showSummary && (
              <div className="rounded-md border border-primary/30 bg-primary/5 p-4">
                <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-primary">
                  Executive summary
                </div>
                <p className="text-sm">{showSummary}</p>
              </div>
            )}
            {showReport ? (
              <Markdown>{showReport}</Markdown>
            ) : (
              <p className="text-sm text-muted-foreground">
                The synthesized report will appear here once the agents finish.
              </p>
            )}
            {showReport && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(showReport);
                  toast.success("Report copied");
                }}
              >
                <ExternalLink className="mr-1 h-4 w-4" />
                Copy markdown
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
