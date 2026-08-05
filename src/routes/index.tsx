import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Sparkles,
  Microscope,
  Building2,
  Megaphone,
  ShieldCheck,
  Database,
  TrendingUp,
  Command,
  Check,
  ArrowUpRight,
} from "lucide-react";
import { SignalShader } from "@/components/fx/SignalShader";
import { RevealText } from "@/components/fx/RevealText";
import { Magnetic } from "@/components/fx/Magnetic";
import { Marquee } from "@/components/fx/Marquee";
import { useEffect, useRef, useState } from "react";

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
        content:
          "One prompt. Five specialist agents. On-brand marketing work with citations.",
      },
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
  { code: "01", name: "Planner", role: "Breaks the goal into a search plan.", tone: "planner" },
  { code: "02", name: "Searcher", role: "Runs parallel web queries.", tone: "searcher" },
  { code: "03", name: "Reader", role: "Extracts and cleans source pages.", tone: "reader" },
  { code: "04", name: "Synthesizer", role: "Writes the cited brief.", tone: "synth" },
  { code: "05", name: "Critic", role: "Scores quality before delivery.", tone: "critic" },
];

function Landing() {
  return (
    <div className="relative min-h-screen overflow-x-clip bg-background text-foreground selection:bg-primary/30 selection:text-primary-foreground">
      <Nav />
      <Hero />
      <TrustStrip />
      <Loop />
      <Bento />
      <AgentLineup />
      <Security />
      <Pricing />
      <CtaFooter />
    </div>
  );
}

/* ────────────────────────────── nav ────────────────────────────── */

function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 12);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <header
      className={
        "sticky top-0 z-50 transition-all duration-500 " +
        (scrolled
          ? "border-b border-white/5 bg-background/70 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent")
      }
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <Glyph />
          <span className="text-display text-[15px] font-semibold tracking-tight">
            Marketing Agent
          </span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          <a href="#loop" className="transition-colors hover:text-foreground">The loop</a>
          <a href="#capabilities" className="transition-colors hover:text-foreground">Capabilities</a>
          <a href="#agents" className="transition-colors hover:text-foreground">Agents</a>
          <a href="#security" className="transition-colors hover:text-foreground">Security</a>
          <a href="#pricing" className="transition-colors hover:text-foreground">Pricing</a>
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/auth">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              Sign in
            </Button>
          </Link>
          <Link to="/auth" search={{ mode: "signup" }}>
            <Magnetic strength={0.2}>
              <Button
                size="sm"
                className="rounded-full bg-primary px-4 text-primary-foreground shadow-[0_0_0_1px_oklch(0.82_0.11_180/0.4),0_0_28px_-6px_oklch(0.82_0.11_180/0.7)]"
              >
                Get started
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </Magnetic>
          </Link>
        </div>
      </div>
    </header>
  );
}

function Glyph() {
  return (
    <div className="relative flex h-7 w-7 items-center justify-center">
      <div className="absolute inset-0 rounded-md border border-primary/40 bg-primary/10" />
      <svg viewBox="0 0 24 24" className="relative h-4 w-4 text-primary" fill="none">
        <path d="M4 12 L12 4 L20 12 L12 20 Z" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="12" cy="12" r="2.2" fill="currentColor" />
      </svg>
    </div>
  );
}

/* ────────────────────────────── hero ────────────────────────────── */

