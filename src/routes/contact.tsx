import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { LegalPage, legalHead } from "@/components/legal-page";
import { submitContactMessage, CONTACT_KINDS, type ContactKind } from "@/lib/contact.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Loader2 } from "lucide-react";

export const Route = createFileRoute("/contact")({
  staticData: { sitemap: true },
  head: () =>
    legalHead(
      "Contact",
      "Reach the Marketing Agent team for support, privacy requests, security reports, legal notices, or press.",
      "/contact",
    ),
  component: ContactPage,
});

const KIND_LABELS: Record<ContactKind, string> = {
  support: "Support",
  security: "Security report",
  privacy: "Privacy request",
  legal: "Legal notice",
  press: "Press",
  other: "Something else",
};

function ContactForm() {
  const submit = useServerFn(submitContactMessage);
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);
  const [kind, setKind] = useState<ContactKind>("support");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setError(null);
    setState("sending");
    try {
      await submit({
        data: {
          name: String(fd.get("name") ?? ""),
          email: String(fd.get("email") ?? ""),
          kind,
          subject: String(fd.get("subject") ?? ""),
          message: String(fd.get("message") ?? ""),
          website: String(fd.get("website") ?? ""),
        },
      });
      setState("sent");
      form.reset();
    } catch (err) {
      setState("idle");
      setError(err instanceof Error ? err.message : "Could not send your message.");
    }
  }

  if (state === "sent") {
    return (
      <div role="status" className="brut flex items-start gap-3 bg-card p-5">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary-dark" aria-hidden="true" />
        <div>
          <p className="font-display text-base font-black uppercase">Message received</p>
          <p className="mt-1 text-sm">
            It is in our queue. Replies go to the email address you gave; privacy requests are answered
            within 30 days, security reports as soon as we have triaged them.
          </p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => setState("idle")}>
            Send another
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="brut grid gap-5 bg-card p-5 sm:p-6" noValidate={false}>
      <fieldset className="grid gap-2">
        <legend className="font-mono text-[11px] font-bold uppercase tracking-[0.2em]">
          What is this about?
        </legend>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Message type">
          {CONTACT_KINDS.map((k) => (
            <label
              key={k}
              className={`brut-sm cursor-pointer px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-widest ${
                kind === k ? "bg-primary text-primary-foreground" : "bg-background"
              }`}
            >
              <input
                type="radio"
                name="kind"
                value={k}
                checked={kind === k}
                onChange={() => setKind(k)}
                className="sr-only"
              />
              {KIND_LABELS[k]}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="contact-name">Your name</Label>
          <Input id="contact-name" name="name" required minLength={2} maxLength={120} autoComplete="name" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="contact-email">Email for the reply</Label>
          <Input id="contact-email" name="email" type="email" required maxLength={255} autoComplete="email" />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="contact-subject">Subject</Label>
        <Input id="contact-subject" name="subject" required minLength={3} maxLength={160} />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="contact-message">Message</Label>
        <Textarea
          id="contact-message"
          name="message"
          required
          minLength={20}
          maxLength={4000}
          rows={6}
          aria-describedby="contact-message-help"
        />
        <p id="contact-message-help" className="text-xs text-muted-foreground">
          At least 20 characters. For security reports include steps to reproduce; for takedowns
          include the page address.
        </p>
      </div>

      {/* Honeypot: hidden from people, tempting for bots. */}
      <div className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
        <label htmlFor="contact-website">Website</label>
        <input id="contact-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      {error && (
        <p role="alert" className="border-[3px] border-destructive bg-background px-3 py-2 text-sm font-medium text-destructive">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between gap-4">
        <p className="text-xs text-muted-foreground">
          Stored on our servers only. Never shared with sponsors or anyone else.
        </p>
        <Button type="submit" disabled={state === "sending"}>
          {state === "sending" && <Loader2 className="mr-1 h-4 w-4 animate-spin" aria-hidden="true" />}
          Send message
        </Button>
      </div>
    </form>
  );
}

function ContactPage() {
  return (
    <LegalPage
      eyebrow="contact"
      title="Talk to a person."
      intro="One form, routed by topic. There is no chatbot on the other end of this page. Support, privacy, legal and press messages are read by the operating team; security reports are triaged first."
      sections={[
        {
          id: "form",
          heading: "Send a message",
          body: <ContactForm />,
        },
        {
          id: "security-disclosure",
          heading: "Reporting a security issue",
          body: (
            <>
              <p>
                Choose "Security report" above. Tell us what you found, how to reproduce it, and how
                to reach you. Please do not access other people's data beyond what is needed to
                demonstrate the issue, do not run automated scanners against the service, and give us
                a reasonable time to fix it before publishing.
              </p>
              <p>
                We do not pursue people who report in good faith under these rules, and we credit
                reporters on request once a fix ships.
              </p>
            </>
          ),
        },
        {
          id: "response-times",
          heading: "What to expect",
          body: (
            <ul className="list-disc space-y-2 pl-5">
              <li>Security reports: acknowledged within two business days.</li>
              <li>Privacy requests: answered within 30 days, usually much sooner.</li>
              <li>Support and other messages: normally within three business days.</li>
              <li>Sponsorship questions: use the dedicated form on the advertise page.</li>
            </ul>
          ),
        },
      ]}
    />
  );
}
