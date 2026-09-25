import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { LegalPage, legalHead } from "@/components/legal-page";
import { submitSponsorInquiry } from "@/lib/sponsors.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Loader2 } from "lucide-react";

export const Route = createFileRoute("/advertise")({
  staticData: { sitemap: true },
  head: () =>
    legalHead(
      "Advertise on research reports",
      "Sponsor citable, public research reports. One labelled card per page, matched by topic, with honest deduplicated counts. Full sponsor disclosure.",
      "/advertise",
    ),
  component: AdvertisePage,
});

const BUDGETS = [
  ["under_1k", "Under $1,000 / month"],
  ["1k_5k", "$1,000 – $5,000 / month"],
  ["5k_20k", "$5,000 – $20,000 / month"],
  ["20k_plus", "$20,000+ / month"],
  ["undecided", "Not decided yet"],
] as const;

type Budget = (typeof BUDGETS)[number][0];

function InquiryForm() {
  const submit = useServerFn(submitSponsorInquiry);
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);
  const [budget, setBudget] = useState<Budget>("undecided");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setError(null);
    setState("sending");
    try {
      const topics = String(fd.get("topics") ?? "")
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length >= 2)
        .slice(0, 15);
      await submit({
        data: {
          company: String(fd.get("company") ?? ""),
          contactName: String(fd.get("contactName") ?? ""),
          email: String(fd.get("email") ?? ""),
          website: String(fd.get("website") ?? ""),
          budgetRange: budget,
          topics,
          message: String(fd.get("message") ?? ""),
          company_url_confirm: String(fd.get("company_url_confirm") ?? ""),
        },
      });
      setState("sent");
      form.reset();
    } catch (err) {
      setState("idle");
      setError(err instanceof Error ? err.message : "Could not send your inquiry.");
    }
  }

  if (state === "sent") {
    return (
      <div role="status" className="brut flex items-start gap-3 bg-card p-5">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary-dark" aria-hidden="true" />
        <div>
          <p className="font-display text-base font-black uppercase">Inquiry received</p>
          <p className="mt-1 text-sm">
            We reply from a person, with current reach numbers for your topics and a rate card.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="brut grid gap-5 bg-card p-5 sm:p-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="inq-company">Company</Label>
          <Input id="inq-company" name="company" required minLength={2} maxLength={120} autoComplete="organization" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="inq-website">Website</Label>
          <Input id="inq-website" name="website" type="url" placeholder="https://" maxLength={300} autoComplete="url" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="inq-name">Your name</Label>
          <Input id="inq-name" name="contactName" required minLength={2} maxLength={120} autoComplete="name" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="inq-email">Work email</Label>
          <Input id="inq-email" name="email" type="email" required maxLength={255} autoComplete="email" />
        </div>
      </div>

      <fieldset className="grid gap-2">
        <legend className="font-mono text-[11px] font-bold uppercase tracking-[0.2em]">Monthly budget</legend>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Monthly budget">
          {BUDGETS.map(([value, label]) => (
            <label
              key={value}
              className={`brut-sm cursor-pointer px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-widest ${
                budget === value ? "bg-primary text-primary-foreground" : "bg-background"
              }`}
            >
              <input
                type="radio"
                name="budgetRange"
                value={value}
                checked={budget === value}
                onChange={() => setBudget(value)}
                className="sr-only"
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-2">
        <Label htmlFor="inq-topics">Topics you want to appear beside</Label>
        <Input
          id="inq-topics"
          name="topics"
          placeholder="email deliverability, SEO tooling, B2B SaaS pricing"
          maxLength={600}
          aria-describedby="inq-topics-help"
        />
        <p id="inq-topics-help" className="text-xs text-muted-foreground">
          Comma-separated. Matching is by topic keywords in the report, never by reader.
        </p>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="inq-message">Anything else</Label>
        <Textarea id="inq-message" name="message" required minLength={20} maxLength={2000} rows={5} />
      </div>

      <div className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
        <label htmlFor="inq-confirm">Confirm URL</label>
        <input id="inq-confirm" name="company_url_confirm" tabIndex={-1} autoComplete="off" />
      </div>

      {error && (
        <p role="alert" className="border-[3px] border-destructive bg-background px-3 py-2 text-sm font-medium text-destructive">
          {error}
        </p>
      )}

      <div className="flex items-center justify-end">
        <Button type="submit" disabled={state === "sending"}>
          {state === "sending" && <Loader2 className="mr-1 h-4 w-4 animate-spin" aria-hidden="true" />}
          Request the rate card
        </Button>
      </div>
    </form>
  );
}

function AdvertisePage() {
  return (
    <LegalPage
      eyebrow="sponsors"
      title="Put your name beside research people actually cite."
      intro="Marketing Agent is free for the teams who use it. Sponsors fund that by taking the one labelled card on public research reports: pages with real sources, a critic score, and the cost of the run printed on them. This page is both the pitch and the full disclosure."
      sections={[
        {
          id: "placement",
          heading: "What a placement is",
          body: (
            <>
              <p>
                Exactly one sponsor card per public report page, placed beside the source list and the
                trust panel. It carries your name, a one-line tagline, up to 400 characters of body
                copy, an optional logo, and a button with your call to action. Above it, in our type,
                a label reads "sponsor" and "did not touch the findings".
              </p>
              <p>
                Beneath the card runs a credit line in our editorial voice ("Sources checked by
                machines with no opinions. Bill footed by …"). You can supply your own credit lines or
                use ours.
              </p>
              <p>
                Cards never appear inside a report, inside the signed-in workspace, or in email.
              </p>
            </>
          ),
        },
        {
          id: "matching",
          heading: "How sponsors are matched",
          body: (
            <>
              <p>
                Each sponsor lists topic keywords. When a public report loads, every live sponsor is
                scored by how many of its keywords appear in the report's topic and goal. The best
                scoring tier wins; inside that tier, sponsors rotate in proportion to their weight.
                Sponsors with no keywords are eligible everywhere at the lowest priority.
              </p>
              <p>
                That is the whole algorithm. There is no reader profiling, no behavioural targeting,
                no third-party data, and no bidding on individual pages.
              </p>
            </>
          ),
        },
        {
          id: "sponsored-runs",
          heading: "Sponsored research runs",
          body: (
            <p>
              Before a research run, a workspace user may be offered a sponsored run: your placement
              pays for the project to be upgraded to the deepest research setting (seven search angles,
              more pages read in full). The user decides. If they accept and later publish the report,
              your card is the one shown on it. Sponsors never learn who ran what.
            </p>
          ),
        },
        {
          id: "measurement",
          heading: "What you receive, and how it is counted",
          body: (
            <>
              <p>
                Aggregate impressions and clicks per sponsor. An impression is recorded when a public
                report page is rendered with your card; a click when a reader uses your button. Both
                are deduplicated so one browser counts once per day, and requests from crawlers, link
                previewers and command-line clients are excluded before counting. Clicks are routed
                through our server, so your destination receives an ordinary visit with no reader data
                attached.
              </p>
              <p>
                You never receive IP addresses, user identities, report contents that are not already
                public, or any information about workspace users.
              </p>
            </>
          ),
        },
        {
          id: "disclosure",
          heading: "Editorial independence (sponsor disclosure)",
          body: (
            <>
              <p>
                Sponsors do not see reports before publication and cannot request changes to sources,
                wording, scores, or conclusions. Reports are generated by the research agents from
                live web sources and the workspace's own material; the sponsor selection happens only
                when a reader loads the finished, public page, after the report is final.
              </p>
              <p>
                We decline sponsors whose products or messaging would breach our{" "}
                <Link to="/acceptable-use" className="underline underline-offset-4">
                  acceptable use policy
                </Link>
                , and we do not accept sponsorship for political advertising, gambling, tobacco, or
                weapons.
              </p>
              <p>
                Placements are reviewed and switched on by a platform administrator. Every change to a
                sponsor is written to our audit log.
              </p>
            </>
          ),
        },
        {
          id: "inquire",
          heading: "Request the rate card",
          body: <InquiryForm />,
        },
      ]}
    />
  );
}
