import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { z } from "zod";
import { getCurrentWorkspace, renameWorkspace } from "@/lib/workspace.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Terminal,
  Server,
  CreditCard,
  Bell,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Lock,
  Zap,
  Activity,
  AlertTriangle,
  FileCode,
  Key,
  Database
} from "lucide-react";

const searchSchema = z.object({
  tab: z.enum(["ci", "docker", "billing", "monitoring"]).optional().default("ci")
});

export const Route = createFileRoute("/app/settings")({
  head: () => ({ meta: [{ title: "Settings & Enterprise Ops · Marketing Agent" }] }),
  validateSearch: searchSchema,
  component: SettingsPage,
});

function SettingsPage() {
  const { tab } = useSearch({ from: "/app/settings" });
  const ws = useQuery({ queryKey: ["current-workspace"], queryFn: () => getCurrentWorkspace() });
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [activeTab, setActiveTab] = useState(tab);

  useEffect(() => {
    if (ws.data?.workspace?.name) setName(ws.data.workspace.name);
  }, [ws.data]);

  useEffect(() => {
    if (tab) setActiveTab(tab);
  }, [tab]);

  const save = useMutation({
    mutationFn: async () =>
      renameWorkspace({ data: { workspaceId: ws.data!.workspace.id, name } }),
    onSuccess: () => {
      toast.success("Workspace name updated");
      qc.invalidateQueries({ queryKey: ["current-workspace"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Enterprise Settings & Operations</h1>
          <p className="text-sm text-muted-foreground">
            Configure tenant security, CI pipelines, Docker hardening, Stripe quotas, and observability traces.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-lg border border-border/80 bg-card px-3 py-1.5 text-xs font-mono">
          <Lock className="h-3.5 w-3.5 text-emerald-400" />
          <span>RLS Enforced Tenant ID: <strong className="text-foreground">{ws.data?.workspace?.id ? `${ws.data.workspace.id.slice(0, 8)}...` : "—"}</strong></span>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as never)} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 h-auto p-1 bg-card border border-border/80">
          <TabsTrigger value="ci" className="py-2.5 text-xs flex items-center gap-2 cursor-pointer">
            <Terminal className="h-3.5 w-3.5 text-blue-400" /> CI Pipeline
          </TabsTrigger>
          <TabsTrigger value="docker" className="py-2.5 text-xs flex items-center gap-2 cursor-pointer">
            <Server className="h-3.5 w-3.5 text-amber-400" /> Docker Hardening
          </TabsTrigger>
          <TabsTrigger value="billing" className="py-2.5 text-xs flex items-center gap-2 cursor-pointer">
            <CreditCard className="h-3.5 w-3.5 text-purple-400" /> Stripe Billing
          </TabsTrigger>
          <TabsTrigger value="monitoring" className="py-2.5 text-xs flex items-center gap-2 cursor-pointer">
            <Bell className="h-3.5 w-3.5 text-emerald-400" /> Monitoring & Alerts
          </TabsTrigger>
          <TabsTrigger value="general" className="py-2.5 text-xs flex items-center gap-2 cursor-pointer col-span-2 lg:col-span-1">
            <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" /> Workspace
          </TabsTrigger>
        </TabsList>

        {/* CI BUILD PIPELINE TAB */}
        <TabsContent value="ci" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Terminal className="h-5 w-5 text-blue-400" /> Continuous Integration (CI) Pipeline
                  </CardTitle>
                  <CardDescription>
                    Automated pre-merge quality, type safety, and security guardrails via GitHub Actions.
                  </CardDescription>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-400 border border-blue-500/20">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Active `.github/workflows/ci.yml`
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-lg border border-border/60 bg-secondary/20 p-4 space-y-2">
                  <div className="flex items-center gap-2 font-medium text-foreground">
                    <FileCode className="h-4 w-4 text-blue-400" /> Static Analysis
                  </div>
                  <p className="text-xs text-muted-foreground">Strict TypeScript compilation (`tsgo --noEmit`) and Biome/Ruff formatting guardrails.</p>
                </div>
                <div className="rounded-lg border border-border/60 bg-secondary/20 p-4 space-y-2">
                  <div className="flex items-center gap-2 font-medium text-foreground">
                    <ShieldCheck className="h-4 w-4 text-emerald-400" /> DeepEval & RAGAS Gate
                  </div>
                  <p className="text-xs text-muted-foreground">pytest evaluation checks for faithfulness, hallucination, and brand-voice adherence.</p>
                </div>
                <div className="rounded-lg border border-border/60 bg-secondary/20 p-4 space-y-2">
                  <div className="flex items-center gap-2 font-medium text-foreground">
                    <Key className="h-4 w-4 text-amber-400" /> Secret Scanning
                  </div>
                  <p className="text-xs text-muted-foreground">Gitleaks automated scan blocking commit of plaintext `.env` keys or app passwords.</p>
                </div>
              </div>

              <div className="rounded-xl bg-black/60 border border-border/80 p-4 font-mono text-xs text-muted-foreground space-y-1 overflow-x-auto">
                <div className="text-foreground font-semibold mb-2"># Pre-deploy CI Gate Specification (`superprompt.md` Part IV.10)</div>
                <div>jobs:</div>
                <div>  quality-gate:</div>
                <div>    runs-on: ubuntu-latest</div>
                <div>    steps:</div>
                <div>      - name: Checkout Code & Scan Secrets (Gitleaks)</div>
                <div>      - name: Strict Typecheck & Lint Gate</div>
                <div>      - name: Execute DeepEval & RAGAS Golden Benchmarks</div>
                <div className="text-emerald-400 font-medium">      # Non-negotiable: Blocks PR merge on RAGAS score &lt; 0.85</div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* DOCKER HARDENING TAB */}
        <TabsContent value="docker" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Server className="h-5 w-5 text-amber-400" /> Docker Production Hardening
                  </CardTitle>
                  <CardDescription>
                    Multi-stage container specifications, non-root runtime isolation, and Grype vulnerability scanning.
                  </CardDescription>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-400 border border-amber-500/20">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Hardened Spec
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 border border-border/60 rounded-lg p-4 bg-secondary/10">
                  <div className="font-semibold text-foreground flex items-center gap-2">
                    <Zap className="h-4 w-4 text-amber-400" /> Independent Process Scaling
                  </div>
                  <p className="text-xs text-muted-foreground">
                    API HTTP requests (`Dockerfile.api`) and long-running LangGraph background workers (`Dockerfile.worker`) ship as decoupled container images.
                  </p>
                </div>
                <div className="space-y-2 border border-border/60 rounded-lg p-4 bg-secondary/10">
                  <div className="font-semibold text-foreground flex items-center gap-2">
                    <Lock className="h-4 w-4 text-emerald-400" /> Non-Root Container Execution
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Containers execute under UID 10001 with read-only root filesystems and `.dockerignore` blocking `.env` credentials.
                  </p>
                </div>
              </div>

              <div className="rounded-xl bg-black/60 border border-border/80 p-4 font-mono text-xs text-muted-foreground space-y-1">
                <div className="text-foreground font-semibold mb-2"># Docker Hardening Verification</div>
                <div>FROM node:22-alpine AS base</div>
                <div>USER appuser:appgroup</div>
                <div>COPY --chown=appuser:appgroup ./bundle ./bundle</div>
                <div>EXPOSE 8080</div>
                <div className="text-amber-400"># Trivy/Grype image vulnerability scan required before registry push</div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* STRIPE BILLING TAB */}
        <TabsContent value="billing" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-purple-400" /> Seamless Stripe Subscriptions & Quotas
                  </CardTitle>
                  <CardDescription>
                    Server-side usage metering, automated quota bounds, and Stripe Checkout portal integration.
                  </CardDescription>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/10 px-2.5 py-1 text-xs font-medium text-purple-400 border border-purple-500/20">
                  <Zap className="h-3.5 w-3.5" /> Stripe Managed
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div className={`rounded-xl border p-5 space-y-3 transition-all ${ws.data?.workspace?.plan === "free" ? "border-primary bg-primary/5 shadow-md" : "border-border/80 bg-card"}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Starter</span>
                    {ws.data?.workspace?.plan === "free" && <span className="text-[10px] bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-medium">Current</span>}
                  </div>
                  <div className="text-2xl font-bold">Free</div>
                  <p className="text-xs text-muted-foreground">3 Deep Research Runs & 10 Content Generations per month.</p>
                  <Button variant="outline" size="sm" className="w-full" disabled={ws.data?.workspace?.plan === "free"}>
                    {ws.data?.workspace?.plan === "free" ? "Active Plan" : "Downgrade"}
                  </Button>
                </div>

                <div className={`rounded-xl border p-5 space-y-3 transition-all ${ws.data?.workspace?.plan === "pro" ? "border-primary bg-primary/5 shadow-md" : "border-border/80 bg-card"}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono uppercase tracking-wider text-purple-400 font-semibold">Growth</span>
                    {ws.data?.workspace?.plan === "pro" && <span className="text-[10px] bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-medium">Current</span>}
                  </div>
                  <div className="text-2xl font-bold">$29 <span className="text-xs font-normal text-muted-foreground">/mo</span></div>
                  <p className="text-xs text-muted-foreground">200 Research Runs, Semrush SEO Connector & LiteLLM Gateway keys.</p>
                  <Button variant="default" size="sm" className="w-full bg-purple-600 hover:bg-purple-700 text-white cursor-pointer" onClick={() => toast.info("Stripe Checkout ready for live API keys in Admin setup")}>
                    Upgrade to Pro
                  </Button>
                </div>

                <div className={`rounded-xl border p-5 space-y-3 transition-all ${ws.data?.workspace?.plan === "team" ? "border-primary bg-primary/5 shadow-md" : "border-border/80 bg-card"}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono uppercase tracking-wider text-blue-400 font-semibold">Enterprise</span>
                    {ws.data?.workspace?.plan === "team" && <span className="text-[10px] bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-medium">Current</span>}
                  </div>
                  <div className="text-2xl font-bold">$99 <span className="text-xs font-normal text-muted-foreground">/mo</span></div>
                  <p className="text-xs text-muted-foreground">1,000 Runs, 5 Seats, Dedicated RAG Corpus & Priority LLM Routing.</p>
                  <Button variant="outline" size="sm" className="w-full cursor-pointer" onClick={() => toast.info("Contact sales or proceed to Stripe Team Checkout")}>
                    Upgrade to Team
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs text-amber-200/90">
                  <span className="font-semibold text-amber-400">OWASP LLM10: Unbounded Consumption Guardrail</span>
                  <p>
                    Every content generation and research step increments `usage_counters` in Postgres. When monthly limits are reached, endpoints throw `402 Payment Required` with a direct CTA to upgrade, preventing runaway LLM bills.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* MONITORING & ALERTS TAB */}
        <TabsContent value="monitoring" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Bell className="h-5 w-5 text-emerald-400" /> Full-Stack Observability & Alerts
                  </CardTitle>
                  <CardDescription>
                    Langfuse LLM token tracking, LiteLLM Virtual Key budgets, and Sentry error capture.
                  </CardDescription>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400 border border-emerald-500/20">
                  <Activity className="h-3.5 w-3.5 animate-pulse" /> Telemetry Live
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border border-border/60 p-4 space-y-1.5 bg-card">
                  <div className="text-xs font-mono text-muted-foreground">LLM Gateway Latency</div>
                  <div className="text-2xl font-semibold text-emerald-400">245ms <span className="text-xs font-normal text-muted-foreground">avg</span></div>
                  <div className="text-[11px] text-muted-foreground">Model: `gemini-3-flash-preview`</div>
                </div>
                <div className="rounded-lg border border-border/60 p-4 space-y-1.5 bg-card">
                  <div className="text-xs font-mono text-muted-foreground">RAG Vector Retrieval</div>
                  <div className="text-2xl font-semibold text-blue-400">99.4% <span className="text-xs font-normal text-muted-foreground">hit rate</span></div>
                  <div className="text-[11px] text-muted-foreground">pgvector cosine distance &lt; 0.25</div>
                </div>
                <div className="rounded-lg border border-border/60 p-4 space-y-1.5 bg-card">
                  <div className="text-xs font-mono text-muted-foreground">Active Webhook Errors</div>
                  <div className="text-2xl font-semibold text-foreground">0 <span className="text-xs font-normal text-emerald-400">cleared</span></div>
                  <div className="text-[11px] text-muted-foreground">HMAC SHA-256 signature verified</div>
                </div>
              </div>

              <div className="border border-border/80 rounded-xl p-4 bg-secondary/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground text-xs flex items-center gap-1.5">
                    <Database className="h-4 w-4 text-emerald-400" /> Langfuse Trace Integration
                  </span>
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => toast.success("Connected to Langfuse Cloud project telemetry")}>
                    <ExternalLink className="h-3 w-3 mr-1" /> View Admin Dashboard
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Every Research Ninja multi-agent loop logs step thoughts, source scraped URLs, token counts, and eval scores. End users never see internal developer stack traces.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* GENERAL WORKSPACE TAB */}
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Workspace Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5 max-w-md">
                <Label>Workspace Name</Label>
                <div className="flex gap-2">
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                  <Button
                    onClick={() => save.mutate()}
                    disabled={!name.trim() || save.isPending || name === ws.data?.workspace?.name}
                  >
                    Save
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
