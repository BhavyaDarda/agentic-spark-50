import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Sparkles,
  Microscope,
  Building2,
  Megaphone,
  ShieldCheck,
  Bot,
  Database,
  Zap,
  Globe,
  TrendingUp,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Marketing Agent — Enterprise AI Marketing Suite" },
      {
        name: "description",
        content:
          "An enterprise-grade AI marketing platform: multi-agent research, on-brand content generation, campaign planning, and SEO insights — all in one secure workspace.",
      },
    ],
  }),
  component: Landing,
});

const AGENT_STAGES = [
  { name: "Planner", state: "active" as const },
  { name: "Searcher", state: "queued" as const },
  { name: "Reader", state: "queued" as const },
  { name: "Synthesis", state: "queued" as const },
  { name: "Critic", state: "queued" as const },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30 selection:text-primary">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md border border-primary/30 bg-primary/10 text-primary">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="text-display font-semibold tracking-tight">Marketing Agent</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="#features" className="hover:text-foreground">Features</a>
            <a href="#agents" className="hover:text-foreground">Agents</a>
            <a href="#security" className="hover:text-foreground">Security</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/auth">
              <Button variant="ghost" size="sm">Sign in</Button>
            </Link>
            <Link to="/auth" search={{ mode: "signup" }}>
              <Button size="sm">
                Get started
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Atmospheric backdrop */}
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="signal-drift-a absolute -left-1/4 -top-1/4 h-[80vw] w-[80vw]" />
          <div className="signal-drift-b absolute -bottom-1/4 -right-1/4 h-[80vw] w-[80vw]" />
          <div className="scanlines absolute inset-0 opacity-40" />
          <div className="bg-grid absolute inset-0 opacity-60 [mask-image:radial-gradient(60%_60%_at_50%_30%,black,transparent)]" />
        </div>

        <div className="relative z-10 mx-auto flex max-w-6xl flex-col items-start gap-12 px-6 pb-16 pt-20 md:pt-28">
          {/* Meta chip */}
          <div className="inline-flex items-center gap-3 rounded-full border border-border/60 bg-card/40 px-3 py-1.5 backdrop-blur-md">
            <span className="flex items-center gap-2 text-mono text-[11px] uppercase tracking-[0.08em] text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_var(--color-primary)]" />
              New
            </span>
            <span className="h-3 w-px bg-border" />
            <span className="text-sm text-muted-foreground">
              Research Ninja v3 — multi-agent research loop
            </span>
          </div>

          {/* Headline */}
          <div className="max-w-4xl">
            <h1 className="text-display text-5xl font-bold leading-[0.95] tracking-[-0.04em] md:text-7xl lg:text-[92px]">
              Enterprise AI
              <br />
              <span className="text-muted-foreground">built to execute.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-base text-muted-foreground md:text-lg">
              A single prompt window backed by a coordinated agent team — research, brand-aware
              copy, campaigns, and SEO — all under one secure workspace.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/auth" search={{ mode: "signup" }}>
                <Button size="lg" className="rounded-full px-7 shadow-[0_0_24px_-4px_var(--color-primary)]">
                  Start free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <a href="#features">
                <Button size="lg" variant="outline" className="rounded-full border-border/60 bg-card/40 px-7 backdrop-blur">
                  See it work
                </Button>
              </a>
            </div>
          </div>

          {/* Liquid glass composer mock */}
          <div className="group relative w-full">
            <div className="glass-surface relative overflow-hidden rounded-2xl p-1">
              <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
              <div className="flex flex-col gap-6 rounded-[14px] bg-background/40 p-6">
                {/* Composer header */}
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <span className="h-3 w-3 rounded-full bg-foreground/5" />
                    <span className="h-3 w-3 rounded-full bg-foreground/5" />
                    <span className="h-3 w-3 rounded-full bg-foreground/5" />
                  </div>
                  <span className="text-mono text-[11px] uppercase tracking-widest text-muted-foreground/70">
                    Marketing Agent / Composer
                  </span>
                </div>

                {/* Typing input */}
                <div className="flex items-start gap-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <div className="text-mono text-[10px] uppercase tracking-widest text-muted-foreground/70">
                      Prompt
                    </div>
                    <div className="mt-1 flex items-center text-xl text-foreground md:text-2xl">
                      <span>Draft a Q1 launch campaign for our fintech beta.</span>
                      <span
                        className="ml-1 inline-block h-6 w-[2px] bg-primary"
                        style={{ animation: "caret-blink 0.9s infinite" }}
                      />
                    </div>
                  </div>
                </div>

                {/* Agent stream chips */}
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  {AGENT_STAGES.map((a, i) => {
                    const active = a.state === "active";
                    return (
                      <div
                        key={a.name}
                        className={
                          active
                            ? "flex items-center gap-2 rounded-lg border border-primary/25 bg-primary/10 px-3 py-1.5"
                            : "flex items-center gap-2 rounded-lg border border-border/60 bg-card/40 px-3 py-1.5 opacity-50"
                        }
                        style={active ? { animation: "signal-stream 2.4s ease-in-out infinite" } : undefined}
                      >
                        <span className="text-mono text-[10px] tracking-widest text-muted-foreground">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span
                          className={
                            active
                              ? "h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_var(--color-primary)]"
                              : "h-1.5 w-1.5 rounded-full bg-foreground/20"
                          }
                        />
                        <span
                          className={
                            active
                              ? "text-mono text-[10px] uppercase tracking-wider text-primary"
                              : "text-mono text-[10px] uppercase tracking-wider text-muted-foreground"
                          }
                        >
                          {a.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Floating status tag */}
            <div className="glass-surface absolute -bottom-4 -right-4 hidden items-center gap-4 rounded-xl px-4 py-3 sm:flex">
              <div className="flex flex-col">
                <span className="text-mono text-[10px] uppercase tracking-widest text-muted-foreground/70">
                  Success rate
                </span>
                <span className="text-display text-lg font-bold text-primary">99.2%</span>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/30 bg-primary/5 text-primary">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
          </div>

          {/* Bottom meta strip */}
          <div className="mt-8 flex w-full flex-col items-start justify-between gap-3 border-t border-border/60 pt-6 opacity-70 md:flex-row md:items-center">
            <div className="flex flex-wrap gap-x-10 gap-y-2 text-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              <span>SLA: 99.99%</span>
              <span>GDPR compliant</span>
              <span>SOC 2 Type II</span>
              <span>RLS-enforced tenancy</span>
            </div>
            <div className="text-sm text-muted-foreground">
              Trusted by 450+ high-growth marketing teams
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-border/60 bg-card/20">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mb-10 max-w-2xl">
            <div className="text-mono text-[11px] uppercase tracking-widest text-primary/80">
              Capabilities
            </div>
            <h2 className="text-display mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
              One prompt window. Every marketing surface.
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { icon: Sparkles, title: "Content Studio", desc: "Blogs, ads, social, email, video scripts — all on-brand, one prompt away." },
              { icon: Microscope, title: "Research Ninja", desc: "Embedded multi-agent research loop with live planning, browsing, and synthesis." },
              { icon: Megaphone, title: "Campaign Planner", desc: "Full briefs with calendars, channel mix, budget and KPI projections." },
              { icon: Building2, title: "Brand Memory", desc: "Define voice, audience and guardrails once — every agent stays in tune." },
              { icon: Database, title: "RAG Knowledge", desc: "Vector-backed memory so every insight compounds across projects." },
              { icon: ShieldCheck, title: "Enterprise Security", desc: "Workspace isolation, RLS-protected data, role-based access and audit logs." },
            ].map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="glass-surface group relative rounded-xl p-6 transition-colors hover:border-primary/30"
                >
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md border border-primary/25 bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-display font-semibold tracking-tight">{f.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Agents */}
      <section id="agents" className="border-t border-border/60">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mb-10 text-center">
            <div className="text-mono text-[11px] uppercase tracking-widest text-primary/80">
              Under the hood
            </div>
            <h2 className="text-display mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
              A coordinated team of specialists.
            </h2>
            <p className="mt-2 text-muted-foreground">
              You see a chat. Behind it, five agents ship the work.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-5">
            {[
              { name: "Planner", desc: "Breaks goals into search plans." },
              { name: "Searcher", desc: "Scours the web in parallel." },
              { name: "Reader", desc: "Extracts and cleans pages." },
              { name: "Synthesizer", desc: "Writes the cited report." },
              { name: "Critic", desc: "Scores quality before delivery." },
            ].map((a, i) => (
              <div
                key={a.name}
                className="glass-surface rounded-xl p-4 text-center"
              >
                <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-md border border-primary/25 bg-primary/10 text-mono text-xs text-primary">
                  0{i + 1}
                </div>
                <div className="text-display text-sm font-semibold">{a.name}</div>
                <div className="mt-1 text-xs text-muted-foreground">{a.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security */}
      <section id="security" className="border-t border-border/60 bg-card/20">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mb-10 max-w-2xl">
            <div className="text-mono text-[11px] uppercase tracking-widest text-primary/80">
              Non-negotiable
            </div>
            <h2 className="text-display mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
              Enterprise-grade security, by default.
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { icon: ShieldCheck, title: "RLS by default", desc: "Every row scoped to a workspace." },
              { icon: Bot, title: "Audited agents", desc: "Every step traced and inspectable." },
              { icon: Zap, title: "Streaming first", desc: "Watch outputs render as they happen." },
              { icon: Globe, title: "Multi-tenant", desc: "Isolated workspaces in seconds." },
              { icon: Database, title: "Vector memory", desc: "pgvector embeddings, plug-in ready." },
              { icon: Sparkles, title: "Model-agnostic", desc: "Powered by Lovable AI Gateway." },
            ].map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="flex gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-primary/25 bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-display font-semibold">{f.title}</div>
                    <div className="text-sm text-muted-foreground">{f.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-xs text-muted-foreground md:flex-row">
          <div>© {new Date().getFullYear()} Marketing Agent · All rights reserved.</div>
          <div className="text-mono">Built on Lovable Cloud</div>
        </div>
      </footer>
    </div>
  );
}