function Hero() {
  return (
    <section className="relative isolate min-h-[92vh] overflow-hidden">
      <SignalShader />
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-[0.35] [mask-image:radial-gradient(70%_60%_at_50%_35%,black,transparent)]" />
      <div className="pointer-events-none absolute inset-0 noise-overlay" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-background" />

      <div className="relative mx-auto flex max-w-7xl flex-col items-center px-6 pb-24 pt-28 text-center md:pt-36">
        <div className="glass-surface mb-8 inline-flex items-center gap-3 rounded-full px-3 py-1.5">
          <span className="flex h-1.5 w-1.5 items-center justify-center rounded-full bg-primary shadow-[0_0_10px_var(--color-primary)]" />
          <span className="text-mono text-[11px] uppercase tracking-[0.14em] text-primary">
            Research Ninja v3
          </span>
          <span className="h-3 w-px bg-white/15" />
          <span className="text-[12px] text-muted-foreground">Live multi-agent loop</span>
        </div>

        <h1 className="text-display max-w-5xl text-balance text-[clamp(2.75rem,7.2vw,7rem)] font-semibold leading-[0.95] tracking-[-0.045em]">
          <RevealText>The marketing team</RevealText>
          <br />
          <span className="inline-flex items-baseline gap-x-[0.28em]">
            <RevealText delay={0.15}>that</RevealText>
            <span
              className="font-serif-display text-primary"
              style={{
                textShadow: "0 0 40px oklch(0.82 0.11 180 / 0.45)",
              }}
            >
              actually
            </span>
            <RevealText delay={0.3}>ships.</RevealText>
          </span>
        </h1>

        <p className="mt-8 max-w-2xl text-balance text-[15px] leading-relaxed text-muted-foreground md:text-[17px]">
          One prompt window. Five specialist agents plan, research the live web, read the sources,
          and hand you cited, on-brand work in minutes — not weeks.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link to="/auth" search={{ mode: "signup" }}>
            <Magnetic>
              <Button
                size="lg"
                className="group rounded-full bg-primary px-7 text-primary-foreground shadow-[0_0_0_1px_oklch(0.82_0.11_180/0.4),0_10px_40px_-8px_oklch(0.82_0.11_180/0.55)]"
              >
                Start free
                <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Button>
            </Magnetic>
          </Link>
          <a href="#loop">
            <Button
              size="lg"
              variant="outline"
              className="rounded-full border-white/15 bg-white/[0.03] px-7 text-foreground backdrop-blur hover:bg-white/[0.06]"
            >
              See how the loop runs
            </Button>
          </a>
        </div>

        <div className="mt-16 w-full max-w-4xl">
          <LiveComposer />
        </div>
      </div>
    </section>
  );
}

/* Live-typing liquid-glass composer with animated agent trace. */
function LiveComposer() {
  const [promptIdx, setPromptIdx] = useState(0);
  const [typed, setTyped] = useState("");
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const prompt = PROMPTS[promptIdx];
    let i = 0;
    setTyped("");
    setStage(0);
    const typer = window.setInterval(() => {
      i++;
      setTyped(prompt.slice(0, i));
      if (i >= prompt.length) {
        window.clearInterval(typer);
        // step through agents
        let s = 0;
        const stepper = window.setInterval(() => {
          s++;
          setStage(s);
          if (s >= AGENTS.length) {
            window.clearInterval(stepper);
            window.setTimeout(
              () => setPromptIdx((p) => (p + 1) % PROMPTS.length),
              1600,
            );
          }
        }, 520);
      }
    }, 42);
    return () => window.clearInterval(typer);
  }, [promptIdx]);

  return (
    <div className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-6 rounded-[28px] bg-[radial-gradient(60%_60%_at_50%_0%,oklch(0.82_0.11_180/0.25),transparent_70%)] blur-2xl"
      />
      <div className="glass-surface relative overflow-hidden rounded-2xl">
        <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
        <div className="flex items-center justify-between border-b border-white/5 px-5 py-3">
          <div className="flex items-center gap-3">
            <Glyph />
            <span className="text-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              Composer / Session 4E-27
            </span>
          </div>
          <div className="hidden items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-mono text-[10px] uppercase tracking-widest text-muted-foreground md:inline-flex">
            <Command className="h-3 w-3" /> K
          </div>
        </div>

        <div className="grid gap-0 md:grid-cols-[1.15fr_1fr]">
          {/* left — prompt */}
          <div className="flex flex-col gap-6 border-b border-white/5 p-6 text-left md:border-b-0 md:border-r">
            <div>
              <div className="text-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">
                You
              </div>
              <div className="mt-2 min-h-[3.5rem] text-balance text-lg leading-snug text-foreground md:text-xl">
                {typed}
                <span
                  className="ml-0.5 inline-block h-5 w-[2px] translate-y-0.5 bg-primary align-middle"
                  style={{ animation: "caret-blink 0.9s infinite" }}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              <Chip>Brand: Acme Fintech</Chip>
              <Chip>Tone: sharp</Chip>
              <Chip>Cite sources</Chip>
            </div>
          </div>

          {/* right — agent trace */}
          <div className="p-6 text-left">
            <div className="text-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">
              Trace
            </div>
            <ol className="mt-2 space-y-2.5">
              {AGENTS.map((a, i) => {
                const running = stage === i;
                const done = stage > i;
                return (
                  <li
                    key={a.name}
                    className={
                      "flex items-center gap-3 rounded-lg border px-3 py-2 transition-all " +
                      (running
                        ? "border-primary/35 bg-primary/[0.06]"
                        : done
                          ? "border-white/8 bg-white/[0.02]"
                          : "border-white/5 bg-transparent opacity-55")
                    }
                  >
                    <span className="text-mono text-[10px] tracking-widest text-muted-foreground">
                      {a.code}
                    </span>
                    <span className="relative flex h-1.5 w-1.5 items-center justify-center">
                      {running && (
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-70" />
                      )}
                      <span
                        className={
                          "relative inline-flex h-1.5 w-1.5 rounded-full " +
                          (done || running
                            ? "bg-primary shadow-[0_0_8px_var(--color-primary)]"
                            : "bg-foreground/25")
                        }
                      />
                    </span>
                    <span
                      className={
                        "flex-1 text-mono text-[11px] uppercase tracking-wider " +
                        (running
                          ? "text-primary"
                          : done
                            ? "text-foreground"
                            : "text-muted-foreground")
                      }
                    >
                      {a.name}
                    </span>
                    {done && <Check className="h-3.5 w-3.5 text-primary/80" />}
                  </li>
                );
              })}
            </ol>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-white/5 px-5 py-3">
          <div className="text-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {stage < AGENTS.length ? "Working…" : "Delivered · 34 sources · 12s"}
          </div>
          <div className="flex items-center gap-2 text-mono text-[10px] uppercase tracking-widest text-primary">
            <TrendingUp className="h-3.5 w-3.5" /> 99.2% success
          </div>
        </div>
      </div>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1">
      {children}
    </span>
  );
}

