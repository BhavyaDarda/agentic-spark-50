import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Markdown } from "@/components/markdown";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink, Lock, ShieldCheck } from "lucide-react";
import { getPublicReport } from "@/lib/public-report.functions";
import type { PublicReport } from "@/lib/public-report.server";
import { SponsorUnit } from "@/components/sponsor-unit";

export const Route = createFileRoute("/r/$slug")({
  head: ({ params, loaderData }) => {
    const report = (loaderData as { report: PublicReport | null } | undefined)?.report ?? null;
    const title = report
      ? `${report.project.topic} · Research report`
      : "Shared research · Marketing Agent";
    const description =
      report?.run?.summary?.slice(0, 155) ??
      report?.project.goal?.slice(0, 155) ??
      "A cited, multi-agent research report shared from Marketing Agent.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: `/r/${params.slug}` },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: `/r/${params.slug}` }],
    };
  },
  component: SharedResearchPage,

  // Public share: no auth required. The server fn reads with a publishable-key
  // client, so only rows the public policies allow are visible.
  loader: ({ params }) => getPublicReport({ data: { slug: params.slug } }),
  errorComponent: () => <ReportUnavailable />,
});

function ReportUnavailable() {
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-none border border-border/50 bg-muted/20 px-3 py-2">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

function SharedResearchPage() {
  const { report } = Route.useLoaderData() as { report: PublicReport | null };

  if (!report) return <ReportUnavailable />;

  const { project, run, sources, trust, sponsor, citations } = report;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b-[3px] border-border bg-background">
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
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded-none bg-muted px-2 py-0.5 font-mono uppercase">
              {project.depth}
            </span>
            {run?.createdAt && (
              <span>Report generated {new Date(run.createdAt).toLocaleDateString()}</span>
            )}
          </div>
        </div>

        {/* Trust surface: what the run actually did, in the open. */}
        <section className="mb-6 rounded-none border-[3px] border-border bg-card/50 p-4">
          <div className="mb-3 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">How this report was made</h2>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            <Stat label="Sources cited" value={String(trust.sourceCount)} />
            <Stat label="Searches run" value={String(trust.queryCount)} />
            <Stat
              label="Critic score"
              value={trust.criticScore === null ? "—" : `${trust.criticScore}/100`}
            />
            <Stat
              label="Run time"
              value={trust.durationSeconds === null ? "—" : `${trust.durationSeconds}s`}
            />
            <Stat
              label="Tokens"
              value={
                trust.tokensInput === null && trust.tokensOutput === null
                  ? "—"
                  : `${((trust.tokensInput ?? 0) + (trust.tokensOutput ?? 0)).toLocaleString()}`
              }
            />
          </div>
          {trust.criticNotes && (
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              <span className="font-medium text-foreground">Critic review: </span>
              {trust.criticNotes}
            </p>
          )}
          {trust.model && (
            <p className="mt-2 font-mono text-[11px] text-muted-foreground/70">
              model: {trust.model}
            </p>
          )}
        </section>

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
            {run?.reportMarkdown ? (
              <Markdown>{run.reportMarkdown}</Markdown>
            ) : (
              <p className="text-sm text-muted-foreground">
                No completed report has been shared yet.
              </p>
            )}
          </CardContent>
        </Card>

        {sources.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base">Sources ({sources.length})</CardTitle>
              <CardDescription>Every claim above traces back to this list.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {sources.map((source, i) => (
                <a
                  key={`${source.url}-${i}`}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="block rounded-none border border-border/50 p-3 transition-colors hover:border-primary/40 hover:bg-muted/30"
                >
                  <p className="text-sm font-medium text-foreground">
                    {source.title ?? source.url}
                  </p>
                  <p className="truncate font-mono text-[11px] text-muted-foreground">
                    {source.url}
                  </p>
                  {source.snippet && (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {source.snippet}
                    </p>
                  )}
                </a>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Sponsor slot — public report pages only. Never inside the report
            body, never inside the signed-in app, no third-party scripts. */}
        {sponsor && <SponsorUnit sponsor={sponsor} />}

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
