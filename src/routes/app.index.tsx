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
import { supabase } from "@/integrations/supabase/client";
import { RouteError } from "@/components/route-error";

export const Route = createFileRoute("/app/")({
  head: () => ({ meta: [{ title: "New chat · Marketing Agent" }] }),
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

  const email = supabase.auth ? undefined : undefined; // reserved

  return (
    <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] w-full max-w-3xl flex-col justify-center gap-8 px-4 py-10">
      <div className="space-y-2 text-center">
        <div className="mx-auto inline-flex h-11 w-11 items-center justify-center bg-primary/10 text-primary ring-1 ring-primary/20">
          <Sparkles className="h-5 w-5" />
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">
          What are we shipping today?
        </h1>
        <p className="text-sm text-muted-foreground">
          Ask, brief, or paste — the agent will research, write, and save
          artifacts to your library.
        </p>
      </div>

      <div className="border-[3px] border-border bg-card p-3 brutal-shadow">
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              send();
            }
          }}
          rows={3}
          placeholder="Research the AI marketing landscape, draft a launch email, build me a campaign…"
          className="resize-none border-0 bg-transparent p-2 text-base leading-relaxed shadow-none focus-visible:ring-0"
        />
        <div className="flex items-center justify-between gap-2 border-t border-border/50 pt-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Building2 className="h-3.5 w-3.5" />
            <Select
              value={brandId ?? "none"}
              onValueChange={(v) => setBrandId(v === "none" ? undefined : v)}
            >
              <SelectTrigger className="h-7 w-[180px] border-border/60 bg-transparent text-xs">
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
            <span className="hidden md:inline">
              · ⌘⏎ to send
            </span>
          </div>
          <Button
            size="sm"
            className="gap-1.5"
            onClick={send}
            disabled={!prompt.trim() || !workspaceId || start.isPending}
          >
            {start.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ArrowUp className="h-3.5 w-3.5" />
            )}
            Send
          </Button>
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        {STARTERS.map((s) => {
          const Icon = s.icon;
          return (
            <button
              key={s.title}
              onClick={() => {
                setPrompt(s.prompt);
              }}
              className="group flex items-start gap-3 border-[3px] border-border bg-card p-3 text-left transition-colors hover:border-primary/40 hover:bg-card"
            >
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center bg-primary/10 text-primary">
                <Icon className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium">{s.title}</div>
                <div className="line-clamp-2 text-xs text-muted-foreground">
                  {s.prompt}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
