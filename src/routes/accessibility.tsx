import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalPage, legalHead } from "@/components/legal-page";

export const Route = createFileRoute("/accessibility")({
  staticData: { sitemap: true },
  head: () =>
    legalHead(
      "Accessibility statement",
      "How Marketing Agent supports keyboard, screen-reader and reduced-motion users, what still falls short, and how to tell us.",
      "/accessibility",
    ),
  component: AccessibilityPage,
});

function AccessibilityPage() {
  return (
    <LegalPage
      eyebrow="accessibility"
      title="Accessibility statement"
      intro="We want Marketing Agent to work for people who use keyboards, screen readers, magnification, or who need less motion. Our target is WCAG 2.2 level AA. This page says what is in place, what we know is not there yet, and how to reach us."
      sections={[
        {
          id: "measures",
          heading: "What is in place",
          body: (
            <ul className="list-disc space-y-2 pl-5">
              <li>A "Skip to content" link is the first focusable element on every page.</li>
              <li>Every page has one main landmark, a page title that describes it, and headings in order.</li>
              <li>All interactive elements are reachable and operable with a keyboard, and focus is always visible as a thick high-contrast outline.</li>
              <li>Colour is never the only way information is conveyed; every status has a text label.</li>
              <li>Text and interface contrast meets the AA ratio on every colour pairing in the design system.</li>
              <li>Forms have visible labels, described error messages, and errors are announced to assistive technology.</li>
              <li>Animations, including the marquee and the mechanical press effect on buttons, are disabled when your system asks for reduced motion.</li>
              <li>The demo video on the home page is silent and its content is described in text next to it.</li>
              <li>Long-running agent work streams into a live region so screen readers hear progress without being interrupted on every token.</li>
            </ul>
          ),
        },
        {
          id: "limitations",
          heading: "Known limitations",
          body: (
            <ul className="list-disc space-y-2 pl-5">
              <li>Reports are rendered from Markdown the agents wrote; tables in reports may lack header cells and long reports have no in-page navigation yet.</li>
              <li>Logos supplied by sponsors are described only by the sponsor's name.</li>
              <li>Web pages the agents cite are third-party sites whose accessibility we do not control.</li>
              <li>Browser-native date pickers and file pickers depend on your browser's own accessibility.</li>
            </ul>
          ),
        },
        {
          id: "testing",
          heading: "How we test",
          body: (
            <p>
              Each release is walked through with keyboard only, with a screen reader on the sign-in,
              chat, research and public report flows, at 200% zoom, and with reduced motion enabled.
              Automated checks run on contrast and landmark structure. Problems found are fixed
              before publishing.
            </p>
          ),
        },
        {
          id: "feedback",
          heading: "Tell us what is broken",
          body: (
            <p>
              If something does not work for you, use the{" "}
              <Link to="/contact" className="underline underline-offset-4">
                contact form
              </Link>{" "}
              and choose "Support". Say which page, what you tried, and what assistive technology or
              browser you use. We answer within three business days and treat blocking issues as bugs.
            </p>
          ),
        },
      ]}
    />
  );
}
