import { Link } from "@tanstack/react-router";
import { Zap } from "lucide-react";
import { SITE } from "@/lib/site";

const COLUMNS: { heading: string; links: { to: string; label: string }[] }[] = [
  {
    heading: "Product",
    links: [
      { to: "/auth", label: "Sign in" },
      { to: "/auth?mode=signup", label: "Create a workspace" },
      { to: "/security", label: "Security" },
      { to: "/accessibility", label: "Accessibility" },
    ],
  },
  {
    heading: "Sponsors",
    links: [
      { to: "/advertise", label: "Advertise on reports" },
      { to: "/advertise#disclosure", label: "Sponsor disclosure" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { to: "/terms", label: "Terms of service" },
      { to: "/privacy", label: "Privacy policy" },
      { to: "/acceptable-use", label: "Acceptable use" },
      { to: "/credits", label: "Credits and licences" },
    ],
  },
  {
    heading: "Contact",
    links: [{ to: "/contact", label: "Contact us" }],
  },
];

export function SiteFooter() {
  const year = new Date().getUTCFullYear();
  return (
    <footer className="border-t-[6px] border-border bg-background" aria-labelledby="site-footer-heading">
      <h2 id="site-footer-heading" className="sr-only">
        Site footer
      </h2>
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.2fr_repeat(4,1fr)]">
        <div>
          <Link to="/" className="inline-flex items-center gap-3">
            <span className="brut flex h-9 w-9 -rotate-12 items-center justify-center bg-primary">
              <Zap className="h-5 w-5 text-primary-foreground" strokeWidth={3} aria-hidden="true" />
            </span>
            <span className="font-display text-sm font-black uppercase tracking-tighter">
              {SITE.name}
            </span>
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
            {SITE.tagline}
          </p>
          <p className="mt-4 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            free to use · funded by labelled sponsor cards
          </p>
        </div>

        {COLUMNS.map((col) => (
          <nav key={col.heading} aria-label={col.heading}>
            <h3 className="font-mono text-[11px] font-bold uppercase tracking-[0.24em]">
              {col.heading}
            </h3>
            <ul className="mt-3 space-y-2">
              {col.links.map((l) => (
                <li key={l.to}>
                  <a
                    href={l.to}
                    className="text-sm font-medium underline-offset-4 hover:text-primary-dark hover:underline focus-visible:text-primary-dark"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t-[3px] border-border">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-4 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground sm:px-6">
          <span>
            © {year} {SITE.legalEntity || SITE.operator}. All rights reserved.
          </span>
          <span>No tracking pixels. No third-party ad scripts.</span>
        </div>
      </div>
    </footer>
  );
}
