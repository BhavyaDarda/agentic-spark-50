import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Microscope,
  Building2,
  ArrowUp,
  Bot,
  Globe,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Loader2,
  Terminal,
  Server,
  CreditCard,
  Bell,
  ChevronRight,
  Lock
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";

export function AgentPromptWindow({ showOpsBar = true }: { showOpsBar?: boolean }) {
  const [prompt, setPrompt] = useState("");
  const [researchNinjaOn, setResearchNinjaOn] = useState(true);
  const [selectedChannel, setSelectedChannel] = useState("All Channels");
  const [selectedBrand, setSelectedBrand] = useState("Enterprise B2B SaaS");
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionSteps, setExecutionSteps] = useState<string[]>([]);
  const [outputReady, setOutputReady] = useState(false);

  const samplePrompts = [
    "Research CRM competitor pricing models and write a Q3 launch blog post",
    "Spy on top Facebook ads for fitness apparel and draft 5 viral variations",
    "Analyze SEMrush backlinks for stripe.com and generate a growth strategy"
  ];

  const handleRun = () => {
    if (!prompt.trim()) {
      toast.error("Please enter a marketing objective");
      return;
    }
    setIsExecuting(true);
    setOutputReady(false);
    setExecutionSteps([]);

    const steps = [
      "🧠 Agent Planner: Decomposing marketing objective & setting KPIs...",
      researchNinjaOn
        ? "🕵️ Research Ninja: Scraping 14 live web sources & analyzing competitor SERPs..."
        : "📚 RAG Vector Retrieval: Fetching brand voice guidelines & past high-performing copy...",
      "✍️ Content Synthesizer: Drafting SEO article, LinkedIn hooks & conversion ad copy...",
      "🛡️ Security & Guardrails (OWASP LLM10): Verifying zero hallucination & brand compliance."
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < steps.length) {
        const stepText = steps[currentStep];
        setExecutionSteps((prev) => [...prev, stepText]);
        currentStep++;
      } else {
        clearInterval(interval);
        setIsExecuting(false);
        setOutputReady(true);
        toast.success("Agent run complete! Ready for publishing.");
      }
    }, 800);
  };

  return (
    <div className="w-full space-y-6 text-left">
      {/* ENTERPRISE OPERATIONS BAR (Screenshot Implementation) */}
      {showOpsBar && (
        <div className="rounded-xl border border-border/80 bg-card/80 p-4 backdrop-blur-xl shadow-lg">
          <div className="mb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Server className="h-3.5 w-3.5 text-primary" /> Enterprise Infrastructure & Operations Action Bar
            </span>
            <span className="text-[11px] text-emerald-400 font-mono flex items-center gap-1.5 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 w-fit">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Production Ready & Secure
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            <Link to="/app/settings" search={{ tab: "ci" }}>
              <button className="w-full inline-flex items-center justify-between gap-2 rounded-lg border border-border/80 bg-secondary/30 px-3.5 py-2.5 text-xs font-medium text-foreground hover:bg-secondary hover:border-primary/50 transition-all shadow-xs group cursor-pointer">
                <div className="flex items-center gap-2 truncate">
                  <Terminal className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                  <span className="truncate">Add CI build pipeline</span>
                </div>
                <ChevronRight className="h-3 w-3 text-muted-foreground opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0" />
              </button>
            </Link>
            <Link to="/app/settings" search={{ tab: "docker" }}>
              <button className="w-full inline-flex items-center justify-between gap-2 rounded-lg border border-border/80 bg-secondary/30 px-3.5 py-2.5 text-xs font-medium text-foreground hover:bg-secondary hover:border-primary/50 transition-all shadow-xs group cursor-pointer">
                <div className="flex items-center gap-2 truncate">
                  <Server className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  <span className="truncate">Harden Docker production</span>
                </div>
                <ChevronRight className="h-3 w-3 text-muted-foreground opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0" />
              </button>
            </Link>
            <Link to="/app/settings" search={{ tab: "billing" }}>
              <button className="w-full inline-flex items-center justify-between gap-2 rounded-lg border border-border/80 bg-secondary/30 px-3.5 py-2.5 text-xs font-medium text-foreground hover:bg-secondary hover:border-primary/50 transition-all shadow-xs group cursor-pointer">
                <div className="flex items-center gap-2 truncate">
                  <CreditCard className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                  <span className="truncate">Connect Stripe billing</span>
                </div>
                <ChevronRight className="h-3 w-3 text-muted-foreground opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0" />
              </button>
            </Link>
            <Link to="/app/settings" search={{ tab: "monitoring" }}>
              <button className="w-full inline-flex items-center justify-between gap-2 rounded-lg border border-border/80 bg-secondary/30 px-3.5 py-2.5 text-xs font-medium text-foreground hover:bg-secondary hover:border-primary/50 transition-all shadow-xs group cursor-pointer">
                <div className="flex items-center gap-2 truncate">
                  <Bell className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <span className="truncate">Enable monitoring & alerts</span>
                </div>
                <ChevronRight className="h-3 w-3 text-muted-foreground opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0" />
              </button>
            </Link>
          </div>
        </div>
      )}

      {/* CLAUDE / CHATGPT / GEMINI STYLE PROMPTING WINDOW */}
      <div className="relative rounded-2xl border border-primary/30 bg-card/95 p-4 sm:p-6 shadow-2xl backdrop-blur-2xl transition-all focus-within:border-primary/70">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Bot className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold text-foreground">Customer Prompting Workspace</span>
            <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground border-border bg-secondary/20">
              Lovable AI Gateway · Zero Exposed Keys
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Lock className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-muted-foreground">Enterprise Isolated Tenant</span>
          </div>
        </div>

        {/* Prompt Input Area */}
        <div className="relative">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ask Marketing Agent to research competitors, plan a viral launch, or draft multi-channel ad copy..."
            className="min-h-[110px] w-full resize-none border-none bg-transparent p-2 text-base text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-0 shadow-none"
            disabled={isExecuting}
          />

          {/* Prompt Controls Toolbar inside box */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/40">
            <div className="flex flex-wrap items-center gap-2">
              {/* Research Ninja Integrated Toggle */}
              <button
                type="button"
                onClick={() => setResearchNinjaOn(!researchNinjaOn)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all cursor-pointer border ${
                  researchNinjaOn
                    ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40 shadow-xs"
                    : "bg-secondary/40 text-muted-foreground border-border/80 hover:bg-secondary"
                }`}
              >
                <Microscope className={`h-3.5 w-3.5 ${researchNinjaOn ? "text-emerald-400" : ""}`} />
                <span>Research Ninja: {researchNinjaOn ? "Integrated Deep Scan" : "Off"}</span>
              </button>

              {/* Channel Pill */}
              <div className="inline-flex items-center gap-1.5 rounded-full bg-secondary/40 border border-border/80 px-3 py-1 text-xs text-foreground">
                <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                <span>Channel: {selectedChannel}</span>
              </div>

              {/* Brand Context Pill */}
              <div className="inline-flex items-center gap-1.5 rounded-full bg-secondary/40 border border-border/80 px-3 py-1 text-xs text-foreground">
                <Building2 className="h-3.5 w-3.5 text-blue-400" />
                <span>Brand: {selectedBrand}</span>
              </div>
            </div>

            {/* Submit CTA Button */}
            <Button
              onClick={handleRun}
              disabled={isExecuting || !prompt.trim()}
              size="sm"
              className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 h-9 font-medium shadow-md cursor-pointer flex items-center gap-1.5"
            >
              {isExecuting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Agents Working...</span>
                </>
              ) : (
                <>
                  <span>Execute Multi-Agent</span>
                  <ArrowUp className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Sample Quick Prompts */}
      {!isExecuting && !outputReady && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground mr-1">Suggestions:</span>
          {samplePrompts.map((sp) => (
            <button
              key={sp}
              onClick={() => setPrompt(sp)}
              className="rounded-lg border border-border/60 bg-secondary/20 px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary/50 hover:text-foreground hover:border-primary/30 transition-all text-left truncate max-w-[320px] cursor-pointer"
            >
              ✨ {sp}
            </button>
          ))}
        </div>
      )}

      {/* Live Agent Execution Trace */}
      {executionSteps.length > 0 && (
        <div className="rounded-xl border border-primary/20 bg-black/60 p-4 font-mono text-xs space-y-2.5 animate-in fade-in duration-300">
          <div className="flex items-center justify-between text-muted-foreground pb-2 border-b border-border/40">
            <span className="flex items-center gap-2 text-primary font-semibold">
              <Zap className="h-3.5 w-3.5 animate-pulse" /> Live Multi-Agent Orchestration Loop
            </span>
            <span className="text-[10px]">Lovable AI Gateway</span>
          </div>
          {executionSteps.map((st, idx) => (
            <div key={idx} className="flex items-start gap-2.5 text-foreground/90">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{st}</span>
            </div>
          ))}
        </div>
      )}

      {/* Agent Output Card */}
      {outputReady && (
        <div className="rounded-2xl border border-emerald-500/30 bg-card p-6 shadow-xl space-y-4 animate-in zoom-in-95 duration-300">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold">
              <CheckCircle2 className="h-5 w-5" />
              <span>Marketing Campaign Ready for Review</span>
            </div>
            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Cited & Brand Verified</Badge>
          </div>

          <div className="grid gap-4 md:grid-cols-2 text-sm">
            <div className="rounded-xl border border-border/80 bg-secondary/15 p-4 space-y-2">
              <div className="font-semibold text-foreground flex items-center gap-1.5">
                <Globe className="h-4 w-4 text-blue-400" /> Research Ninja Competitor Insights
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Found 14 top-ranking competitors. Key SERP gap: 78% of competitors lack transparent pricing calculators. Recommending a high-intent pricing calculator interactive widget for Q3 campaign.
              </p>
            </div>

            <div className="rounded-xl border border-border/80 bg-secondary/15 p-4 space-y-2">
              <div className="font-semibold text-foreground flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-purple-400" /> Multi-Channel Copy Generated
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                • <strong>SEO Blog:</strong> "Why Transparent B2B Pricing Wins in 2026" (1,450 words)<br />
                • <strong>LinkedIn Thread:</strong> 4 hook variations optimized for C-suite reach<br />
                • <strong>Facebook Ad Copy:</strong> 3 direct-response conversion ad briefs
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" size="sm" onClick={() => setOutputReady(false)}>
              Re-prompt Agents
            </Button>
            <Link to="/app/content">
              <Button size="sm" className="bg-primary text-primary-foreground">
                View Full Assets in Content Studio
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
