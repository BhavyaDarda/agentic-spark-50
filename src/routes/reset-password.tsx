import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, KeyRound } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Set a new password — REACHER AI" },
      {
        name: "description",
        content: "Choose a new password for your REACHER AI account.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Set a new password · REACHER AI" },
      { property: "og:description", content: "Recover access to your REACHER AI account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  ssr: false,
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [checked, setChecked] = useState(false);

  // The recovery link puts a session in place; wait for it before allowing a change.
  useEffect(() => {
    let done = false;
    const timeout = window.setTimeout(() => setChecked(true), 1500);
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        done = true;
        setReady(true);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        done = true;
        setReady(true);
      } else {
        setTimeout(() => {
          if (!done) setReady(false);
        }, 1200);
      }
    });
    return () => { window.clearTimeout(timeout); sub.subscription.unsubscribe(); };
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!ready) return;
    if (password.length < 8) return toast.error("Password must be at least 8 characters.");
    if (password !== confirm) {
      toast.error("Both passwords must match");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated");
      navigate({ to: "/app", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update password");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12 text-foreground">
      <div className="w-full max-w-sm">
        <div className="brut bg-card p-6">
          <div className="brut-sm mb-5 flex h-10 w-10 -rotate-12 items-center justify-center bg-primary">
            <KeyRound className="h-5 w-5 text-primary-foreground" strokeWidth={3} />
          </div>
          <h1 className="font-display text-2xl font-black uppercase leading-tight tracking-[-0.03em]">
            Set a new password
          </h1>
          <p className="mt-2 text-sm">
            {ready
              ? "Choose something you haven't used before."
              : "Open this page from the link in your reset email."}
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label
                htmlFor="password"
                className="font-mono text-[10px] font-bold uppercase tracking-widest"
              >
                New password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="confirm"
                className="font-mono text-[10px] font-bold uppercase tracking-widest"
              >
                Confirm password
              </Label>
              <Input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                className="h-11"
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy || !ready}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update password
            </Button>
          </form>
          {checked && !ready && <Button variant="link" className="mt-3" onClick={() => navigate({ to: "/auth" })}>Request a new reset link</Button>}
        </div>
      </div>
    </main>
  );
}
