import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalPage, legalHead } from "@/components/legal-page";

export const Route = createFileRoute("/security")({
  staticData: { sitemap: true },
  head: () =>
    legalHead(
      "Security",
      "How Marketing Agent isolates workspaces, keeps provider keys on the server, limits abuse, and logs sensitive actions. Plus how to report a vulnerability.",
      "/security",
    ),
  component: SecurityPage,
});

function SecurityPage() {
  return (
    <LegalPage
      eyebrow="security"
      title="Boring where it counts."
      intro="This page describes the controls that are actually implemented, not aspirations. Where something is a limitation, it says so."
      sections={[
        {
          id: "isolation",
          heading: "Workspace isolation",
          body: (
            <>
              <p>
                Every table that holds customer data has row-level security enabled, with policies that
                check workspace membership on every read and write. The application never talks to the
                database as a superuser on behalf of a user: signed-in requests carry the user's own
                token, so the database itself enforces that one workspace cannot see another.
              </p>
              <p>
                Roles (owner, admin, member) live in a separate membership table, and platform-admin
                rights live in another; neither can be edited from a user's profile.
              </p>
            </>
          ),
        },
        {
          id: "secrets",
          heading: "Keys and secrets",
          body: (
            <>
              <p>
                Model, search, and database credentials exist only as server-side environment
                variables and are read inside server handlers. The browser receives a publishable
                database key and nothing else. There is no settings screen where a key can be pasted,
                viewed, or exported.
              </p>
              <p>
                Optional integrations (MCP tool servers) store their credentials encrypted at rest and
                use them only from the server when the agent calls a tool.
              </p>
            </>
          ),
        },
        {
          id: "authentication",
          heading: "Authentication",
          body: (
            <>
              <p>
                Sign-in is handled by our authentication provider: email and password (hashed with
                bcrypt, never visible to us), or Google. Password resets use single-use, expiring links
                sent to the account email. Changing a password requires the current one. Sessions are
                short-lived tokens refreshed automatically and stored in the browser's local storage.
              </p>
              <p>
                Multi-factor authentication is not offered yet; it is on the roadmap.
              </p>
            </>
          ),
        },
        {
          id: "agents",
          heading: "Agent safety",
          body: (
            <>
              <p>
                When an agent fetches a web page, the address is validated before every request and
                after every redirect: only public http(s) hosts on standard ports are allowed, and
                private, loopback, link-local and cloud-metadata ranges are refused. Fetches are
                time-limited and size-limited.
              </p>
              <p>
                Web search goes through a search provider's API or a search-capable model; the agents
                never scrape search engines and never answer "from memory" while claiming to have
                searched. When live search is unavailable the run fails visibly.
              </p>
              <p>
                System prompts instruct the model never to reveal instructions, keys, or internal
                identifiers, and tool outputs are treated as untrusted data. That instruction is a
                mitigation, not a guarantee: prompt injection from fetched pages is an open problem
                across the industry, which is why the agents can only read the web and write to your
                own workspace.
              </p>
            </>
          ),
        },
        {
          id: "abuse",
          heading: "Rate limits and quotas",
          body: (
            <p>
              Chat messages, research runs, content generation, sponsor clicks, contact forms and
              sponsor inquiries are all rate-limited on the server per workspace or per visitor.
              Monthly allowances are enforced before any model call is made. Public endpoints that a
              scheduler may call (the citation sweep) require a shared secret compared in constant
              time.
            </p>
          ),
        },
        {
          id: "audit",
          heading: "Audit log",
          body: (
            <p>
              Sensitive actions — completing a chat turn, finishing a research run, publishing a
              report, editing a sponsor, deleting an account — are appended to an audit log with the
              actor, workspace, time, IP address and browser string. The log cannot be edited or
              deleted through the application; workspace owners and admins can read their workspace's
              entries.
            </p>
          ),
        },
        {
          id: "hosting",
          heading: "Hosting and encryption",
          body: (
            <p>
              The application runs on an edge network with TLS everywhere. The database and file
              storage encrypt data at rest. Backups are managed by the database provider. We do not
              operate our own servers.
            </p>
          ),
        },
        {
          id: "disclosure",
          heading: "Reporting a vulnerability",
          body: (
            <p>
              Use the{" "}
              <Link to="/contact" className="underline underline-offset-4">
                contact form
              </Link>{" "}
              and choose "Security report". We acknowledge within two business days, keep you informed
              while we fix, and credit you if you want. Please test only against your own workspace
              and do not run automated scanners against the service.
            </p>
          ),
        },
      ]}
    />
  );
}
