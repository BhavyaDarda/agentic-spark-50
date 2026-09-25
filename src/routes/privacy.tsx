import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalPage, legalHead } from "@/components/legal-page";
import { SITE } from "@/lib/site";

export const Route = createFileRoute("/privacy")({
  staticData: { sitemap: true },
  head: () =>
    legalHead(
      "Privacy policy",
      "What Marketing Agent collects, why, who processes it, how long it is kept, and how to access or delete it. No tracking cookies, no ad pixels.",
      "/privacy",
    ),
  component: PrivacyPage,
});

function PrivacyPage() {
  const operator = SITE.legalEntity || SITE.operator;
  return (
    <LegalPage
      eyebrow="legal"
      title="Privacy policy"
      intro={`${operator} operates ${SITE.name}. This policy explains, in plain terms, what personal data the service handles and what your rights are. We do not sell personal data, we run no advertising trackers, and sponsors never receive anything about you.`}
      sections={[
        {
          id: "what-we-collect",
          heading: "What we collect",
          body: (
            <>
              <p>
                <strong>Account data.</strong> Your email address, the name and profile picture your
                sign-in provider shares (for Google sign-in), and a hashed password if you use one.
                Passwords are hashed by our authentication provider; we never see them.
              </p>
              <p>
                <strong>Workspace content.</strong> Brands, prompts and chat messages, documents and
                web pages you add to Brand Memory (including the numeric embeddings we derive from
                them for search), campaigns, generated content, research projects, runs, sources, and
                library items. Web pages fetched by the research agents are stored in your workspace
                so later runs can reuse them.
              </p>
              <p>
                <strong>Usage records.</strong> Counts of runs and tokens per workspace per month,
                which enforce fair-use allowances and are shown to you in Settings.
              </p>
              <p>
                <strong>Security audit log.</strong> For sign-in and mutating actions (running the
                agents, publishing a report, changing sponsors) we record the acting user, the
                workspace, the action, a timestamp, and the request's IP address and browser string.
                Only workspace owners and admins can read their workspace's audit entries.
              </p>
              <p>
                <strong>Sponsor statistics.</strong> When a sponsor card is shown or clicked on a
                public report we store the sponsor, the page, the time, and a one-way daily hash of
                the visitor's IP address and browser string. The hash cannot be reversed and changes
                every day; it exists only to count each browser once per day and to exclude crawlers.
                No IP address or browser string is stored with sponsor events.
              </p>
              <p>
                <strong>Messages you send us.</strong> Contact-form and sponsor-inquiry submissions,
                with the same daily visitor hash to limit abuse.
              </p>
            </>
          ),
        },
        {
          id: "why",
          heading: "Why we process it and on what basis",
          body: (
            <ul className="list-disc space-y-2 pl-5">
              <li>
                To provide the service you asked for: running the agents, storing your workspace,
                publishing reports you choose to publish (performance of a contract).
              </li>
              <li>
                To keep the service secure and fair: rate limits, abuse prevention, the audit log
                (our legitimate interest in protecting the service and other users).
              </li>
              <li>
                To fund the service: counting sponsor impressions and clicks in aggregate (legitimate
                interest; the daily hash is the least data that still gives sponsors honest numbers).
              </li>
              <li>To answer you when you contact us (legitimate interest and, where relevant, legal obligation).</li>
            </ul>
          ),
        },
        {
          id: "ai",
          heading: "How AI processing works",
          body: (
            <>
              <p>
                Prompts, relevant brand-memory passages, and fetched web pages are sent to language
                model providers through the Lovable AI gateway to generate your output. Live web
                searches are sent to a search provider. We do not use your content to train any model.
                Providers process requests under their own data-processing terms, which we link from
                the{" "}
                <Link to="/credits" className="underline underline-offset-4">
                  credits page
                </Link>
                .
              </p>
              <p>
                No API keys, model settings, or provider credentials are ever exposed to your browser;
                every provider call is made from our servers.
              </p>
            </>
          ),
        },
        {
          id: "sharing",
          heading: "Who we share data with",
          body: (
            <>
              <p>We use these sub-processors to run the service. None of them receives data for advertising.</p>
              <table className="w-full border-[3px] border-border text-sm">
                <thead>
                  <tr className="bg-secondary text-left">
                    <th scope="col" className="border-b-[3px] border-border p-2">Provider</th>
                    <th scope="col" className="border-b-[3px] border-border p-2">Purpose</th>
                    <th scope="col" className="border-b-[3px] border-border p-2">Region</th>
                  </tr>
                </thead>
                <tbody>
                  {SITE.subprocessors.map((s) => (
                    <tr key={s.name} className="border-t-[2px] border-border align-top">
                      <td className="p-2 font-medium">{s.name}</td>
                      <td className="p-2">{s.purpose}</td>
                      <td className="p-2">{s.region}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p>
                Workspace members you invite can see workspace content. Anyone can read a report you
                choose to publish. We disclose data to authorities only when legally required.
              </p>
            </>
          ),
        },
        {
          id: "cookies",
          heading: "Cookies and local storage",
          body: (
            <>
              <p>
                We set no advertising or analytics cookies and load no third-party trackers. To keep
                you signed in, your session token is kept in your browser's local storage by our
                authentication library and sent only to our own backend. Clearing site data signs you
                out.
              </p>
              <p>Public report pages and this website work without any cookies at all.</p>
            </>
          ),
        },
        {
          id: "retention",
          heading: "How long we keep data",
          body: (
            <>
              <p>
                Workspace content is kept until you delete it or delete the workspace. Deleting your
                account removes your profile immediately and deletes every workspace in which you were
                the only member, together with its content, usage records, and audit entries. In
                shared workspaces your authored conversations and library items are removed and your
                identifier is detached from remaining records.
              </p>
              <p>
                Audit entries that are not tied to a workspace (for example platform-admin actions)
                keep the action but lose the user reference when that account is deleted. Sponsor
                statistics contain no personal data and are kept for reporting. Contact-form messages
                are kept until they are dealt with and closed.
              </p>
            </>
          ),
        },
        {
          id: "rights",
          heading: "Your rights",
          body: (
            <>
              <p>
                Depending on where you live (including under the GDPR and UK GDPR) you may have the
                right to access, correct, delete, restrict, or port your personal data, and to object
                to processing based on legitimate interest.
              </p>
              <ul className="list-disc space-y-2 pl-5">
                <li>Change your password or delete your account yourself under Settings → Account.</li>
                <li>Delete individual documents, conversations, projects, and library items inside the app.</li>
                <li>
                  For a copy of your data or any other request,{" "}
                  <Link to="/contact" className="underline underline-offset-4">
                    contact us
                  </Link>{" "}
                  and choose "Privacy". We respond within 30 days.
                </li>
              </ul>
              <p>You also have the right to complain to your local data-protection authority.</p>
            </>
          ),
        },
        {
          id: "security",
          heading: "Security",
          body: (
            <p>
              Data is encrypted in transit and at rest by our hosting provider. Every database table
              is protected by row-level security so workspaces cannot read one another's data, and all
              provider credentials stay on the server. Details are on the{" "}
              <Link to="/security" className="underline underline-offset-4">
                security page
              </Link>
              .
            </p>
          ),
        },
        {
          id: "children",
          heading: "Children",
          body: <p>The service is not directed at children and we do not knowingly accept users under 16.</p>,
        },
        {
          id: "changes",
          heading: "Changes and contact",
          body: (
            <p>
              We will announce material changes inside the application and update the date at the top
              of this page.{" "}
              {SITE.legalAddress
                ? `The data controller is ${operator}, ${SITE.legalAddress}.`
                : `The data controller is ${operator}.`}{" "}
              Reach us through the{" "}
              <Link to="/contact" className="underline underline-offset-4">
                contact form
              </Link>
              .
            </p>
          ),
        },
      ]}
    />
  );
}
