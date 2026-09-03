import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { getCurrentWorkspace } from "@/lib/workspace.functions";
import { listBrands } from "@/lib/brands.functions";
import { generateContent, listRuns, rateRun } from "@/lib/content.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, Loader2, ThumbsUp, ThumbsDown, Copy } from "lucide-react";
import { toast } from "sonner";
import { Markdown } from "@/components/markdown";

const search = z.object({ brand: z.string().uuid().optional() });

export const Route = createFileRoute("/app/content")({
  head: () => ({ meta: [{ title: "Content Studio · Marketing Agent" }] }),
  validateSearch: search,
  component: ContentPage,
});

const KINDS = [
  { v: "blog", label: "Blog post" },
  { v: "ad_copy", label: "Ad copy (5 variants)" },
  { v: "social_post", label: "Social posts" },
  { v: "hashtags", label: "Hashtag pack" },
  { v: "email", label: "Email" },
  { v: "video_script", label: "Video script" },
  { v: "strategy", label: "Marketing strategy" },
  { v: "campaign", label: "Campaign brief" },
] as const;

function ContentPage() {
  const sp = useSearch({ from: "/app/content" });
  const ws = useQuery({ queryKey: ["current-workspace"], queryFn: () => getCurrentWorkspace() });
  const workspaceId = ws.data?.workspace?.id;
  const qc = useQueryClient();

  const brands = useQuery({
    queryKey: ["brands", workspaceId],
    queryFn: () => listBrands({ data: { workspaceId: workspaceId! } }),
    enabled: !!workspaceId,
  });
  const runs = useQuery({
    queryKey: ["runs", workspaceId],
    queryFn: () => listRuns({ data: { workspaceId: workspaceId!, limit: 20 } }),
    enabled: !!workspaceId,
  });

  const [brandId, setBrandId] = useState<string>(sp.brand ?? "");
  const [kind, setKind] = useState<(typeof KINDS)[number]["v"]>("blog");
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [channel, setChannel] = useState("");
  const [tone, setTone] = useState("");
  const [length, setLength] = useState<"short" | "medium" | "long">("medium");
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  const gen = useMutation({
    mutationFn: async () =>
      generateContent({
        data: {
          workspaceId: workspaceId!,
          brandId: brandId || null,
          kind,
          title: title || undefined,
          prompt,
          channel: channel || undefined,
          tone: tone || undefined,
          length,
        },
      }),
    onSuccess: (res) => {
      toast.success("Generated");
      setSelectedRunId(res.id);
      qc.invalidateQueries({ queryKey: ["runs", workspaceId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rate = useMutation({
    mutationFn: async (args: { id: string; rating: number }) =>
      rateRun({ data: { id: args.id, rating: args.rating } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["runs", workspaceId] }),
  });

  const selectedRun = runs.data?.find((r) => r.id === selectedRunId) ?? runs.data?.[0];

  return (
    <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[420px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Brief</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Brand</Label>
            <Select value={brandId || "none"} onValueChange={(v) => setBrandId(v === "none" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="No brand" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No brand</SelectItem>
                {brands.data?.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>What to generate</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as typeof kind)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {KINDS.map((k) => (
                  <SelectItem key={k.v} value={k.v}>
                    {k.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Title (optional)</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Brief / prompt *</Label>
            <Textarea
              rows={6}
              placeholder="Describe what you want — topic, angle, audience, anything else."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Channel</Label>
              <Input
                placeholder="LinkedIn, IG…"
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Length</Label>
              <Select value={length} onValueChange={(v) => setLength(v as typeof length)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="short">Short</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="long">Long</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Tone override</Label>
            <Input
              placeholder="Optional — overrides brand tone"
              value={tone}
              onChange={(e) => setTone(e.target.value)}
            />
          </div>
          <Button
            className="w-full"
            disabled={!prompt.trim() || !workspaceId || gen.isPending}
            onClick={() => gen.mutate()}
          >
            {gen.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Generate
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card className="min-h-[400px]">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">
              {selectedRun?.title || selectedRun?.kind?.replace("_", "") || "Output"}
            </CardTitle>
            {selectedRun?.output_text && (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(selectedRun.output_text!);
                    toast.success("Copied");
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => rate.mutate({ id: selectedRun.id, rating: 1 })}
                >
                  <ThumbsUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => rate.mutate({ id: selectedRun.id, rating: -1 })}
                >
                  <ThumbsDown className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {gen.isPending ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Generating…
              </div>
            ) : selectedRun?.output_text ? (
              <Markdown>{selectedRun.output_text}</Markdown>
            ) : (
              <p className="text-sm text-muted-foreground">
                Your output will appear here. Fill the brief and click Generate.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent runs</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border/60">
              {(runs.data ?? []).map((r) => (
                <li key={r.id}>
                  <button
                    onClick={() => setSelectedRunId(r.id)}
                    className="flex w-full items-center justify-between py-2.5 text-left hover:bg-muted/40"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm">{r.title || r.kind.replace("_", "")}</div>
                      <div className="font-mono text-xs text-muted-foreground">
                        {new Date(r.created_at).toLocaleString()} · {r.kind} · {r.status}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
              {(runs.data?.length ?? 0) === 0 && (
                <li className="py-2 text-sm text-muted-foreground">No runs yet.</li>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
