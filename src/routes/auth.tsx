import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useState, type FormEvent, useEffect } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Zap } from "lucide-react";

const searchSchema = z.object({
  mode: z.enum(["signin", "signup"]).optional(),
  next: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Marketing Agent" },
      {
        name: "description",
        content:
          "Sign in or create your Marketing Agent workspace. One prompt, five specialist agents.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  validateSearch: searchSchema,
  ssr: false,
  component: AuthPage,
});

function Glyph() {
  return (
    <div className="brut-sm flex h-10 w-10 -rotate-12 items-center justify-center bg-primary">
      <Zap className="h-5 w-5 text-primary-foreground" strokeWidth={3} />
    </div>
  );
}


function AuthPage() {
  const { mode = "signin", next } = useSearch({ from: "/auth" });
  const navigate = useNavigate();
  const [tab, setTab] = useState<"signin" | "signup">(mode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  // If the user is already signed in, send them onward immediately.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        navigate({ to: next || "/app", replace: true });
      }
    });
  }, [next, navigate]);

  const afterAuth = () => {
    if (next) {
      window.location.href = next;
    } else {
      navigate({ to: "/app" });
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (tab === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back");
        afterAuth();
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/app` },
        });
        if (error) throw error;
        toast.success("Account created — signing you in…");
        afterAuth();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Authentication failed";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const oauth = async () => {
    setBusy(true);
    try {
      const redirectTo = next
        ? `${window.location.origin}/auth?next=${encodeURIComponent(next)}`
        : `${window.location.origin}/app`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });
      if (error) throw error;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Google sign-in failed";
      toast.error(msg);
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen bg-background text-foreground lg:grid-cols-[1.05fr_1fr]">
      {/* Left — brutalist manifesto panel */}
      <aside className="relative hidden overflow-hidden border-r-[6px] border-border bg-primary text-primary-foreground lg:block">
        <div className="pointer-events-none absolute inset-0 brutal-dots" aria-hidden />
        <div className="relative flex h-full flex-col justify-between p-10">
          <Link
            to="/"
            className="inline-flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-widest hover:underline"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={3} />
            Back home
          </Link>

          <div className="max-w-lg">
            <span className="border-[3px] border-border bg-secondary px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-secondary-foreground">
              Marketing Agent
            </span>
            <h1 className="mt-6 font-display text-[clamp(2.2rem,4.5vw,3.6rem)] font-black uppercase leading-[0.92] tracking-[-0.04em]">
              The marketing
              <br />
              team that
              <br />
              <span className="bg-secondary px-2 text-secondary-foreground">
                actually ships.
              </span>
            </h1>
            <p className="mt-5 max-w-sm text-sm leading-relaxed">
              One prompt. Six specialist agents. Cited, on-brand work in minutes — free, funded by
              one labelled sponsor card per published report.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {["RLS everywhere", "No exposed keys", "Audit trail"].map((t) => (
              <span
                key={t}
                className="border-[3px] border-border bg-background px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-foreground"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </aside>

      {/* Right — form */}
      <main className="relative flex items-center justify-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <Glyph />
            <span className="font-display text-base font-black uppercase tracking-tighter">
              Marketing Agent
            </span>
          </div>

          <div className="brut bg-card p-6">
            <h2 className="font-display text-2xl font-black uppercase leading-tight tracking-[-0.03em]">
              {tab === "signin" ? "Welcome back." : "Create your workspace."}
            </h2>
            <p className="mt-2 text-sm">
              {tab === "signin"
                ? "Sign in to pick up where you left off."
                : "No credit card. No plans. Free forever."}
            </p>

            <Button
              type="button"
              variant="outline"
              className="mt-6 w-full"
              onClick={oauth}
              disabled={busy}
            >
              <GoogleGlyph />
              Continue with Google
            </Button>

            <div className="my-5 flex items-center gap-3 font-mono text-[10px] font-bold uppercase tracking-widest">
              <div className="h-[3px] flex-1 bg-border" /> or{" "}
              <div className="h-[3px] flex-1 bg-border" />
            </div>

            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-1.5">
                <Label
                  htmlFor="email"
                  className="font-mono text-[10px] font-bold uppercase tracking-widest"
                >
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="password"
                  className="font-mono text-[10px] font-bold uppercase tracking-widest"
                >
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete={tab === "signin" ? "current-password" : "new-password"}
                  className="h-11"
                />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {tab === "signin" ? "Sign in" : "Create account"}
              </Button>
            </form>
          </div>

          <div className="mt-6 text-center text-sm">
            {tab === "signin" ? (
              <>
                Don't have an account?{" "}
                <button
                  type="button"
                  className="font-bold text-primary underline-offset-4 hover:underline"
                  onClick={() => setTab("signup")}
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  className="font-bold text-primary underline-offset-4 hover:underline"
                  onClick={() => setTab("signin")}
                >
                  Sign in
                </button>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}


function GoogleGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="mr-2 h-4 w-4" aria-hidden>
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.2 1.4-1.6 4-5.5 4-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.6 14.6 2.6 12 2.6 6.8 2.6 2.6 6.8 2.6 12S6.8 21.4 12 21.4c6.9 0 9.5-4.8 9.5-7.4 0-.5-.1-.9-.1-1.3H12z"
      />
    </svg>
  );
}
