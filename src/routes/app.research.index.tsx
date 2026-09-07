import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getCurrentWorkspace } from "@/lib/workspace.functions";
import { listProjects, createProject } from "@/lib/research.functions";
import { citationCounts } from "@/lib/citations.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Microscope, ArrowRight, Loader2, Copy } from "lucide-react";
import { toast } from "sonner";
import { RouteError } from "@/components/route-error";

export const Route = createFileRoute("/app/research/")({
  head: () => ({ meta: [{ title: "Research Ninja · Marketing Agent" }] }),
  errorComponent: ({ error }) => <RouteError error={error as Error} />,
  component: ResearchListPage,
});

function ResearchListPage() {
  const ws = useQuery({ queryKey: ["current-workspace"], queryFn: () => getCurrentWorkspace() });
  const workspaceId = ws.data?.workspace?.id;
  const qc = useQueryClient();
  const projects = useQuery({
    queryKey: ["research", workspaceId],
    queryFn: () => listProjects({ data: { workspaceId: workspaceId! } }),
    enabled: !!workspaceId,
  });
  const counts = useQuery({
    queryKey: ["citation-counts", workspaceId],
    queryFn: () => citationCounts({ data: { workspaceId: workspaceId! } }),
    enabled: !!workspaceId,
  });

  const [open, setOpen] = useState(false);
  const [topic, setTopic] = useState("");
  const [goal, setGoal] = useState("");
  const [depth, setDepth] = useState<"quick" | "standard" | "deep">("standard");

  const create = useMutation({
    mutationFn: async () =>
      createProject({ data: { workspaceId: workspaceId!, topic, goal, depth } }),
    onSuccess: (p) => {
      toast.success("Project created");
      setOpen(false);
      setTopic("");
      setGoal("");
      qc.invalidateQueries({ queryKey: ["research", workspaceId] });
      // Navigate immediately
      window.location.href = `/app/research/${p.id}`;
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Research Ninja</h1>
          <p className="text-sm text-muted-foreground">
            Multi-agent web research with live streaming and cited reports.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-1 h-4 w-4" /> New project
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Start a research project</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <div className="space-y-1.5">
                <Label>Topic *</Label>
                <Input value={topic} onChange={(e) => setTopic(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Goal</Label>
                <Textarea
                  rows={3}
                  placeholder="What decision are you trying to make?"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Depth</Label>
                <Select value={depth} onValueChange={(v) => setDepth(v as typeof depth)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quick">Quick · 3 queries · ~30s</SelectItem>
                    <SelectItem value="standard">Standard · 5 queries · ~1m</SelectItem>
                    <SelectItem value="deep">Deep · 7 queries · ~2m</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => create.mutate()} disabled={!topic.trim() || create.isPending}>
                {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create & open
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {projects.isLoading ? (
        <ListSkeleton count={3} columns={3} lines={3} />
      ) : (projects.data?.length ?? 0) === 0 ? (
        <EmptyState
          icon={<Microscope className="h-5 w-5" strokeWidth={2.5} />}
          title="No research yet"
          description="Start a project and the agent team plans, searches, reads, synthesizes and critiques — then you can publish it as a citable report."
          action={
            <Button onClick={() => setOpen(true)}>
              <Plus className="mr-1 h-4 w-4" /> New research project
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.data!.map((p) => (
            <div key={p.id} className="relative">
              <Link to="/app/research/$projectId" params={{ projectId: p.id }}>
                <Card className="h-full border-border/60 transition-colors hover:border-primary/40">
                  <CardHeader>
                    <CardTitle className="line-clamp-2 pr-16 text-base">{p.topic}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-muted-foreground">
                    {p.goal && <p className="line-clamp-2">{p.goal}</p>}
                    <div className="flex items-center justify-between pt-2 font-mono text-xs">
                      <span>
                        {p.depth}
                        {(counts.data?.[p.id] ?? 0) > 0 && (
                          <span className="ml-2 bg-primary/10 px-1.5 py-0.5 uppercase text-primary">
                            {counts.data![p.id]} cited
                          </span>
                        )}
                      </span>
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
              {p.is_public && p.share_slug && (
                <div className="absolute right-3 top-3 flex items-center gap-1">
                  <span className="bg-emerald-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-emerald-400">
                    public
                  </span>
                  <button
                    type="button"
                    aria-label="Copy public link"
                    className="p-1 text-muted-foreground transition-colors hover:text-foreground"
                    onClick={(e) => {
                      e.preventDefault();
                      navigator.clipboard.writeText(
                        `${window.location.origin}/r/${p.share_slug}`,
                      );
                      toast.success("Link copied");
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
