import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Zap } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { SITE } from "@/lib/site";

/**
 * Shared frame for public documents (terms, privacy, disclosure, contact).
 * Long-form, readable measure, one sticky table of contents on wide screens.
 */
export function LegalPage({
  eyebrow,
  title,
  intro,
  updated = SITE.legalUpdated,
  sections,
  aside,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  updated?: string;
  sections: { id: string; heading: string; body: ReactNode }[];
  aside?: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <header className="border-b-[6px] border-border bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-3">
            <span className="brut flex h-9 w-9 -rotate-12 items-center justify-center bg-primary">
              <Zap className="h-5 w-5 text-primary-foreground" strokeWidth={3} aria-hidden="true" />
            </span>
            <span className="font-display text-sm font-black uppercase tracking-tighter sm:text-base">
              {SITE.name}
            </span>
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.18em] hover:text-primary"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Back home
          </Link>
        </div>
      </header>

      <main id="main" tabIndex={-1} className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <p className="brut-chip mb-4 inline-block">{eyebrow}</p>
        <h1 className="max-w-3xl font-display text-[clamp(2rem,5vw,3.6rem)] font-black uppercase leading-[0.95] tracking-[-0.03em]">
          {title}
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed">{intro}</p>
        <p className="mt-3 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          Last updated {new Date(updated).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
        </p>

        <div className="mt-12 grid gap-12 lg:grid-cols-[220px_1fr]">
          <nav aria-label="On this page" className="lg:sticky lg:top-6 lg:self-start">
            <h2 className="font-mono text-[11px] font-bold uppercase tracking-[0.24em]">Contents</h2>
            <ol className="mt-3 space-y-1.5 border-l-[3px] border-border pl-3">
              {sections.map((s, i) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="text-sm underline-offset-4 hover:text-primary hover:underline"
                  >
                    <span className="mr-1.5 font-mono text-[10px] text-muted-foreground">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {s.heading}
                  </a>
                </li>
              ))}
            </ol>
            {aside}
          </nav>

          <article className="legal-prose max-w-3xl">
            {sections.map((s, i) => (
              <section key={s.id} id={s.id} className="scroll-mt-6 border-t-[3px] border-border pt-8 [&+section]:mt-10">
                <h2 className="font-display text-xl font-black uppercase tracking-tight sm:text-2xl">
                  <span className="mr-2 font-mono text-sm text-muted-foreground">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {s.heading}
                </h2>
                <div className="mt-4 space-y-4 text-[15px] leading-relaxed">{s.body}</div>
              </section>
            ))}
          </article>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

/** Metadata helper so every document has distinct, specific head tags. */
export function legalHead(title: string, description: string, path: string) {
  const full = `${title} — ${SITE.name}`;
  return {
    meta: [
      { title: full },
      { name: "description", content: description },
      { property: "og:title", content: full },
      { property: "og:description", content: description },
      { property: "og:type", content: "article" },
      { property: "og:url", content: `${SITE.origin}${path}` },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: `${SITE.origin}${path}` }],
  };
}
