import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { deleteMyAccount, exportMyData } from "@/lib/account.functions";
import { Download, LogOut } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AccountPanel() {
  const navigate = useNavigate();
  const del = useServerFn(deleteMyAccount);
  const exportData = useServerFn(exportMyData);
  const qc = useQueryClient();
  const [exporting, setExporting] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (next.length < 8) return toast.error("New password must be at least 8 characters.");
    setBusy(true);
    try {
      const { data } = await supabase.auth.getUser();
      const email = data.user?.email;
      if (!email) throw new Error("No email on this account.");
      const { error: signErr } = await supabase.auth.signInWithPassword({ email, password: current });
      if (signErr) throw new Error("Current password is incorrect.");
      const { error } = await supabase.auth.updateUser({ password: next });
      if (error) throw error;
      setCurrent("");
      setNext("");
      toast.success("Password updated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update password.");
    } finally {
      setBusy(false);
    }
  }

  async function removeAccount() {
    setDeleting(true);
    try {
      if (confirm !== "DELETE") return;
      await del({ data: { confirm } });
      await supabase.auth.signOut();
      qc.clear();
      toast.success("Your account has been deleted.");
      navigate({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete account.");
      setDeleting(false);
    }
  }

  async function downloadData() {
    setExporting(true);
    try {
      const data = await exportData();
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url; link.download = `reacher-ai-data-${new Date().toISOString().slice(0, 10)}.json`;
      link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success("Your data export is ready.");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Could not export your data."); }
    finally { setExporting(false); }
  }

  async function signOutEverywhere() {
    setSigningOut(true);
    try {
      const { error } = await supabase.auth.signOut({ scope: "global" });
      if (error) throw error;
      qc.clear();
      toast.success("Signed out on all devices.");
      await navigate({ to: "/auth" });
    } catch (err) { toast.error(err instanceof Error ? err.message : "Could not sign out."); }
    finally { setSigningOut(false); }
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader><CardTitle>Your data and sessions</CardTitle><CardDescription>Download your profile, saved content, artifacts, and latest completed research reports. Prompts, agent traces, and teammates’ records are excluded.</CardDescription></CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button variant="outline" disabled={exporting} onClick={downloadData}><Download className="h-4 w-4" />{exporting ? "Preparing…" : "Export my data"}</Button>
          <Button variant="outline" disabled={signingOut} onClick={signOutEverywhere}><LogOut className="h-4 w-4" />{signingOut ? "Signing out…" : "Sign out everywhere"}</Button>
          <p className="w-full text-xs text-muted-foreground">Other devices lose renewal access immediately; an already-issued session may remain valid until it expires.</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Change password</CardTitle>
          <CardDescription>Enter your current password to set a new one.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={changePassword} className="grid max-w-md gap-4">
            <div className="grid gap-2">
              <Label htmlFor="cur-pw">Current password</Label>
              <Input id="cur-pw" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="new-pw">New password</Label>
              <Input id="new-pw" type="password" autoComplete="new-password" minLength={8} value={next} onChange={(e) => setNext(e.target.value)} required />
            </div>
            <Button type="submit" disabled={busy} className="w-fit">
              {busy ? "Updating…" : "Update password"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-destructive">
        <CardHeader>
          <CardTitle>Delete account</CardTitle>
          <CardDescription>
            Permanently removes your account. Workspaces where you are the only member are deleted with all their
            content; shared workspaces keep their data for your teammates. This cannot be undone.
            Transfer ownership first if you are a shared workspace’s only owner.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid max-w-md gap-4">
          <div className="grid gap-2">
            <Label htmlFor="del-confirm">Type DELETE to confirm</Label>
            <Input id="del-confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
          <Button variant="destructive" className="w-fit" disabled={confirm !== "DELETE" || deleting} onClick={removeAccount}>
            {deleting ? "Deleting…" : "Delete my account"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
