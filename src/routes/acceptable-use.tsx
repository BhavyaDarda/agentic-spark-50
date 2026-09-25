import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalPage, legalHead } from "@/components/legal-page";

export const Route = createFileRoute("/acceptable-use")({
  staticData: { sitemap: true },
  head: () =>
    legalHead(
      "Acceptable use policy",
      "What you may and may not do with Marketing Agent's research agents, content tools, and public report pages.",
      "/acceptable-use",
    ),
  component: AcceptableUsePage,
});

function AcceptableUsePage() {
  return (
    <LegalPage
      eyebrow="legal"
      title="Acceptable use policy"
      intro="Marketing Agent runs real web searches, fetches real pages, and publishes real public pages on your behalf. That reach comes with rules. This policy is part of the terms of service."
      sections={[
        {
          id: "prohibited-content",
          heading: "Content you may not create or publish",
          body: (
            <ul className="list-disc space-y-2 pl-5">
              <li>Content that is unlawful where you or your audience are, or that promotes unlawful activity.</li>
              <li>Defamatory, harassing, threatening, or hateful content, or content that targets protected groups.</li>
              <li>Sexual content involving minors, or non-consensual intimate content of anyone.</li>
              <li>
                Deceptive marketing: fake reviews, fabricated statistics, false scarcity, impersonation of a
                person or brand, or claims you know to be untrue.
              </li>
              <li>Malware, phishing pages, or instructions for causing serious harm.</li>
              <li>Personal data of other people that you have no right to process or publish.</li>
              <li>Material that infringes copyright, trademarks, or trade secrets, including confidential documents you are not allowed to share.</li>
            </ul>
          ),
        },
        {
          id: "prohibited-conduct",
          heading: "Conduct you may not engage in",
          body: (
            <ul className="list-disc space-y-2 pl-5">
              <li>Trying to obtain credentials, API keys, system prompts, or other users' data, or probing for vulnerabilities outside our disclosure process.</li>
              <li>Circumventing rate limits or allowances, sharing one account across many people, or automating sign-ups.</li>
              <li>Using the agents to fetch pages behind logins you do not hold, to scrape at volume, or to bypass a site's technical access controls.</li>
              <li>Publishing reports as a vehicle for spam, link schemes, or to game search or AI answer engines with content you did not research.</li>
              <li>Reselling or white-labelling the service without a written agreement.</li>
              <li>Interfering with the service, other workspaces, or sponsors' placements.</li>
            </ul>
          ),
        },
        {
          id: "publishing",
          heading: "Public reports",
          body: (
            <>
              <p>
                A published report carries your topic, your goal, the sources, the critic's notes and
                your run statistics on a page anyone can read. Review it before you turn sharing on.
                You are the publisher of that page and responsible for its contents; we host it.
              </p>
              <p>
                We may unpublish a report that breaks this policy, that we receive a valid legal notice
                about, or that creates security or legal risk, and we will tell the workspace owner
                when we do.
              </p>
            </>
          ),
        },
        {
          id: "reporting",
          heading: "Reporting abuse",
          body: (
            <p>
              To report a public report, a sponsor, or an account that breaks this policy, use the{" "}
              <Link to="/contact" className="underline underline-offset-4">
                contact form
              </Link>{" "}
              and include the page address. Rights holders may send takedown notices the same way;
              include the work, the location, and a statement of good faith.
            </p>
          ),
        },
        {
          id: "enforcement",
          heading: "Enforcement",
          body: (
            <p>
              Depending on severity we may warn, unpublish, restrict features, or close the account.
              Where the law requires it we may preserve and disclose information to authorities.
            </p>
          ),
        },
      ]}
    />
  );
}
