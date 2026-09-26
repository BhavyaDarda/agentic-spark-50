import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, legalHead } from "@/components/legal-page";

export const Route = createFileRoute("/credits")({
  staticData: { sitemap: true },
  head: () =>
    legalHead(
      "Credits and licences",
      "The open-source software, typefaces, icons and AI providers REACHER AI is built on, with their licences and data terms.",
      "/credits",
    ),
  component: CreditsPage,
});

const SOFTWARE: [string, string, string][] = [
  ["React", "MIT", "https://react.dev/"],
  ["TanStack Start, Router and Query", "MIT", "https://tanstack.com/"],
  ["Vite", "MIT", "https://vite.dev/"],
  ["Tailwind CSS", "MIT", "https://tailwindcss.com/"],
  ["shadcn/ui and Radix Primitives", "MIT", "https://ui.shadcn.com/"],
  ["Vercel AI SDK", "Apache-2.0", "https://sdk.vercel.ai/"],
  ["Supabase JavaScript client", "MIT", "https://supabase.com/docs/reference/javascript"],
  ["Zod", "MIT", "https://zod.dev/"],
  ["Sonner", "MIT", "https://sonner.emilkowal.ski/"],
  ["Model Context Protocol SDK", "MIT", "https://modelcontextprotocol.io/"],
];

const TYPE: [string, string, string][] = [
  ["Unbounded by NaN (display)", "SIL Open Font License 1.1", "https://fonts.google.com/specimen/Unbounded"],
  ["Alata by Spyros Zevelakis and Emil Kozole (body)", "SIL Open Font License 1.1", "https://fonts.google.com/specimen/Alata"],
  ["JetBrains Mono by JetBrains (monospace)", "SIL Open Font License 1.1", "https://www.jetbrains.com/lp/mono/"],
  ["Lucide icons", "ISC", "https://lucide.dev/"],
];

const PROVIDERS: [string, string, string][] = [
  ["Lovable Cloud (Supabase)", "Database, authentication, storage", "https://supabase.com/privacy"],
  ["Lovable AI Gateway", "Routes model calls; no training on your content", "https://lovable.dev/privacy"],
  ["OpenAI", "Chat and synthesis model", "https://openai.com/policies/"],
  ["Anthropic", "Search-capable model used as a search fallback and for citation checks", "https://www.anthropic.com/legal/privacy"],
  ["Google", "Embeddings for Brand Memory search", "https://policies.google.com/privacy"],
  ["Tavily", "Live web search", "https://tavily.com/privacy"],
  ["Cloudflare", "Hosting and edge delivery", "https://www.cloudflare.com/privacypolicy/"],
];

function LicenceTable({ rows, thirdHeading }: { rows: [string, string, string][]; thirdHeading: string }) {
  return (
    <table className="w-full border-[3px] border-border text-sm">
      <thead>
        <tr className="bg-secondary text-left">
          <th scope="col" className="border-b-[3px] border-border p-2">Name</th>
          <th scope="col" className="border-b-[3px] border-border p-2">{thirdHeading}</th>
          <th scope="col" className="border-b-[3px] border-border p-2">Link</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([name, licence, url]) => (
          <tr key={name} className="border-t-[2px] border-border align-top">
            <td className="p-2 font-medium">{name}</td>
            <td className="p-2">{licence}</td>
            <td className="p-2">
              <a href={url} target="_blank" rel="noreferrer noopener" className="underline underline-offset-4 hover:text-primary-dark">
                {new URL(url).hostname}
              </a>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function CreditsPage() {
  return (
    <LegalPage
      eyebrow="credits"
      title="Built on other people's good work."
      intro="REACHER AI stands on open-source software, open-licensed typefaces, and commercial AI and search providers. This page names them and links to the terms that apply. Licence texts are shipped inside the application bundle as required."
      sections={[
        {
          id: "software",
          heading: "Open-source software",
          body: (
            <>
              <LicenceTable rows={SOFTWARE} thirdHeading="Licence" />
              <p>
                Dozens of smaller packages are used transitively; their notices are included in the
                distributed bundle. The Model Context Protocol lets workspaces connect their own tool
                servers; those servers are operated by their owners under their own terms.
              </p>
            </>
          ),
        },
        {
          id: "type",
          heading: "Typefaces and icons",
          body: <LicenceTable rows={TYPE} thirdHeading="Licence" />,
        },
        {
          id: "providers",
          heading: "AI, search and infrastructure providers",
          body: (
            <>
              <LicenceTable rows={PROVIDERS} thirdHeading="Used for" />
              <p>
                Model output is generated per request from the sources retrieved during the run and
                the material in your workspace. Cited web pages remain the property of their
                publishers; the reports quote and link to them under fair use and with attribution.
              </p>
            </>
          ),
        },
        {
          id: "trademarks",
          heading: "Trademarks",
          body: (
            <p>
              Product and company names mentioned in reports or sponsor cards are trademarks of their
              respective owners and are used for identification only. Their appearance does not imply
              endorsement of, or by, REACHER AI.
            </p>
          ),
        },
      ]}
    />
  );
}
