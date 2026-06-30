import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getCurrentWorkspace } from "@/lib/workspace.functions";
import { listBrands } from "@/lib/brands.functions";
import { listRuns } from "@/lib/content.functions";
import { listProjects } from "@/lib/research.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sparkles,
  Microscope,
  Building2,
  ArrowRight,
  Activity,
  CheckCircle2,
  XCircle,
  Loader2,
  Terminal,
  Server,
  CreditCard,
  Bell,
  ChevronRight
} from "lucide-react";

export const Route = createFileRoute("/app/")({
  head: () => ({ meta: [{ title: "Dashboard · Marketing Agent" }] }),
  component: Dashboard,
});

function Dashboard() {
  const ws = useQuery({ queryKey: ["current-workspace"], queryFn: () => getCurrentWorkspace() });
  const workspaceId = ws.data?.workspace?.id;

  const brands = useQuery({
    queryKey: ["brands", workspaceId],
    queryFn: () => listBrands({ data: { workspaceId: workspaceId! } }),
    enabled: !!workspaceId,
  });
  const runs = useQuery({
    queryKey: ["runs", workspaceId],
    queryFn: () => listRuns({ data: { workspaceId: workspaceId!, limit: 10 } }),
    enabled: !!workspaceId,
  });
  const projects = useQuery({
    queryKey: ["research", workspaceId],
    queryFn: () => listProjects({ data: { workspaceId: workspaceId! } }),
    enabled: !!workspaceId,
  });

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back 👋</h1>
        <p className="text-sm text-muted-foreground">
          Your AI marketing team is ready. Pick a workflow below to get started.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <ActionCard
          icon={<Sparkles className="h-5 w-5" />}
          title="Generate content"
          desc="Blogs, ads, social, email."
          to="/app/content"
        />
        <ActionCard
          icon={<Microscope className="h-5 w-5" />}
          title="Run deep research"
          desc="Multi-agent web research."
          to="/app/research"
        />
        <ActionCard
          icon={<Building2 className="h-5 w-5" />}
          title="Set up a brand"
          desc="Lock in voice & audience."
          to="/app/brands"
        />
      </div>

      {/* Enterprise Operations Bar (Matching User Screenshot) */}
      <div className="rounded-xl border border-border/80 bg-card/60 p-4 backdrop-blur shadow-sm">
        <div className="mb-3 flex items-center justify-between px-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Server className="h-3.5 w-3.5 text-primary" /> Enterprise Infrastructure & Operations
          </span>
          <span className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Production Ready
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Link to="/app/settings" search={{ tab: "ci" }}>
            <button className="inline-flex items-center gap-2 rounded-lg border border-border/80 bg-secondary/40 px-3.5 py-2 text-xs font-medium text-foreground hover:bg-secondary hover:border-primary/40 transition-all shadow-xs group cursor-pointer">
              <Terminal className="h-3.5 w-3.5 text-blue-400" />
              <span>Add CI build pipeline</span>
              <ChevronRight className="h-3 w-3 text-muted-foreground opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
            </button>
          </Link>
          <Link to="/app/settings" search={{ tab: "docker" }}>
            <button className="inline-flex items-center gap-2 rounded-lg border border-border/80 bg-secondary/40 px-3.5 py-2 text-xs font-medium text-foreground hover:bg-secondary hover:border-primary/40 transition-all shadow-xs group cursor-pointer">
              <Server className="h-3.5 w-3.5 text-amber-400" />
              <span>Harden Docker production</span>
              <ChevronRight className="h-3 w-3 text-muted-foreground opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
            </button>
          </Link>
          <Link to="/app/settings" search={{ tab: "billing" }}>
            <button className="inline-flex items-center gap-2 rounded-lg border border-border/80 bg-secondary/40 px-3.5 py-2 text-xs font-medium text-foreground hover:bg-secondary hover:border-primary/40 transition-all shadow-xs group cursor-pointer">
              <CreditCard className="h-3.5 w-3.5 text-purple-400" />
              <span>Connect Stripe billing</span>
              <ChevronRight className="h-3 w-3 text-muted-foreground opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
            </button>
          </Link>
          <Link to="/app/settings" search={{ tab: "monitoring" }}>
            <button className="inline-flex items-center gap-2 rounded-lg border border-border/80 bg-secondary/40 px-3.5 py-2 text-xs font-medium text-foreground hover:bg-secondary hover:border-primary/40 transition-all shadow-xs group cursor-pointer">
              <Bell className="h-3.5 w-3.5 text-emerald-400" />
              <span>Enable monitoring and alerts</span>
              <ChevronRight className="h-3 w-3 text-muted-foreground opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
            </button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Stat label="Brands" value={brands.data?.length ?? 0} />
        <Stat label="Content runs" value={runs.data?.length ?? 0} />
        <Stat label="Research projects" value={projects.data?.length ?? 0} />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recent activity</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {runs.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : (runs.data?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">
              No runs yet. Try{" "}
              <Link to="/app/content" className="text-primary hover:underline">
                generating your first piece of content
              </Link>
              .
            </p>
          ) : (
            <ul className="divide-y divide-border/60">
              {runs.data!.map((r) => (
                <li key={r.id} className="flex items-center justify-between py-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">
                      {r.title || r.kind.replace("_", " ")}
                    </div>
                    <div className="font-mono text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleString()} · {r.kind}
                    </div>
                  </div>
                  <StatusBadge status={r.status} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ActionCard({
  icon,
  title,
  desc,
  to,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  to: string;
}) {
  return (
    <Link to={to}>
      <Card className="group h-full border-border/60 transition-colors hover:border-primary/50">
        <CardContent className="p-5">
          <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
            {icon}
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold">{title}</div>
              <div className="text-xs text-muted-foreground">{desc}</div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card className="border-border/60">
      <CardContent className="p-5">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="mt-1 text-3xl font-semibold tracking-tight">{value}</div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "succeeded")
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400">
        <CheckCircle2 className="h-3 w-3" /> done
      </span>
    );
  if (status === "failed")
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-destructive/10 px-2 py-0.5 text-xs text-destructive">
        <XCircle className="h-3 w-3" /> failed
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-xs text-amber-400">
      <Loader2 className="h-3 w-3 animate-spin" /> {status}
    </span>
  );
}