/* ────────────────────────────── trust ────────────────────────────── */

function TrustStrip() {
  const logos = [
    "acme·fintech",
    "north / labs",
    "meridian",
    "poplar",
    "helix ai",
    "stack & co",
    "primer",
    "voyager",
  ];
  return (
    <section className="border-y border-white/5 bg-background/60 py-8">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-5 text-center text-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground/70">
          Marketing operators at
        </div>
        <Marquee speed={40}>
          {logos.map((l) => (
            <span
              key={l}
              className="text-display whitespace-nowrap text-2xl font-medium tracking-tight text-muted-foreground/60"
            >
              {l}
            </span>
          ))}
        </Marquee>
      </div>
    </section>
  );
}

/* ────────────────────────────── loop diagram ────────────────────────────── */

function Loop() {
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const onScroll = () => {
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const total = rect.height - vh;
      const scrolled = Math.min(Math.max(-rect.top, 0), Math.max(total, 1));
      setProgress(scrolled / Math.max(total, 1));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const active = Math.min(AGENTS.length - 1, Math.floor(progress * AGENTS.length));

  return (
    <section id="loop" ref={sectionRef} className="relative">
      <div className="sticky top-0 flex min-h-screen items-center">
        <div className="mx-auto grid w-full max-w-7xl gap-16 px-6 md:grid-cols-[0.9fr_1.1fr]">
          <div>
            <div className="text-mono text-[11px] uppercase tracking-[0.22em] text-primary/80">
              How the loop runs
            </div>
            <h2 className="text-display mt-3 text-balance text-4xl font-semibold leading-[1.02] tracking-[-0.03em] md:text-6xl">
              Five agents, one loop,
              <br />
              <span className="font-serif-display text-primary">every prompt.</span>
            </h2>
            <p className="mt-6 max-w-md text-muted-foreground">
              Watch the pipeline light up. Each stage is inspectable, cite-able, and re-runnable.
              You keep the reasoning trail — not just the answer.
            </p>
            <div className="mt-8 space-y-2">
              {AGENTS.map((a, i) => (
                <div
                  key={a.name}
                  className={
                    "flex items-baseline gap-4 border-l-2 py-1.5 pl-4 transition-all duration-500 " +
                    (i <= active
                      ? "border-primary text-foreground"
                      : "border-white/8 text-muted-foreground/60")
                  }
                >
                  <span className="text-mono text-[11px] tracking-widest">{a.code}</span>
                  <span className="text-display text-lg font-medium">{a.name}</span>
                  <span className="text-sm text-muted-foreground">{a.role}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative flex items-center justify-center">
            <LoopDiagram active={active} />
          </div>
        </div>
      </div>
      <div style={{ height: "180vh" }} />
    </section>
  );
}

function LoopDiagram({ active }: { active: number }) {
  const nodes = [
    { x: 50, y: 12 },
    { x: 88, y: 40 },
    { x: 74, y: 82 },
    { x: 26, y: 82 },
    { x: 12, y: 40 },
  ];
  return (
    <div className="relative aspect-square w-full max-w-xl">
      <div className="absolute inset-0 rounded-full border border-white/5" />
      <div
        className="absolute inset-8 rounded-full border border-primary/15"
        style={{ boxShadow: "inset 0 0 80px oklch(0.82 0.11 180 / 0.15)" }}
      />
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
        {nodes.map((n, i) => {
          const next = nodes[(i + 1) % nodes.length];
          const on = i <= active;
          return (
            <line
              key={i}
              x1={n.x}
              y1={n.y}
              x2={next.x}
              y2={next.y}
              stroke={on ? "oklch(0.82 0.11 180)" : "oklch(1 0 0 / 0.08)"}
              strokeWidth={on ? 0.4 : 0.25}
              strokeDasharray={on ? "0" : "1 1"}
              style={{ transition: "stroke 0.6s ease" }}
            />
          );
        })}
      </svg>
      {nodes.map((n, i) => {
        const on = i <= active;
        const running = i === active;
        return (
          <div
            key={i}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${n.x}%`, top: `${n.y}%` }}
          >
            <div
              className={
                "flex items-center gap-2 rounded-full border px-3 py-1.5 backdrop-blur-md transition-all duration-500 " +
                (on
                  ? "border-primary/40 bg-primary/[0.08]"
                  : "border-white/8 bg-white/[0.02] opacity-70")
              }
              style={
                running
                  ? { boxShadow: "0 0 24px -4px oklch(0.82 0.11 180 / 0.6)" }
                  : undefined
              }
            >
              <span className="text-mono text-[10px] tracking-widest text-muted-foreground">
                {AGENTS[i].code}
              </span>
              <span
                className={
                  "text-display text-xs font-medium " +
                  (on ? "text-primary" : "text-muted-foreground")
                }
              >
                {AGENTS[i].name}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ────────────────────────────── bento ────────────────────────────── */

function Bento() {
  return (
    <section id="capabilities" className="relative border-t border-white/5 bg-background py-28">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-14 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-xl">
            <div className="text-mono text-[11px] uppercase tracking-[0.22em] text-primary/80">
              Capabilities
            </div>
            <h2 className="text-display mt-3 text-balance text-4xl font-semibold leading-[1.02] tracking-[-0.03em] md:text-5xl">
              One prompt window.
              <br />
              <span className="font-serif-display text-primary">Every marketing surface.</span>
            </h2>
          </div>
          <p className="max-w-md text-muted-foreground">
            Content, research, campaigns, brand memory — coordinated inside one workspace, not
            stitched across seven SaaS tabs.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-6 md:grid-rows-2">
          <BentoCard
            className="md:col-span-4 md:row-span-1"
            icon={Sparkles}
            eyebrow="Content Studio"
            title="Ship blogs, ads, social, email, video scripts — all on-brand, one prompt away."
            tall
          />
          <BentoCard
            className="md:col-span-2 md:row-span-1"
            icon={Microscope}
            eyebrow="Research Ninja"
            title="Multi-agent research with live planning, browsing, and cited synthesis."
          />
          <BentoCard
            className="md:col-span-2 md:row-span-1"
            icon={Building2}
            eyebrow="Brand Memory"
            title="Define voice once. Every agent stays in tune."
          />
          <BentoCard
            className="md:col-span-2 md:row-span-1"
            icon={Megaphone}
            eyebrow="Campaign Planner"
            title="Full briefs with calendar, channel mix, budget, and KPI projections."
          />
          <BentoCard
            className="md:col-span-2 md:row-span-1"
            icon={Database}
            eyebrow="RAG Memory"
            title="Vector-backed memory. Every insight compounds across projects."
          />
        </div>
      </div>
    </section>
  );
}

function BentoCard({
  icon: Icon,
  eyebrow,
  title,
  className,
  tall,
}: {
  icon: typeof Sparkles;
  eyebrow: string;
  title: string;
  className?: string;
  tall?: boolean;
}) {
  return (
    <Magnetic strength={0.05} className={className}>
      <div
        className={
          "group relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-white/8 bg-white/[0.02] p-6 transition-colors hover:border-primary/25 " +
          (tall ? "min-h-[280px]" : "min-h-[220px]")
        }
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-primary/[0.08] opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100"
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md border border-primary/30 bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </div>
          <span className="text-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            {eyebrow}
          </span>
        </div>
        <h3 className="text-display mt-6 text-balance text-xl font-medium leading-snug tracking-tight text-foreground md:text-2xl">
          {title}
        </h3>
      </div>
    </Magnetic>
  );
}

/* ────────────────────────────── agent lineup ────────────────────────────── */

function AgentLineup() {
  return (
    <section id="agents" className="relative border-t border-white/5 bg-background/60 py-28">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-14 max-w-xl">
          <div className="text-mono text-[11px] uppercase tracking-[0.22em] text-primary/80">
            The team
          </div>
          <h2 className="text-display mt-3 text-balance text-4xl font-semibold leading-[1.02] tracking-[-0.03em] md:text-5xl">
            Meet the operators
            <br />
            <span className="font-serif-display text-primary">behind the prompt.</span>
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-5">
          {AGENTS.map((a) => (
            <div
              key={a.name}
              className="group relative flex flex-col overflow-hidden rounded-xl border border-white/8 bg-white/[0.02] p-5 transition-colors hover:border-primary/25"
            >
              <div className="mb-8 flex items-center justify-between">
                <span className="text-mono text-[10px] tracking-widest text-muted-foreground">
                  {a.code}
                </span>
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_var(--color-primary)]" />
                </span>
              </div>
              <div className="text-display text-xl font-medium tracking-tight">{a.name}</div>
              <div className="mt-1 text-sm text-muted-foreground">{a.role}</div>
              <div className="mt-6 flex items-center gap-1 text-mono text-[10px] uppercase tracking-widest text-primary/70 opacity-0 transition-opacity group-hover:opacity-100">
                Read trace <ArrowUpRight className="h-3 w-3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────── security ────────────────────────────── */

function Security() {
  const items = [
    { title: "SOC 2 Type II", desc: "Independently audited controls." },
    { title: "GDPR + DPA", desc: "EU data residency on request." },
    { title: "SSO / SAML", desc: "Okta, Azure AD, Google Workspace." },
    { title: "RLS-scoped tenancy", desc: "Every row bound to a workspace." },
    { title: "Encryption at rest", desc: "AES-256 across storage and vector." },
    { title: "Audit trail", desc: "Every agent action inspectable." },
  ];
  return (
    <section id="security" className="relative border-t border-white/5 bg-background py-28">
      <div className="pointer-events-none absolute inset-0 scanlines opacity-40" />
      <div className="relative mx-auto max-w-7xl px-6">
        <div className="mb-14 max-w-xl">
          <div className="flex items-center gap-2 text-mono text-[11px] uppercase tracking-[0.22em] text-primary/80">
            <ShieldCheck className="h-3.5 w-3.5" /> Non-negotiable
          </div>
          <h2 className="text-display mt-3 text-balance text-4xl font-semibold leading-[1.02] tracking-[-0.03em] md:text-5xl">
            Enterprise-grade,
            <br />
            <span className="font-serif-display text-primary">by default.</span>
          </h2>
        </div>
        <div className="grid gap-x-8 gap-y-6 md:grid-cols-3">
          {items.map((it) => (
            <div key={it.title} className="border-t border-white/8 pt-4">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                <div className="text-display text-base font-medium">{it.title}</div>
              </div>
              <div className="mt-1 text-sm text-muted-foreground">{it.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────── how it's paid for ─────────────────────── */

function Pricing() {
  const promises = [
    {
      label: "Free",
      title: "No plans, no seats, no card",
      desc: "Every agent, every channel, every export. There is no upgrade button to find because there is no upgrade.",
    },
    {
      label: "Funded",
      title: "One sponsor, on public reports only",
      desc: "When you publish a report to a public link, a single labeled sponsor card sits beside it. That pays the compute bill.",
    },
    {
      label: "Sealed",
      title: "Sponsors never touch the work",
      desc: "They cannot buy a source, a sentence, or a ranking. They never see who read the page. No third-party scripts run anywhere.",
    },
  ];
  return (
    <section id="pricing" className="relative border-t border-white/5 bg-background/60 py-28">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-14 max-w-2xl">
          <div className="text-mono text-[11px] uppercase tracking-[0.22em] text-primary/80">
            How it's paid for
          </div>
          <h2 className="text-display mt-3 text-balance text-4xl font-semibold leading-[1.02] tracking-[-0.03em] md:text-5xl">
            Free, permanently.
            <br />
            <span className="font-serif-display text-primary">Sponsored, transparently.</span>
          </h2>
          <p className="mt-5 text-base leading-relaxed text-muted-foreground">
            We tried to imagine the version of this you'd actually recommend to a friend. It didn't
            have a pricing table in it.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {promises.map((p, i) => (
            <div
              key={p.label}
              className={
                "relative flex flex-col rounded-2xl border p-8 " +
                (i === 1
                  ? "border-primary/40 bg-primary/[0.04] shadow-[0_0_0_1px_oklch(0.82_0.11_180/0.25),0_20px_60px_-20px_oklch(0.82_0.11_180/0.45)]"
                  : "border-white/8 bg-white/[0.02]")
              }
            >
              <div className="text-mono text-[10px] uppercase tracking-[0.22em] text-primary/80">
                {p.label}
              </div>
              <div className="text-display mt-4 text-xl font-medium leading-snug">{p.title}</div>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">{p.desc}</p>
              {i === 1 && (
                <div className="mt-6 rounded-xl border border-white/8 bg-background/60 p-3">
                  <div className="flex items-center justify-between">
                    <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                      sponsor
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      Did not touch the findings
                    </span>
                  </div>
                  <p className="mt-2 text-xs italic text-muted-foreground">
                    "Argued over by six robots. Paid for by someone else."
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
        <ul className="mt-8 grid gap-2 text-sm text-foreground/80 md:grid-cols-3">
          {[
            "No ads inside the app",
            "No ads inside a report body",
            "No trackers, ever",
          ].map((line) => (
            <li key={line} className="flex items-center gap-2">
              <Check className="h-3.5 w-3.5 text-primary" />
              {line}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ────────────────────────────── footer ────────────────────────────── */

function CtaFooter() {
  return (
    <footer className="relative overflow-hidden border-t border-white/5 bg-background">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[60%] bg-[radial-gradient(60%_60%_at_50%_0%,oklch(0.82_0.11_180/0.14),transparent_70%)]" />
      <div className="relative mx-auto max-w-7xl px-6 py-24">
        <div className="text-center">
          <h2 className="text-display mx-auto max-w-4xl text-balance text-[clamp(2.5rem,6vw,5.5rem)] font-semibold leading-[0.95] tracking-[-0.045em]">
            Give your team the operator
            <br />
            <span className="font-serif-display text-primary">it deserves.</span>
          </h2>
          <div className="mt-10 flex justify-center gap-3">
            <Link to="/auth" search={{ mode: "signup" }}>
              <Magnetic>
                <Button
                  size="lg"
                  className="rounded-full bg-primary px-8 text-primary-foreground shadow-[0_0_0_1px_oklch(0.82_0.11_180/0.4),0_10px_40px_-8px_oklch(0.82_0.11_180/0.55)]"
                >
                  Start free
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Magnetic>
            </Link>
          </div>
        </div>

        <div className="mt-24 flex flex-col items-center justify-between gap-4 border-t border-white/5 pt-8 text-xs text-muted-foreground md:flex-row">
          <div className="flex items-center gap-2">
            <Glyph />
            <span className="text-display text-sm font-medium text-foreground">
              Marketing Agent
            </span>
            <span className="ml-3">© {new Date().getFullYear()}</span>
          </div>
          <div className="text-mono uppercase tracking-widest">Built on Lovable Cloud</div>
        </div>
      </div>
    </footer>
  );
}
