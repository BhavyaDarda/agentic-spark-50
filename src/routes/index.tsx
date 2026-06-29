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

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="font-semibold tracking-tight">Marketing Agent</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="#features" className="hover:text-foreground">
              Features
            </a>
            <a href="#agents" className="hover:text-foreground">
              Agents
            </a>
            <a href="#security" className="hover:text-foreground">
              Security
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/auth">
              <Button variant="ghost" size="sm">
                Sign in
              </Button>
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

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-60 [background:radial-gradient(60%_50%_at_50%_0%,hsl(var(--primary)/.18),transparent_70%)]" />
        <div className="mx-auto max-w-6xl px-4 pb-20 pt-20 text-center md:pt-28">
          <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-3 py-1 text-xs text-muted-foreground">
            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Multi-agent · RAG · Streaming · Enterprise-ready
          </div>
          <h1 className="mx-auto max-w-3xl text-4xl font-semibold tracking-tight md:text-6xl">
            The AI marketing team that works while you sleep.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground md:text-lg">
            Marketing Agent unifies on-brand content generation, deep research, and campaign
            planning into a single secure workspace — powered by a coordinated team of AI agents.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/auth" search={{ mode: "signup" }}>
              <Button size="lg" className="px-6">
                Start free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <a href="#features">
              <Button size="lg" variant="outline" className="px-6">
                See features
              </Button>
            </a>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Free tier · No credit card · Upgrade when you scale.
          </p>
        </div>
      </section>

      <section id="features" className="border-t border-border/60 bg-card/30">
        <div className="mx-auto grid max-w-6xl gap-4 px-4 py-16 md:grid-cols-3">
          {[
            {
              icon: Sparkles,
              title: "Content Studio",
              desc: "Blogs, ads, social, email, video scripts — all on-brand, with one click.",
            },
            {
              icon: Microscope,
              title: "Research Ninja",
              desc: "Multi-agent research loop with live planning, web search, and synthesis.",
            },
            {
              icon: Megaphone,
              title: "Campaign Planner",
              desc: "Generate full campaign briefs with calendar, channel mix, and KPIs.",
            },
            {
              icon: Building2,
              title: "Brand Memory",
              desc: "Define your brand once — every agent stays on voice and tone.",
            },
            {
              icon: Database,
              title: "RAG Knowledge",
              desc: "Vector-backed memory so insights compound across every project.",
            },
            {
              icon: ShieldCheck,
              title: "Enterprise security",
              desc: "Workspace isolation, RLS-protected data, role-based access.",
            },
          ].map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="rounded-xl border border-border/60 bg-card p-6 shadow-sm transition-colors hover:border-primary/40"
              >
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold tracking-tight">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section id="agents" className="border-t border-border/60">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
              A coordinated team of specialists.
            </h2>
            <p className="mt-2 text-muted-foreground">
              Each agent has a job. Together, they ship work that's actually usable.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-5">
            {[
              { name: "Planner", desc: "Breaks goals into search plans." },
              { name: "Searcher", desc: "Scours the web in parallel." },
              { name: "Reader", desc: "Extracts & cleans relevant pages." },
              { name: "Synthesizer", desc: "Writes the cited report." },
              { name: "Critic", desc: "Scores quality before delivery." },
            ].map((a, i) => (
              <div
                key={a.name}
                className="rounded-xl border border-border/60 bg-card p-4 text-center"
              >
                <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 font-mono text-xs text-primary">
                  0{i + 1}
                </div>
                <div className="text-sm font-semibold">{a.name}</div>
                <div className="mt-1 text-xs text-muted-foreground">{a.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="security" className="border-t border-border/60 bg-card/30">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-20 md:grid-cols-3">
          {[
            { icon: ShieldCheck, title: "RLS by default", desc: "Every row scoped to a workspace." },
            { icon: Bot, title: "Audited agents", desc: "Every step traced & inspectable." },
            { icon: Zap, title: "Streaming first", desc: "Watch outputs render as they happen." },
            { icon: Globe, title: "Multi-tenant", desc: "Spin up isolated workspaces in seconds." },
            { icon: Database, title: "Vector memory", desc: "pgvector embeddings, plug-in ready." },
            { icon: Sparkles, title: "Model-agnostic", desc: "Powered by Lovable AI Gateway." },
          ].map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="flex gap-3">
                <Icon className="mt-0.5 h-5 w-5 text-primary" />
                <div>
                  <div className="font-semibold">{f.title}</div>
                  <div className="text-sm text-muted-foreground">{f.desc}</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-xs text-muted-foreground md:flex-row">
          <div>© {new Date().getFullYear()} Marketing Agent · All rights reserved.</div>
          <div className="font-mono">Built on Lovable Cloud</div>
        </div>
      </footer>
    </div>
  );
}
