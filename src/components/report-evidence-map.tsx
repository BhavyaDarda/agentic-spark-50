import { useMemo, useState } from "react";
import { ArrowDown, ArrowRight, ExternalLink, GitBranch, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { extractEvidenceFindings } from "@/lib/report-evidence";

interface EvidenceMapProps {
  topic: string;
  queries: string[];
  markdown: string;
  sources: { url: string; title: string | null; snippet: string | null }[];
}

export function ReportEvidenceMap({ topic, queries, markdown, sources }: EvidenceMapProps) {
  const findings = useMemo(() => extractEvidenceFindings(markdown, sources.length), [markdown, sources.length]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showQueries, setShowQueries] = useState(false);
  const selected = findings.find((finding) => finding.id === selectedId) ?? findings[0];
  const cited = new Set(findings.flatMap((finding) => finding.sourceNumbers));

  return (
    <section aria-labelledby="evidence-map-title" className="my-8 min-w-0 border-y-4 border-border py-6 print:hidden">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 id="evidence-map-title" className="flex items-center gap-2 font-display text-base font-black uppercase">
          <GitBranch aria-hidden="true" className="h-5 w-5" /> Evidence map
        </h2>
        <span className="brut-chip">{findings.length} cited passages</span>
      </div>
      <ol aria-label="Saved research path" className="mb-5 grid min-w-0 gap-2 sm:grid-cols-[1fr_auto_1fr_auto_1fr]">
        <li className="min-w-0 border-[3px] border-border bg-secondary p-3 text-secondary-foreground">
          <p className="mb-2 font-mono text-[10px] font-bold uppercase">01 / Research topic</p>
          <p className="break-words text-sm font-bold">{topic}</p>
        </li>
        <li aria-hidden="true" className="flex items-center justify-center"><ArrowRight className="hidden h-5 w-5 sm:block" /><ArrowDown className="h-5 w-5 sm:hidden" /></li>
        <li className="min-w-0 border-[3px] border-border p-3">
          <p className="mb-2 font-mono text-[10px] font-bold uppercase">02 / Saved searches</p>
          <p className="font-display text-xl font-black">{queries.length}</p>
        </li>
        <li aria-hidden="true" className="flex items-center justify-center"><ArrowRight className="hidden h-5 w-5 sm:block" /><ArrowDown className="h-5 w-5 sm:hidden" /></li>
        <li className="min-w-0 border-[3px] border-border bg-primary p-3 text-primary-foreground">
          <p className="mb-2 font-mono text-[10px] font-bold uppercase">03 / Report evidence</p>
          <p className="text-sm font-bold">{cited.size} linked / {sources.length} saved sources</p>
        </li>
      </ol>
      {queries.length > 0 && (
        <div className="mb-5">
          <Button variant="outline" size="sm" aria-expanded={showQueries} aria-controls="evidence-queries" onClick={() => setShowQueries((value) => !value)}>
            <Search aria-hidden="true" /> {showQueries ? "Hide searches" : "View searches"}
          </Button>
          {showQueries && <ul id="evidence-queries" className="mt-4 space-y-2 border-l-4 border-border pl-4">{queries.map((query, i) => <li key={`${i}-${query}`} className="break-words text-sm"><span className="mr-2 font-mono text-xs font-bold">{String(i + 1).padStart(2, "0")}</span>{query}</li>)}</ul>}
        </div>
      )}
      {!selected ? (
        <p className="text-sm text-muted-foreground">No inline citation links were saved in this report.</p>
      ) : (
        <div className="grid min-w-0 gap-6 lg:grid-cols-2">
          <div className="min-w-0">
            <h3 className="mb-3 font-mono text-xs font-bold uppercase">Cited passages</h3>
            <div className="max-h-80 space-y-2 overflow-y-auto p-1" role="group" aria-label="Select a cited passage">
              {findings.map((finding, index) => (
                <Button key={finding.id} variant={selected.id === finding.id ? "secondary" : "outline"} aria-pressed={selected.id === finding.id} onClick={() => setSelectedId(finding.id)} className="h-auto min-h-14 w-full items-start justify-start whitespace-normal p-3 text-left font-sans text-sm font-normal normal-case tracking-normal">
                  <span className="shrink-0 font-mono text-xs font-bold">{String(index + 1).padStart(2, "0")}</span>
                  <span className="min-w-0 break-words [overflow-wrap:anywhere]">{finding.text}</span>
                </Button>
              ))}
            </div>
          </div>
          <div className="min-w-0" aria-live="polite" aria-atomic="true">
            <h3 className="mb-3 font-mono text-xs font-bold uppercase">Linked evidence / {selected.sourceNumbers.length}</h3>
            <ul className="space-y-3">
              {selected.sourceNumbers.map((number) => {
                const source = sources[number - 1];
                if (!source) return null;
                return <li key={number} className="border-l-4 border-primary pl-3">
                  <a href={source.url} target="_blank" rel="noopener noreferrer nofollow" className="flex items-start gap-2 text-sm font-bold underline underline-offset-4 [overflow-wrap:anywhere]">
                    <span className="font-mono">[{number}]</span><span className="min-w-0">{source.title ?? source.url}</span><ExternalLink aria-hidden="true" className="mt-1 h-3 w-3 shrink-0" />
                  </a>
                  {source.snippet && <p className="mt-2 break-words text-xs leading-relaxed text-muted-foreground">{source.snippet}</p>}
                </li>;
              })}
            </ul>
            {selected.internalNumbers.length > 0 && <p className="mt-3 text-sm text-muted-foreground">Internal citations: {selected.internalNumbers.map((number) => `[B${number}]`).join(", ")}. Private workspace documents are not exposed here.</p>}
            {selected.unresolvedNumbers.length > 0 && <p className="mt-3 text-sm font-bold text-destructive">Unresolved citations: {selected.unresolvedNumbers.map((number) => `[${number}]`).join(", ")}. No matching saved source.</p>}
            <p className="mt-4 border-t-2 border-border pt-3 text-xs text-muted-foreground">Links reflect the report’s citations, not independent verification. Per-search source links were not saved.</p>
          </div>
        </div>
      )}
    </section>
  );
}