import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Markdown } from "@/components/markdown";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink, Lock } from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/r/$slug")({
  head: () => ({ meta: [{ title: "Shared research · Marketing Agent" }] }),
  component: SharedResearchPage,
  // Public share: no auth required. The loader runs server-side and uses a
  // publishable-key client so RLS policies for anon/public rows apply.
  loader: async ({ params }) => {
    const slug = params.slug;
    const url = process.env.SUPABASE_URL!;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
    const sb = createClient<Database>(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: project, error: projErr } = await sb
      .from("research_projects")
      .select("id, topic, goal, depth, is_public, share_slug, workspace_id")
      .eq("share_slug", slug)
      .maybeSingle();

    if (projErr || !project || !project.is_public) {
      return { notFound: true as const };
    }

    const { data: run, error: runErr } = await sb
      .from("research_runs")
      .select("report_markdown, summary, model, created_at, plan")
      .eq("project_id", project.id)
      .eq("status", "succeeded")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (runErr) {
      return { notFound: true as const };
    }

    return { project, run };
  },
  errorComponent: () => (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Research unavailable
          </CardTitle>
          <CardDescription>
            This shared research link is invalid, expired, or has been made private.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link to="/">Go home</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  ),
});

function SharedResearchPage() {
  const data = Route.useLoaderData();

  if ("notFound" in data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Research unavailable
            </CardTitle>
            <CardDescription>
              This shared research link is invalid, expired, or has been made private.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/">Go home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { project, run } = data;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2 text-sm font-medium text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Marketing Agent
          </Link>
          <Button variant="outline" size="sm" asChild>
            <Link to="/auth">Sign in</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-10">
        <div className="mb-8 space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">{project.topic}</h1>
          {project.goal && <p className="text-muted-foreground">{project.goal}</p>}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded-md bg-muted px-2 py-0.5 font-mono uppercase">{project.depth}</span>
            {run?.created_at && (
              <span>Report generated {new Date(run.created_at).toLocaleDateString()}</span>
            )}
          </div>
        </div>

        {run?.summary && (
          <Card className="mb-6 border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-base text-primary">Executive summary</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{run.summary}</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Report</CardTitle>
          </CardHeader>
          <CardContent>
            {run?.report_markdown ? (
              <Markdown>{run.report_markdown}</Markdown>
            ) : (
              <p className="text-sm text-muted-foreground">
                No completed report has been shared yet.
              </p>
            )}
          </CardContent>
        </Card>

        <div className="mt-8 flex justify-center">
          <Button variant="outline" asChild>
            <Link to="/auth">
              <ExternalLink className="mr-2 h-4 w-4" />
              Get your own research agent
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
