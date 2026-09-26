// Single source of truth for public identity. Client-safe: no secrets here.
//
// Operator details below are what the legal pages, contact form and metadata
// print. Fill `legalEntity`, `legalAddress` and `jurisdiction` with the real
// registered details before onboarding paying sponsors.

export const SITE = {
  /** Product name shown in the interface. */
  name: "REACHER AI",
  /** Organisation that operates the product. */
  operator: "REACHER AI",
  /** Canonical public origin. Public report links, sitemaps and citation checks use it. */
  origin: "https://reacher-ai.lovable.app",
  tagline: "Auditable marketing research and content, run by a team of AI agents.",
  description:
    "REACHER AI plans, researches the live web, writes on-brand content, and publishes citable reports with sources, critic scores, and run costs shown openly.",
  /** Registered legal entity. Empty until the operator provides it. */
  legalEntity: "",
  /** Registered address. Empty until the operator provides it. */
  legalAddress: "",
  /** Governing law for the terms. Empty until the operator provides it. */
  jurisdiction: "",
  /** Date the legal documents were last revised (ISO date). */
  legalUpdated: "2026-09-25",
  /** Sub-processors named in the privacy policy. */
  subprocessors: [
    { name: "Lovable Cloud (Supabase)", purpose: "Database, authentication, storage of your workspace data", region: "EU / US (provider-managed)" },
    { name: "Lovable AI Gateway", purpose: "Runs the language models that draft content and research", region: "US" },
    { name: "OpenAI, Anthropic, Google (via the gateway)", purpose: "Model inference for chat, research synthesis and embeddings", region: "US" },
    { name: "Tavily", purpose: "Live web search used by the research agents", region: "US" },
    { name: "Cloudflare", purpose: "Hosting and edge delivery of the application", region: "Global" },
  ],
} as const;

export function absoluteUrl(path: string): string {
  return `${SITE.origin}${path.startsWith("/") ? path : `/${path}`}`;
}
