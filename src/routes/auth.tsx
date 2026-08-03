import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useState, type FormEvent, useEffect } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { SignalShader } from "@/components/fx/SignalShader";

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
    <div className="relative flex h-8 w-8 items-center justify-center">
      <div className="absolute inset-0 rounded-md border border-primary/40 bg-primary/10" />
      <svg viewBox="0 0 24 24" className="relative h-[18px] w-[18px] text-primary" fill="none">
        <path d="M4 12 L12 4 L20 12 L12 20 Z" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="12" cy="12" r="2.2" fill="currentColor" />
      </svg>
    </div>
  );
}

function AuthPage() {
  const { mode = "signin" } = useSearch({ from: "/auth" });
  const navigate = useNavigate();
  const [tab, setTab] = useState<"signin" | "signup">(mode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (tab === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back");
        navigate({ to: "/app" });
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/app` },
        });
        if (error) throw error;
        toast.success("Account created — signing you in…");
        navigate({ to: "/app" });
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
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/app` },
      });
      if (error) throw error;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Google sign-in failed";
      toast.error(msg);
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen bg-background text-foreground lg:grid-cols-[1.1fr_1fr]">
      {/* Left — quiet shader panel */}
      <aside className="relative hidden overflow-hidden lg:block">
        <SignalShader />
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-[0.35] [mask-image:radial-gradient(60%_60%_at_50%_40%,black,transparent)]" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-background" />
        <div className="pointer-events-none absolute inset-0 noise-overlay" />

        <div className="relative flex h-full flex-col justify-between p-10">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back home
          </Link>

          <div className="max-w-md">
            <div className="text-mono text-[10px] uppercase tracking-[0.22em] text-primary/80">
              Marketing Agent
            </div>
            <h1 className="text-display mt-4 text-balance text-4xl font-semibold leading-[1.05] tracking-[-0.03em] md:text-5xl">
              The marketing team
              <br />
              <span className="font-serif-display text-primary">that actually ships.</span>
            </h1>
            <p className="mt-4 max-w-sm text-sm text-muted-foreground">
              One prompt. Five specialist agents. Cited, on-brand work in minutes.
            </p>
          </div>

          <div className="flex items-center gap-2 text-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_var(--color-primary)]" />
            SOC 2 · GDPR · SSO ready
          </div>
        </div>
      </aside>

      {/* Right — form */}
      <main className="relative flex items-center justify-center overflow-hidden px-6 py-12">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(50%_40%_at_50%_0%,oklch(0.82_0.11_180/0.10),transparent_70%)] lg:hidden" />
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <Glyph />
            <span className="text-display text-[15px] font-semibold tracking-tight">
              Marketing Agent
            </span>
          </div>

          <div className="mb-8">
            <h2 className="text-display text-3xl font-semibold tracking-[-0.02em]">
              {tab === "signin" ? "Welcome back." : "Create your workspace."}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {tab === "signin"
                ? "Sign in to pick up where you left off."
                : "No credit card required. Free forever plan available."}
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full rounded-full border-white/15 bg-white/[0.02] backdrop-blur hover:bg-white/[0.05]"
            onClick={oauth}
            disabled={busy}
          >
            <GoogleGlyph />
            Continue with Google
          </Button>

          <div className="my-6 flex items-center gap-3 text-mono text-[10px] uppercase tracking-widest text-muted-foreground/70">
            <div className="h-px flex-1 bg-white/10" /> or <div className="h-px flex-1 bg-white/10" />
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label
                htmlFor="email"
                className="text-mono text-[10px] uppercase tracking-widest text-muted-foreground"
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
                className="h-11 rounded-lg border-white/10 bg-white/[0.02] focus-visible:border-primary/50 focus-visible:ring-[3px] focus-visible:ring-primary/20"
              />
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="password"
                className="text-mono text-[10px] uppercase tracking-widest text-muted-foreground"
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
                className="h-11 rounded-lg border-white/10 bg-white/[0.02] focus-visible:border-primary/50 focus-visible:ring-[3px] focus-visible:ring-primary/20"
              />
            </div>
            <Button
              type="submit"
              className="h-11 w-full rounded-full bg-primary text-primary-foreground shadow-[0_0_0_1px_oklch(0.82_0.11_180/0.4),0_10px_30px_-8px_oklch(0.82_0.11_180/0.55)] hover:bg-primary/90"
              disabled={busy}
            >
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {tab === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            {tab === "signin" ? (
              <>
                Don't have an account?{" "}
                <button
                  type="button"
                  className="text-primary underline-offset-4 hover:underline"
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
                  className="text-primary underline-offset-4 hover:underline"
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
