import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { getCurrentWorkspace } from "@/lib/workspace.functions";
import { listArtifacts } from "@/lib/chat.functions";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, Loader2, Search, Star } from "lucide-react";
import { RouteError } from "@/components/route-error";

export const Route = createFileRoute("/app/artifacts")({
  head: () => ({ meta: [{ title: "Artifact Library · Marketing Agent" }] }),
  errorComponent: ({ error }) => <RouteError error={error as Error} />,
  component: ArtifactLibrary,
});

const KINDS = [
  { value: "all", label: "All artifacts" },
  { value: "research_report", label: "Research reports" },
  { value: "blog_post", label: "Blog posts" },
  { value: "campaign_brief", label: "Campaign briefs" },
  { value: "ad_copy", label: "Ad copy" },
  { value: "social_post", label: "Social" },
  { value: "email", label: "Email" },
  { value: "video_script", label: "Video scripts" },
  { value: "seo_audit", label: "SEO audits" },
  { value: "strategy", label: "Strategy" },
];

function ArtifactLibrary() {
  const ws = useQuery({ queryKey: ["current-workspace"], queryFn: () => getCurrentWorkspace() });
  const workspaceId = ws.data?.workspace?.id;

  const [kind, setKind] = useState("all");
  const [q, setQ] = useState("");

  const arts = useQuery({
    queryKey: ["artifacts", workspaceId, kind],
    queryFn: () =>
      listArtifacts({
        data: { workspaceId: workspaceId!, kind: kind === "all" ? undefined : kind, limit: 100 },
      }),
    enabled: !!workspaceId,
  });

  const filtered = useMemo(() => {
    const rows = arts.data ?? [];
    if (!q.trim()) return rows;
    const f = q.toLowerCase();
    return rows.filter((r) => (r.title ?? "").toLowerCase().includes(f));
  }, [arts.data, q]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 py-2">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Artifact Library</h1>
        <p className="text-sm text-muted-foreground">
          Every deliverable the agent has saved for this workspace.
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search artifacts"
            className="pl-9"
          />
        </div>
        <Select value={kind} onValueChange={setKind}>
          <SelectTrigger className="sm:w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {KINDS.map((k) => (
              <SelectItem key={k.value} value={k.value}>
                {k.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {arts.isLoading ? (
        <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading library…
        </div>
      ) : filtered.length === 0 ? (
        <div className="border-[3px] border-dashed border-border p-12 text-center">
          <FileText className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            No artifacts yet.{" "}
            <Link to="/app" className="text-primary hover:underline">
              Start a chat
            </Link>{" "}
            and ask the agent to save one.
          </p>
        </div>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {filtered.map((a) => (
            <li key={a.id}>
              <Link
                to="/app/c/$conversationId"
                params={{ conversationId: a.conversation_id ?? "" }}
                className="group block border-[3px] border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-card"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{a.title}</div>
                    <div className="mt-1 flex items-center gap-2 text-[10px]">
                      <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono uppercase text-primary">
                        {a.kind.replace("_", "")}
                      </span>
                      <span className="text-muted-foreground">
                        {new Date(a.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  {a.starred && <Star className="h-3.5 w-3.5 fill-primary text-primary" />}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
