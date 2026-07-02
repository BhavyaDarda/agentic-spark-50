import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getConversation } from "@/lib/chat.functions";
import { getCurrentWorkspace } from "@/lib/workspace.functions";
import { listBrands } from "@/lib/brands.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Markdown } from "@/components/markdown";
import {
  ArrowUp,
  Loader2,
  Bot,
  User as UserIcon,
  Wrench,
  Globe,
  FileText,
  X,
  Building2,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/c/$conversationId")({
  head: () => ({ meta: [{ title: "Chat · Marketing Agent" }] }),
  component: ChatPage,
});

// ---------- Local UI types ----------

type ToolEvent = {
  tool: string;
  input?: unknown;
  ok?: boolean;
  summary?: string;
  status: "running" | "done" | "error";
};

type Citation = { url: string; title?: string; snippet?: string };
type ArtifactRef = { id: string; kind: string; title: string };

type UiMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  tools: ToolEvent[];
  citations: Citation[];
  artifacts: ArtifactRef[];
  streaming?: boolean;
};

// ---------- Component ----------

function ChatPage() {
  const { conversationId } = useParams({ from: "/app/c/$conversationId" });
  const qc = useQueryClient();
  const ws = useQuery({ queryKey: ["current-workspace"], queryFn: () => getCurrentWorkspace() });
  const workspaceId = ws.data?.workspace?.id;

  const conv = useQuery({
    queryKey: ["conversation", conversationId],
    queryFn: () => getConversation({ data: { id: conversationId } }),
  });

  const brands = useQuery({
    queryKey: ["brands", workspaceId],
    queryFn: () => listBrands({ data: { workspaceId: workspaceId! } }),
    enabled: !!workspaceId,
  });

  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [model, setModel] = useState<"fast" | "balanced" | "deep">("balanced");
  const [activeBrand, setActiveBrand] = useState<string | undefined>();
  const [openArtifact, setOpenArtifact] = useState<ArtifactRef | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Load persisted history once
  useEffect(() => {
    if (!conv.data) return;
    setActiveBrand(conv.data.conversation.active_brand_id ?? undefined);
    const historic: UiMessage[] = (conv.data.messages ?? []).map((m) => {
      const parts = Array.isArray(m.parts) ? (m.parts as unknown[]) : [];
      const text = parts
        .filter((p) => typeof p === "object" && p !== null && (p as { type?: string }).type === "text")
        .map((p) => (p as { text?: string }).text ?? "")
        .join("");
      const citations = parts
        .filter((p) => typeof p === "object" && p !== null && (p as { type?: string }).type === "citation")
        .map((p) => p as Citation);
      const artifacts = parts
        .filter((p) => typeof p === "object" && p !== null && (p as { type?: string }).type === "artifact")
        .map((p) => p as ArtifactRef);
      return {
        id: m.id,
        role: m.role === "assistant" ? "assistant" : "user",
        text,
        tools: [],
        citations,
        artifacts,
      };
    });
    setMessages(historic);
  }, [conv.data]);

  // Autoscroll on new content
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Auto-send prompt handoff from /app landing
  useEffect(() => {
    if (!workspaceId || sending || !conv.data) return;
    const key = `chat:autosend:${conversationId}`;
    const stashed = sessionStorage.getItem(key);
    if (stashed && messages.length === 0) {
      sessionStorage.removeItem(key);
      void send(stashed);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, conv.data]);

  const send = async (text: string) => {
    if (!text.trim() || !workspaceId || sending) return;
    setSending(true);

    const userMsg: UiMessage = {
      id: crypto.randomUUID(),
      role: "user",
      text: text.trim(),
      tools: [],
      citations: [],
      artifacts: [],
    };
    const assistantId = crypto.randomUUID();
    const assistantMsg: UiMessage = {
      id: assistantId,
      role: "assistant",
      text: "",
      tools: [],
      citations: [],
      artifacts: [],
      streaming: true,
    };
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput("");

    // Build minimal history for the model (last 20 turns).
    const history = messages.slice(-20).map((m) => ({
      id: m.id,
      role: m.role,
      parts: [{ type: "text", text: m.text }],
    }));

    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token;
    if (!token) {
      patchAssistant(assistantId, (m) => ({
        ...m,
        text: "You are signed out. Please sign in again.",
        streaming: false,
      }));
      setSending(false);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          conversationId,
          workspaceId,
          brandId: activeBrand ?? null,
          message: text.trim(),
          history,
          options: { model, allowWeb: true },
        }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const err = await res.text().catch(() => "request_failed");
        patchAssistant(assistantId, (m) => ({
          ...m,
          text: `Something went wrong: ${err.slice(0, 200)}`,
          streaming: false,
        }));
        setSending(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const chunks = buf.split("\n\n");
        buf = chunks.pop() ?? "";
        for (const raw of chunks) {
          const line = raw.trim();
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload) continue;
          let ev: Record<string, unknown>;
          try {
            ev = JSON.parse(payload);
          } catch {
            continue;
          }
          handleEvent(assistantId, ev);
        }
      }
      patchAssistant(assistantId, (m) => ({ ...m, streaming: false }));
      // Refresh sidebar recents / conv metadata
      qc.invalidateQueries({ queryKey: ["conversations", workspaceId] });
    } catch (e) {
      patchAssistant(assistantId, (m) => ({
        ...m,
        text: m.text || `Stream interrupted: ${(e as Error).message}`,
        streaming: false,
      }));
    } finally {
      setSending(false);
      abortRef.current = null;
    }
  };

  const patchAssistant = (id: string, patch: (m: UiMessage) => UiMessage) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? patch(m) : m)));
  };

  const handleEvent = (assistantId: string, ev: Record<string, unknown>) => {
    const type = ev.type as string;
    patchAssistant(assistantId, (m) => {
      switch (type) {
        case "text_delta":
          return { ...m, text: m.text + (ev.delta as string) };
        case "tool_call": {
          const tools = [
            ...m.tools,
            {
              tool: ev.tool as string,
              input: ev.input,
              status: "running" as const,
            },
          ];
          return { ...m, tools };
        }
        case "tool_result": {
          const tools = [...m.tools];
          // Update last matching running tool
          for (let i = tools.length - 1; i >= 0; i--) {
            if (tools[i].tool === (ev.tool as string) && tools[i].status === "running") {
              tools[i] = {
                ...tools[i],
                status: ev.ok === false ? "error" : "done",
                summary: ev.summary as string | undefined,
                ok: ev.ok as boolean | undefined,
              };
              break;
            }
          }
          return { ...m, tools };
        }
        case "citation": {
          const url = ev.url as string;
          if (m.citations.some((c) => c.url === url)) return m;
          return {
            ...m,
            citations: [
              ...m.citations,
              { url, title: ev.title as string | undefined, snippet: ev.snippet as string | undefined },
            ],
          };
        }
        case "artifact": {
          const art = {
            id: ev.id as string,
            kind: ev.kind as string,
            title: ev.title as string,
          };
          setOpenArtifact(art);
          return { ...m, artifacts: [...m.artifacts, art] };
        }
        case "error":
          return {
            ...m,
            text: m.text + `\n\n> ⚠️ ${(ev.message as string) ?? "error"}`,
          };
        default:
          return m;
      }
    });
  };

  const brandName = useMemo(() => {
    if (!activeBrand) return null;
    return brands.data?.find((b) => b.id === activeBrand)?.name ?? null;
  }, [activeBrand, brands.data]);

  return (
    <div className="mx-auto flex h-[calc(100vh-3.5rem)] w-full">
      <div className={cn("flex flex-1 flex-col", openArtifact && "lg:mr-[min(48%,640px)]")}>
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 [scrollbar-width:thin]">
          <div className="mx-auto max-w-3xl space-y-6">
            {messages.length === 0 && !conv.isLoading && (
              <div className="rounded-xl border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
                Start the conversation below.
              </div>
            )}
            {messages.map((m) => (
              <MessageRow key={m.id} m={m} onOpenArtifact={setOpenArtifact} />
            ))}
          </div>
        </div>

        <div className="border-t border-border/60 bg-background/80 px-4 py-3 backdrop-blur">
          <div className="mx-auto max-w-3xl">
            <div className="rounded-2xl border border-border/60 bg-card/60 p-2 shadow-lg shadow-black/20">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    void send(input);
                  }
                }}
                rows={2}
                placeholder="Reply, refine, or ask for a new artifact…"
                className="resize-none border-0 bg-transparent p-2 text-sm shadow-none focus-visible:ring-0"
                disabled={sending}
              />
              <div className="flex items-center justify-between gap-2 border-t border-border/50 pt-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Building2 className="h-3.5 w-3.5" />
                  <Select
                    value={activeBrand ?? "none"}
                    onValueChange={(v) => setActiveBrand(v === "none" ? undefined : v)}
                  >
                    <SelectTrigger className="h-7 w-[150px] border-border/60 bg-transparent text-xs">
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
                  <Select value={model} onValueChange={(v) => setModel(v as typeof model)}>
                    <SelectTrigger className="h-7 w-[120px] border-border/60 bg-transparent text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fast">Fast</SelectItem>
                      <SelectItem value="balanced">Balanced</SelectItem>
                      <SelectItem value="deep">Deep</SelectItem>
                    </SelectContent>
                  </Select>
                  {brandName && (
                    <span className="hidden truncate rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-primary md:inline">
                      @{brandName}
                    </span>
                  )}
                </div>
                <Button
                  size="sm"
                  className="gap-1.5"
                  onClick={() => send(input)}
                  disabled={sending || !input.trim()}
                >
                  {sending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ArrowUp className="h-3.5 w-3.5" />
                  )}
                  Send
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {openArtifact && (
        <ArtifactPanel
          artifact={openArtifact}
          onClose={() => setOpenArtifact(null)}
        />
      )}
    </div>
  );
}

