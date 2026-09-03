import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Microscope,
  Building2,
  Megaphone,
  ShieldCheck,
  Database,
  TrendingUp,
  Zap,
  Check,
  ArrowUpRight,
} from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Marketing Agent — the AI marketing operator" },
      {
        name: "description",
        content:
          "One prompt window. A coordinated team of AI agents plans, researches, and ships on-brand marketing work — with citations, brand memory, and enterprise-grade security.",
      },
      { property: "og:title", content: "Marketing Agent" },
      {
        property: "og:description",
        content: "One prompt. Five specialist agents. On-brand marketing work with citations.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: Landing,
});

const PROMPTS = [
  "Draft a Q1 launch campaign for our fintech beta.",
  "Research the top 5 competitors in vertical SaaS.",
  "Rewrite the pricing page in a sharper voice.",
  "Plan a 6-week content calendar around GA release.",
];

const AGENTS = [
  { code: "01", name: "Planner", role: "Breaks the goal into a search plan." },
  { code: "02", name: "Searcher", role: "Runs parallel web queries." },
  { code: "03", name: "Reader", role: "Extracts and cleans source pages." },
  { code: "04", name: "Synthesizer", role: "Writes the cited brief." },
  { code: "05", name: "Critic", role: "Scores quality before delivery." },
];

const MARQUEE = [
  "CITED RESEARCH",
  "BRAND MEMORY",
  "SIX AGENTS",
  "PUBLIC REPORTS",
  "CRITIC SCORES",
  "NO PIXELS",
  "FREE FOREVER",
];

function Landing() {
  return (
    <div className="relative min-h-screen overflow-x-clip bg-background text-foreground">
      <Nav />
      <Hero />
      <Marquee />
      <Loop />
      <Capabilities />
      <AgentLineup />
      <Security />
      <WhyFree />
      <CtaFooter />
    </div>
  );
}

/* ────────────────────────────── shared ────────────────────────────── */

function Glyph({ className = "" }: { className?: string }) {
  return (
    <div
      className={
        "brut flex h-11 w-11 -rotate-12 items-center justify-center bg-primary" + className
      }
    >
      <Zap className="h-6 w-6 text-primary-foreground" strokeWidth={3} />
    </div>
  );
}

function Chip({
  children,
  tone = "secondary",
}: {
  children: React.ReactNode;
  tone?: "secondary" | "primary" | "accent";
}) {
  const bg =
    tone === "primary"
      ? "bg-primary text-primary-foreground"
      : tone === "accent"
        ? "bg-accent text-accent-foreground"
        : "bg-secondary text-secondary-foreground";
  return (
    <span
      className={`inline-flex items-center gap-1.5 border-[3px] border-border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] ${bg}`}
    >
      {children}
    </span>
  );
}

function SectionLabel({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <div className="mb-6 flex items-center gap-3">
      <span className="brut-sm bg-foreground px-2 py-0.5 font-mono text-[11px] font-bold text-background">
        {n}
      </span>
      <span className="font-mono text-[11px] font-bold uppercase tracking-[0.24em]">
        {children}
      </span>
      <span className="h-1 flex-1 bg-border" />
    </div>
  );
}

/* ────────────────────────────── nav ────────────────────────────── */

