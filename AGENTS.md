<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Public report evidence
- Build evidence-map links only from explicit saved report citations; expose search strings but never private documents or inferred query-to-source relationships, so public evidence remains auditable without leaking workspace material.

## Output publishing
- Export saved outputs through authenticated server functions using the caller's RLS-scoped reads; never export prompts, agent traces, or workspace records as ancillary payload fields.
- Webhook exports accept only HTTPS Zapier, Make, and Webhook.site receivers and refuse redirects; arbitrary hosts require DNS-pinned egress before being supported.
- Webhook URLs and optional signing secrets are request-only and must not be persisted or logged; delivery audit entries store only the host, receipt ID, and outcome.
- Webhook delivery is synchronous without automatic retries; receiver acceptance must not be presented as confirmed downstream publication.
