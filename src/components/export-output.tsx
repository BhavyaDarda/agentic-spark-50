import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Send, Loader2 } from "lucide-react";
import { sendOutputWebhook } from "@/lib/publishing.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function ExportOutput({ source, id, disabled = false }: { source: "content" | "research"; id: string; disabled?: boolean }) {
  const send = useServerFn(sendOutputWebhook);
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string; deliveryId?: string } | null>(null);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setPending(true); setResult(null);
    try { setResult(await send({ data: { source, id, url, signingSecret: secret || undefined } })); }
    catch (error) { setResult({ ok: false, message: error instanceof Error ? error.message : "Sending failed." }); }
    finally { setPending(false); }
  }
  return <>
    <Button variant="outline" disabled={disabled} onClick={() => setOpen(true)}><Send className="h-4 w-4" />Send output</Button>
    <Dialog open={open} onOpenChange={(next) => { if (pending) return; setOpen(next); if (!next) { setUrl(""); setSecret(""); setResult(null); } }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader><DialogTitle>Send {source === "research" ? "research report" : "content"}</DialogTitle>
          <DialogDescription>{source === "research" ? "Sends the latest completed report" : "Sends this saved output"} to Zapier, Make, or Webhook.site. The document may contain private information. Only send to a destination you trust.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="min-w-0 space-y-4">
          <div className="space-y-2"><Label htmlFor={`webhook-${source}`}>Webhook address</Label><Input id={`webhook-${source}`} type="url" required autoComplete="off" value={url} disabled={pending} onChange={e => { setUrl(e.target.value); setResult(null); }} /></div>
          <div className="space-y-2"><Label htmlFor={`signing-${source}`}>Signing secret (optional)</Label><Input id={`signing-${source}`} type="password" minLength={16} maxLength={256} autoComplete="new-password" value={secret} disabled={pending} onChange={e => setSecret(e.target.value)} /></div>
          <p className="text-xs text-muted-foreground">Addresses and secrets are not saved. Sending does not make this project public. Acceptance does not confirm publication in another app.</p>
          {result && <div role="status" className="border-[3px] border-border p-3 text-sm"><p className={result.ok ? "text-foreground" : "text-destructive"}>{result.message}</p>{result.deliveryId && <p className="mt-2 break-all font-mono text-xs text-muted-foreground">Receipt: {result.deliveryId}</p>}</div>}
          <Button type="submit" disabled={pending || !url.trim() || result?.ok === true} className="w-full">{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}{pending ? "Sending…" : "Send now"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  </>;
}