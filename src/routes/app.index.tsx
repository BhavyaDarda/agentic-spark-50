import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getCurrentWorkspace } from "@/lib/workspace.functions";
import { listBrands } from "@/lib/brands.functions";
import { createConversation } from "@/lib/chat.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowUp,
  Sparkles,
  Microscope,
  PenTool,
  BarChart3,
  Loader2,
  Building2,
} from "lucide-react";
import { useState } from "react";
import { RouteError } from "@/components/route-error";

export const Route = createFileRoute("/app/")({
  staticData: { sitemap: false },
  head: () => ({ meta: [{ title: "New chat · REACHER AI" }] }),
  errorComponent: ({ error }) => <RouteError error={error as Error} />,
  component: NewChatWelcome,
});

const STARTERS: { icon: React.ComponentType<{ className?: string }>; title: string; prompt: string }[] = [
  {
    icon: Microscope,
    title: "Research a competitor",
    prompt:
      "Do deep research on our top competitor. Map their positioning, pricing, top-performing content themes, SEO keywords they rank for, and 3 openings we could exploit. Cite every claim.",
  },
  {
    icon: PenTool,
    title: "Draft a launch blog post",
    prompt:
      "Draft a 1,200-word launch blog post for our new feature. On brand, skimmable, with a clear H1, sub-heads, one pull quote, and a CTA. Save it as an artifact when done.",
  },
  {
    icon: BarChart3,
    title: "Build a 30-day campaign",
    prompt:
      "Build a 30-day multi-channel campaign brief (email, LinkedIn, X, blog) around our next launch. Include weekly themes, per-channel hooks, and success metrics. Save as an artifact.",
  },
  {
    icon: Sparkles,
    title: "5 ad variations",
    prompt:
      "Give me 5 short ad variations for Meta and Google, each with a distinct angle (pain, aspiration, social proof, urgency, curiosity). One headline + one body under 90 chars.",
  },
];

function NewChatWelcome() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [prompt, setPrompt] = useState("");
  const [brandId, setBrandId] = useState<string | undefined>();

  const ws = useQuery({ queryKey: ["current-workspace"], queryFn: () => getCurrentWorkspace() });
  const workspaceId = ws.data?.workspace?.id;

  const brands = useQuery({
    queryKey: ["brands", workspaceId],
    queryFn: () => listBrands({ data: { workspaceId: workspaceId! } }),
    enabled: !!workspaceId,
  });

  const start = useMutation({
    mutationFn: async (text: string) => {
      if (!workspaceId) throw new Error("no workspace");
      const conv = await createConversation({
        data: { workspaceId, activeBrandId: brandId ?? null },
      });
      // Stash the initial prompt so the chat page auto-sends it on mount.
      if (text.trim()) {
        sessionStorage.setItem(`chat:autosend:${conv.id}`, text.trim());
      }
      return conv;
    },
    onSuccess: (conv) => {
      qc.invalidateQueries({ queryKey: ["conversations", workspaceId] });
      navigate({ to: "/app/c/$conversationId", params: { conversationId: conv.id } });
    },
  });

  const send = () => {
    if (!prompt.trim() || start.isPending) return;
    start.mutate(prompt);
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 py-6 md:py-10">
      <div className="space-y-4">
        <span className="brut-chip">New chat</span>
        <h1 className="text-4xl leading-[0.95] md:text-6xl">
          What are we
          <br />
          <span className="text-outline">researching</span>{" "}
          <span className="inline-block border-[4px] border-border bg-primary px-2 text-primary-foreground">
            today?
          </span>
        </h1>
        <p className="max-w-xl text-base text-muted-foreground">
          Ask, brief or paste. The agent searches the live web, checks your Brand
          Memory, cites every source and saves the result to your library.
        </p>
      </div>

      <div className="brut bg-card">
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              send();
            }
          }}
          rows={4}
          aria-label="Message"
          placeholder="Map our top competitor's pricing, draft a launch email, plan a 30-day campaign…"
          className="resize-none border-0 bg-transparent p-4 text-base leading-relaxed shadow-none focus-visible:ring-0"
        />
        <div className="flex flex-wrap items-center justify-between gap-2 border-t-[4px] border-border bg-muted px-3 py-2">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <Select
              value={brandId ?? "none"}
              onValueChange={(v) => setBrandId(v === "none" ? undefined : v)}
            >
              <SelectTrigger className="h-8 w-[180px] bg-card font-mono text-xs uppercase" aria-label="Brand">
                <SelectValue placeholder="No brand" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No brand</SelectItem>
                {(brands.data ?? []).map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="hidden font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground md:inline">
              Enter = send · Shift+Enter = new line
            </span>
          </div>
          <Button
            className="gap-1.5"
            onClick={send}
            disabled={!prompt.trim() || !workspaceId || start.isPending}
          >
            {start.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowUp className="h-4 w-4" strokeWidth={3} />
            )}
            Send
          </Button>
        </div>
      </div>

      <div>
        <div className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
          Or start from a brief
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {STARTERS.map((s, i) => {
            const Icon = s.icon;
            const tile = ["bg-secondary text-secondary-foreground", "bg-primary text-primary-foreground", "bg-accent text-accent-foreground", "bg-card text-foreground"][i % 4];
            return (
              <button
                key={s.title}
                type="button"
                onClick={() => setPrompt(s.prompt)}
                className="brut-sm brut-press flex items-start gap-3 bg-card p-4 text-left"
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center border-[3px] border-border ${tile}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="font-display text-sm font-black uppercase">{s.title}</div>
                  <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{s.prompt}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