// ---------- Message row ----------

function MessageRow({
  m,
  onOpenArtifact,
}: {
  m: UiMessage;
  onOpenArtifact: (a: ArtifactRef) => void;
}) {
  if (m.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-tr-md bg-primary/15 px-4 py-2.5 text-sm text-foreground ring-1 ring-primary/20">
          {m.text}
        </div>
      </div>
    );
  }
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary ring-1 ring-primary/20">
        <Sparkles className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1 space-y-3">
        {m.tools.length > 0 && (
          <div className="space-y-1.5">
            {m.tools.map((t, i) => (
              <ToolCard key={i} t={t} />
            ))}
          </div>
        )}
        {m.text && <Markdown>{m.text}</Markdown>}
        {m.streaming && !m.text && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" /> Thinking…
          </div>
        )}
        {m.citations.length > 0 && (
          <div className="rounded-lg border border-border/60 bg-card/40 p-3">
            <div className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Sources · {m.citations.length}
            </div>
            <ul className="space-y-1.5">
              {m.citations.map((c, i) => (
                <li key={c.url} className="flex gap-2 text-xs">
                  <span className="font-mono text-muted-foreground">[{i + 1}]</span>
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="min-w-0 flex-1 truncate text-primary hover:underline"
                  >
                    {c.title || c.url}
                  </a>
                  <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
                </li>
              ))}
            </ul>
          </div>
        )}
        {m.artifacts.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {m.artifacts.map((a) => (
              <button
                key={a.id}
                onClick={() => onOpenArtifact(a)}
                className="group flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs transition-colors hover:border-primary/60 hover:bg-primary/10"
              >
                <FileText className="h-3.5 w-3.5 text-primary" />
                <span className="font-medium">{a.title}</span>
                <span className="rounded bg-background/50 px-1.5 py-0.5 font-mono text-[9px] uppercase text-muted-foreground">
                  {a.kind.replace("_", " ")}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Tool card ----------

function ToolCard({ t }: { t: ToolEvent }) {
  const Icon =
    t.tool === "web_search" ? Globe : t.tool === "fetch_page" ? Globe : t.tool === "save_artifact" ? FileText : Wrench;
  const label = t.tool.replace("_", " ");
  const isRunning = t.status === "running";
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md border border-border/60 bg-card/40 px-2.5 py-1.5 text-xs",
        isRunning && "border-primary/40 bg-primary/5",
        t.status === "error" && "border-destructive/40 bg-destructive/5",
      )}
    >
      {isRunning ? (
        <Loader2 className="h-3 w-3 shrink-0 animate-spin text-primary" />
      ) : (
        <Icon className="h-3 w-3 shrink-0 opacity-70" />
      )}
      <span className="font-mono lowercase text-muted-foreground">{label}</span>
      {typeof t.input === "object" && t.input !== null && "query" in (t.input as Record<string, unknown>) && (
        <span className="truncate text-foreground">
          "{String((t.input as { query: string }).query).slice(0, 80)}"
        </span>
      )}
      {typeof t.input === "object" && t.input !== null && "url" in (t.input as Record<string, unknown>) && (
        <span className="truncate text-foreground">
          {String((t.input as { url: string }).url).slice(0, 60)}
        </span>
      )}
      {typeof t.input === "object" && t.input !== null && "title" in (t.input as Record<string, unknown>) && (
        <span className="truncate text-foreground">
          {String((t.input as { title: string }).title).slice(0, 60)}
        </span>
      )}

      {t.summary && !isRunning && (
        <span className="ml-auto font-mono text-[10px] text-muted-foreground">{t.summary}</span>
      )}
    </div>
  );
}

// ---------- Artifact panel ----------

function ArtifactPanel({
  artifact,
  onClose,
}: {
  artifact: ArtifactRef;
  onClose: () => void;
}) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setContent(null);
    supabase
      .from("artifacts")
      .select("content")
      .eq("id", artifact.id)
      .maybeSingle()
      .then(({ data }) => {
        setContent((data?.content as string) ?? "");
        setLoading(false);
      });
  }, [artifact.id]);

  return (
    <aside className="fixed inset-y-0 right-0 z-30 flex w-full flex-col border-l border-border/60 bg-background shadow-2xl shadow-black/40 lg:w-[min(48%,640px)]">
      <div className="flex h-12 items-center justify-between border-b border-border/60 px-3">
        <div className="flex min-w-0 items-center gap-2">
          <FileText className="h-4 w-4 shrink-0 text-primary" />
          <span className="truncate text-sm font-medium">{artifact.title}</span>
          <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[9px] uppercase text-muted-foreground">
            {artifact.kind.replace("_", " ")}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button asChild variant="ghost" size="sm">
            <Link to="/app/artifacts">Library</Link>
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-6 [scrollbar-width:thin]">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading artifact…
          </div>
        ) : content ? (
          <Markdown>{content}</Markdown>
        ) : (
          <div className="text-sm text-muted-foreground">Empty artifact.</div>
        )}
      </div>
    </aside>
  );
}