function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b-[6px] border-border bg-background">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center gap-3">
          <Glyph />
          <span className="font-display text-base font-black uppercase tracking-tighter sm:text-lg">
            Marketing Agent
          </span>
        </Link>
        <nav className="hidden items-center gap-6 lg:flex">
          {[
            ["#loop", "The loop"],
            ["#capabilities", "Capabilities"],
            ["#agents", "Agents"],
            ["#security", "Security"],
            ["#free", "Why free"],
          ].map(([href, label]) => (
            <a
              key={href}
              href={href}
              className="font-display text-xs font-black uppercase tracking-wide hover:text-primary"
            >
              {label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/auth">
            <Button variant="ghost" size="sm">
              Sign in
            </Button>
          </Link>
          <Link to="/auth" search={{ mode: "signup" }}>
            <Button size="sm">Get started</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}

/* ────────────────────────────── hero ────────────────────────────── */

function Hero() {
  return (
    <section className="relative overflow-hidden border-b-[6px] border-border">
      <div className="pointer-events-none absolute inset-0 brutal-dots" aria-hidden />
      <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.05fr_1fr] lg:items-start">
        <div>
          <div className="flex flex-wrap gap-2">
            <Chip tone="primary">one prompt window</Chip>
            <Chip>six agents</Chip>
            <Chip tone="accent">free, sponsor-funded</Chip>
          </div>

          <h1 className="mt-6 font-display text-[clamp(2.4rem,7vw,4.6rem)] font-black uppercase leading-[0.92] tracking-[-0.04em]">
            The marketing
            <br />
            team that
            <br />
            <span className="inline-block bg-primary px-2 text-primary-foreground">
              actually ships.
            </span>
          </h1>

          <p className="mt-6 max-w-lg text-base leading-relaxed">
            Type what you need. A coordinated crew of specialists plans, researches the live web,
            writes on-brand, and scores its own work before you ever see it — with every claim
            traceable to a source.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/auth" search={{ mode: "signup" }}>
              <Button size="lg">
                Start free <ArrowRight className="ml-1" strokeWidth={3} />
              </Button>
            </Link>
            <a href="#loop">
              <Button size="lg" variant="outline">
                See the loop
              </Button>
            </a>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[11px] font-bold uppercase tracking-widest">
            {["No credit card", "No exposed keys", "RLS on every table"].map((t) => (
              <span key={t} className="inline-flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-primary" strokeWidth={4} /> {t}
              </span>
            ))}
          </div>
        </div>

        <LiveComposer />
      </div>
    </section>
  );
}

function LiveComposer() {
  const [i, setI] = useState(0);
  const [typed, setTyped] = useState("");

  useEffect(() => {
    const full = PROMPTS[i]!;
    if (typed.length < full.length) {
      const t = setTimeout(() => setTyped(full.slice(0, typed.length + 1)), 32);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      setTyped("");
      setI((p) => (p + 1) % PROMPTS.length);
    }, 2200);
    return () => clearTimeout(t);
  }, [typed, i]);

  return (
    <div className="brut-lg bg-card">
      <div className="flex items-center justify-between border-b-[4px] border-border bg-foreground px-3 py-2">
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-background">
          agent console
        </span>
        <span className="flex gap-1.5">
          <span className="h-3 w-3 border-2 border-background bg-primary" />
          <span className="h-3 w-3 border-2 border-background bg-secondary" />
          <span className="h-3 w-3 border-2 border-background bg-accent" />
        </span>
      </div>

      <div className="p-4">
        <div className="brut-sm bg-input p-3">
          <p className="font-mono text-sm">
            {typed}
            <span className="ml-0.5 inline-block h-4 w-[9px] translate-y-0.5 bg-primary [animation:caret-blink_1s_step-end_infinite]" />
          </p>
        </div>

        <div className="mt-4 space-y-2">
          {AGENTS.map((a, idx) => (
            <div
              key={a.code}
              className="brut-sm flex items-center gap-3 bg-background px-3 py-2"
              style={{ marginLeft: `${idx * 6}px` }}
            >
              <span className="border-[3px] border-border bg-secondary px-1.5 font-mono text-[10px] font-bold">
                {a.code}
              </span>
              <span className="font-display text-xs font-black uppercase">{a.name}</span>
              <span className="ml-auto hidden font-mono text-[10px] uppercase tracking-widest sm:inline">
                {idx === 0 ? "running" : "queued"}
              </span>
            </div>
          ))}
        </div>

        <div className="brut-seam mt-4 flex flex-wrap items-center gap-2 pt-3">
          <Chip>critic 87</Chip>
          <Chip>14 sources</Chip>
          <Chip tone="accent">2m 41s</Chip>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────── marquee ────────────────────────────── */

function Marquee() {
  const items = [...MARQUEE, ...MARQUEE];
  return (
    <div className="overflow-hidden border-b-[6px] border-border bg-secondary py-2">
      <div className="flex w-max animate-marquee items-center gap-6">
        {items.map((t, i) => (
          <span
            key={`${t}-${i}`}
            className="flex items-center gap-6 font-display text-sm font-black uppercase tracking-tight text-secondary-foreground"
          >
            {t} <span className="h-3 w-3 rotate-45 bg-foreground" />
          </span>
        ))}
      </div>
    </div>
  );
}

/* ────────────────────────────── loop ────────────────────────────── */

const LOOP = [
  { t: "Ask", d: "One prompt window. No settings to learn, no keys to paste." },
  { t: "Research", d: "Agents search the live web, read sources, and cite everything." },
  { t: "Ship", d: "Campaigns, briefs and copy land as artifacts you can edit." },
  { t: "Publish", d: "Any report becomes a public, citable page at /r/your-slug." },
  { t: "Measure", d: "Critic scores, sources, run cost and duration — all on the record." },
];

function Loop() {
  return (
    <section id="loop" className="border-b-[6px] border-border">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20">
        <SectionLabel n="01">The loop</SectionLabel>
        <h2 className="max-w-2xl font-display text-[clamp(1.8rem,4vw,3rem)] font-black uppercase leading-[0.95] tracking-[-0.03em]">
          Generate, publish, prove it worked.
        </h2>
        <p className="mt-4 max-w-xl">
          Every other tool stops at the dashboard. We close the loop: the work leaves the app as a
          citable artifact, and the receipts travel with it.
        </p>

        <div className="mt-10 grid gap-0 sm:grid-cols-2 lg:grid-cols-5">
          {LOOP.map((s, i) => (
            <div
              key={s.t}
              className="border-[3px] border-border bg-card p-5 [&:not(:first-child)]:lg:border-l-0"
            >
              <span className="font-mono text-[11px] font-bold tracking-widest">0{i + 1}</span>
              <h3 className="mt-2 font-display text-lg font-black uppercase">{s.t}</h3>
              <p className="mt-2 text-sm leading-relaxed">{s.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────── capabilities ────────────────────────────── */

const CAPS = [
  {
    icon: Microscope,
    title: "Research Ninja",
    body: "Six-agent research runs with planner, searcher, reader, synthesizer, critic and writer. Every claim carries a source.",
    tone: "bg-primary text-primary-foreground",
    wide: true,
  },
  {
    icon: Building2,
    title: "Brand memory",
    body: "Voice, audience, do/don't rules and knowledge base — applied to every output automatically.",
    tone: "bg-secondary text-secondary-foreground",
  },
  {
    icon: Megaphone,
    title: "Campaign planner",
    body: "Strategy, channel mix and a dated calendar, generated then editable.",
    tone: "bg-accent text-accent-foreground",
  },
  {
    icon: Database,
    title: "Knowledge base",
    body: "Drop in docs and URLs. Retrieval grounds the agents in your own material.",
    tone: "bg-card text-card-foreground",
  },
  {
    icon: TrendingUp,
    title: "Public reports",
    body: "Publish a run at /r/your-slug with the full trust surface: sources, searches, critic score, cost.",
    tone: "bg-card text-card-foreground",
    wide: true,
  },
];

function Capabilities() {
  return (
    <section id="capabilities" className="border-b-[6px] border-border bg-muted">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20">
        <SectionLabel n="02">Capabilities</SectionLabel>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {CAPS.map((c) => (
            <article
              key={c.title}
              className={`brut brut-press ${c.tone} p-6 ${c.wide ? "lg:col-span-2" : ""}`}
            >
              <div className="brut-sm inline-flex bg-background p-2 text-foreground">
                <c.icon className="h-5 w-5" strokeWidth={2.5} />
              </div>
              <h3 className="mt-4 font-display text-xl font-black uppercase tracking-tight">
                {c.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed">{c.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────── agents ────────────────────────────── */

function AgentLineup() {
  return (
    <section id="agents" className="border-b-[6px] border-border">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20">
        <SectionLabel n="03">The crew</SectionLabel>
        <h2 className="max-w-2xl font-display text-[clamp(1.8rem,4vw,3rem)] font-black uppercase leading-[0.95] tracking-[-0.03em]">
          Five specialists, one window.
        </h2>
        <div className="mt-10 divide-y-[4px] divide-border border-[4px] border-border">
          {AGENTS.map((a) => (
            <div
              key={a.code}
              className="flex flex-wrap items-center gap-4 bg-card px-4 py-4 hover:bg-secondary"
            >
              <span className="font-display text-3xl font-black tracking-tighter">{a.code}</span>
              <span className="font-display text-lg font-black uppercase">{a.name}</span>
              <span className="ml-auto text-sm">{a.role}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────── security ────────────────────────────── */

const SECURITY = [
  "Row-level security on every table, with explicit grants.",
  "No API keys in the browser. Every model call is server-side.",
  "SSRF-guarded fetching for web reads, knowledge ingestion and MCP.",
  "Per-workspace quotas and rate limits enforced on the server.",
  "Audit trail on sensitive actions. Roles held in a separate table.",
];

function Security() {
  return (
    <section id="security" className="border-b-[6px] border-border bg-foreground text-background">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-2">
        <div>
          <div className="mb-6 flex items-center gap-3">
            <span className="border-[3px] border-background bg-primary px-2 py-0.5 font-mono text-[11px] font-bold text-primary-foreground">
              04
            </span>
            <span className="font-mono text-[11px] font-bold uppercase tracking-[0.24em]">
              Security
            </span>
          </div>
          <h2 className="font-display text-[clamp(1.8rem,4vw,3rem)] font-black uppercase leading-[0.95] tracking-[-0.03em]">
            Boring where it counts.
          </h2>
          <p className="mt-4 max-w-md">
            Nothing developer-facing is exposed to your users. No keys, no raw settings, no escape
            hatches — just the prompt window and the work.
          </p>
        </div>
        <ul className="space-y-3">
          {SECURITY.map((s) => (
            <li
              key={s}
              className="flex items-start gap-3 border-[4px] border-background bg-foreground p-4"
            >
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" strokeWidth={2.5} />
              <span className="text-sm">{s}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ────────────────────────────── why free ────────────────────────────── */

function WhyFree() {
  return (
    <section id="free" className="border-b-[6px] border-border">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20">
        <SectionLabel n="05">Why it's free</SectionLabel>
        <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          <div className="brut bg-primary p-6 text-primary-foreground">
            <h2 className="font-display text-[clamp(1.6rem,3.5vw,2.4rem)] font-black uppercase leading-[0.95] tracking-[-0.03em]">
              No plans. No seats. No card.
            </h2>
            <p className="mt-4 text-sm leading-relaxed">
              Published reports carry exactly one clearly labelled sponsor card, beside the findings
              — never inside them. Sponsors cannot touch sources, wording or conclusions, and they
              never see the reader.
            </p>
            <Link to="/auth" search={{ mode: "signup" }} className="mt-6 inline-block">
              <Button variant="brutal" size="lg">
                Create a workspace <ArrowUpRight className="ml-1" strokeWidth={3} />
              </Button>
            </Link>
          </div>
          <ul className="grid gap-4">
            {[
              ["One card per report", "Served from our own database. No third-party scripts, no pixels."],
              ["Opt-in on heavy runs", "Deep research can be sponsor-covered — declining costs you nothing."],
              ["Fair-use allowance", "Generous limits for everyone, enforced server-side."],
            ].map(([t, d]) => (
              <li key={t} className="brut bg-card p-5">
                <h3 className="font-display text-base font-black uppercase">{t}</h3>
                <p className="mt-1.5 text-sm">{d}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────── footer ────────────────────────────── */

function CtaFooter() {
  return (
    <footer className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 brutal-dots" aria-hidden />
      <div className="relative mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 sm:py-24">
        <Glyph className="mx-auto animate-brutal-bounce" />
        <h2 className="mx-auto mt-8 max-w-3xl font-display text-[clamp(2rem,6vw,4rem)] font-black uppercase leading-[0.9] tracking-[-0.04em]">
          Stop briefing.
          <br />
          <span className="bg-secondary px-2 text-secondary-foreground">Start shipping.</span>
        </h2>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/auth" search={{ mode: "signup" }}>
            <Button size="lg">
              Get started free <ArrowRight className="ml-1" strokeWidth={3} />
            </Button>
          </Link>
          <Link to="/auth">
            <Button size="lg" variant="outline">
              Sign in
            </Button>
          </Link>
        </div>
        <p className="mt-12 border-t-[4px] border-border pt-6 font-mono text-[11px] font-bold uppercase tracking-[0.2em]">
          Marketing Agent · sponsor-funded, never paywalled
        </p>
      </div>
    </footer>
  );
}
