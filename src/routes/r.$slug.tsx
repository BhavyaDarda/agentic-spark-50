import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Markdown } from "@/components/markdown";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink, Lock, Quote, ShieldCheck } from "lucide-react";
import { getPublicReport } from "@/lib/public-report.functions";
import type { PublicReport } from "@/lib/public-report.server";
import { SponsorUnit } from "@/components/sponsor-unit";
import { BrandMark } from "@/components/brand-mark";
import { SITE } from "@/lib/site";
import { ReportEvidenceMap } from "@/components/report-evidence-map";

export const Route = createFileRoute("/r/$slug")({
  staticData: { sitemap: true },
  head: ({ params, loaderData }) => {
    const report = (loaderData as { report: PublicReport | null } | undefined)?.report ?? null;
    const title = report
      ? `${report.project.topic} · Research report`
       : `Shared research · ${SITE.name}`;
    const description =
      report?.run?.summary?.slice(0, 155) ??
      report?.project.goal?.slice(0, 155) ??
       `A cited, multi-agent research report shared from ${SITE.name}.`;
     const url = `${SITE.origin}/r/${params.slug}`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { name: "twitter:card", content: "summary_large_image" },
        ...(report ? [] : [{ name: "robots", content: "noindex" }]),
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: report
        ? [
            {
              type: "application/ld+json",
              children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "Article",
                headline: report.project.topic,
                description,
                url,
                 publisher: { "@type": "Organization", name: SITE.operator },
              }),
            },
          ]
        : [],
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
    <div className="min-w-0 border-l-[3px] border-border px-3 py-2">
      <p className="font-mono text-[10px] font-bold uppercase text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 break-words font-mono text-lg font-bold text-foreground">{value}</p>
    </div>
  );
}

function SharedResearchPage() {
  const { report } = Route.useLoaderData() as { report: PublicReport | null };

  if (!report) return <ReportUnavailable />;

  const { project, run, sources, trust, sponsor, citations, branding, queries } = report;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b-[3px] border-border bg-background">
        <div className="mx-auto flex min-h-16 max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="flex items-center gap-2 text-sm font-medium text-foreground">
            <BrandMark className="h-7 w-7" />
            <span className="font-display text-xs font-black">{SITE.name}</span>
          </Link>
          <div className="flex items-center gap-2 print:hidden">
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Download aria-hidden="true" />
              <span className="hidden sm:inline">Download PDF</span>
              <span className="sm:hidden">PDF</span>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/auth">Sign in</Link>
            </Button>
          </div>
        </div>
      </header>

      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        {branding && (
          <div
            className="mb-6 flex items-center gap-3 border-[3px] border-foreground p-3"
            style={branding.accent ? { borderLeftColor: branding.accent, borderLeftWidth: 12 } : undefined}
          >
            {branding.logoUrl && (
              <img src={branding.logoUrl} alt={branding.preparedBy ?? "Publisher logo"} className="h-10 w-auto max-w-[160px] object-contain" />
            )}
            <div className="text-sm">
              {branding.preparedBy && <p className="font-display text-xs uppercase">Prepared by {branding.preparedBy}</p>}
              <p className="text-xs text-muted-foreground">Made with {SITE.name}</p>
            </div>
          </div>
        )}
        <div className="mb-8 space-y-4">
          <p className="font-mono text-xs font-bold uppercase">Published research / {SITE.name}</p>
          <h1 className="break-words font-display text-2xl font-black uppercase leading-tight tracking-normal sm:text-4xl">{project.topic}</h1>
          {project.goal && <p className="max-w-3xl text-base text-muted-foreground">{project.goal}</p>}
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="brut-chip">
              {project.depth}
            </span>
            {run?.createdAt && (
              <span>Report generated {new Date(run.createdAt).toLocaleDateString()}</span>
            )}
          </div>
        </div>

        {/* Trust surface: what the run actually did, in the open. */}
        <section aria-labelledby="report-method" className="mb-8 border-y-4 border-border py-5">
          <div className="mb-3 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-foreground" />
            <h2 id="report-method" className="text-sm font-black">How this report was made</h2>
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
          <section aria-labelledby="report-summary" className="mb-8 border-l-4 border-primary pl-4 sm:pl-6">
            <h2 id="report-summary" className="mb-4 text-base font-black">Executive summary</h2>
            <p className="text-base leading-relaxed">{run.summary}</p>
          </section>
        )}

        {run?.reportMarkdown && <ReportEvidenceMap topic={project.topic} queries={queries} markdown={run.reportMarkdown} sources={sources} />}

        <section aria-labelledby="report-body" className="min-w-0 border-t-4 border-border py-6 [overflow-wrap:anywhere]">
          <h2 id="report-body" className="mb-6 text-base font-black">Report</h2>
          <div>
            {run?.reportMarkdown ? (
              <Markdown>{run.reportMarkdown}</Markdown>
            ) : (
              <p className="text-sm text-muted-foreground">
                No completed report has been shared yet.
              </p>
            )}
          </div>
        </section>

        {sources.length > 0 && (
          <section aria-labelledby="report-sources" className="mt-6 border-t-4 border-border py-6">
            <h2 id="report-sources" className="mb-5 text-base font-black">Sources ({sources.length})</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {sources.map((source, i) => (
                <a
                  key={`${source.url}-${i}`}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                   className="min-w-0 border-[3px] border-border p-4 transition-colors hover:bg-secondary hover:text-secondary-foreground"
                >
                  <span className="mb-3 inline-block bg-secondary px-2 py-1 font-mono text-xs font-bold text-secondary-foreground">{String(i + 1).padStart(2, "0")}</span>
                  <p className="break-words text-sm font-bold">
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
            </div>
          </section>
        )}

        {/* Cited by — the loop closes here: published, then measured. */}
        {citations.length > 0 && (
          <section aria-labelledby="report-citations" className="mt-6 border-t-4 border-border py-6">
              <h2 id="report-citations" className="mb-3 flex items-center gap-2 text-base">
                <Quote className="h-4 w-4 text-primary-dark" />
                Cited by ({citations.length})
              </h2>
              <p className="mb-5 text-sm text-muted-foreground">
                Answer engines and pages observed pointing at this report.
              </p>
            <div className="space-y-2">
              {citations.map((c, i) => (
                <a
                  key={`${c.engine}-${c.citingUrl}-${i}`}
                  href={c.citingUrl}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="flex flex-wrap items-center gap-2 border-[3px] border-border p-3 transition-colors hover:bg-muted/30"
                >
                  <span className="bg-primary px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-primary-foreground">
                    {c.engine}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                    {c.citingTitle ?? c.citingUrl}
                  </span>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    since {new Date(c.firstSeenAt).toLocaleDateString()}
                  </span>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Sponsor slot — public report pages only. Never inside the report
            body, never inside the signed-in app, no third-party scripts. */}
        {sponsor && <div className="print:hidden"><SponsorUnit sponsor={sponsor} /></div>}

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
