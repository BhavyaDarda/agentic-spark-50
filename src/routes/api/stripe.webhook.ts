// Stripe webhook — the ONLY writer to `public.subscriptions`.
//
// Security:
//   * Uses raw request body for signature verification (Stripe requirement).
//   * Signing secret comes from STRIPE_WEBHOOK_SECRET (never exposed to client).
//   * Uses the service-role Supabase client so it can bypass RLS on `subscriptions`.
//   * Idempotency: event ids are recorded in `audit_log`; duplicate deliveries are
//     safe because we UPSERT on workspace_id.
//
// Setup:
//   1. Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET in server env.
//   2. Point Stripe → https://<host>/api/stripe/webhook.
//   3. Every Checkout Session MUST include `metadata: { workspace_id: '<uuid>' }`
//      OR a `client_reference_id` set to the workspace UUID.

import { createFileRoute } from "@tanstack/react-router";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { auditLog } from "@/lib/security.server";

function svc() {
  return createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function planFromPrice(priceId: string | null | undefined): "free" | "pro" | "team" {
  if (!priceId) return "free";
  if (priceId === process.env.STRIPE_PRICE_TEAM) return "team";
  if (priceId === process.env.STRIPE_PRICE_PRO) return "pro";
  return "free";
}

export const Route = createFileRoute("/api/stripe/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.STRIPE_SECRET_KEY;
        const whSecret = process.env.STRIPE_WEBHOOK_SECRET;
        if (!secret || !whSecret) {
          return new Response("stripe_not_configured", { status: 501 });
        }
        const stripe = new Stripe(secret, { apiVersion: "2025-09-30.clover" as never });

        const sig = request.headers.get("stripe-signature");
        if (!sig) return new Response("missing_signature", { status: 400 });
        const raw = await request.text();

        let event: Stripe.Event;
        try {
          event = await stripe.webhooks.constructEventAsync(raw, sig, whSecret);
        } catch (e) {
          const msg = e instanceof Error ? e.message : "invalid_signature";
          return new Response(`invalid_signature: ${msg}`, { status: 400 });
        }

        const sb = svc();

        const upsertFromSubscription = async (
          sub: Stripe.Subscription,
          workspaceIdHint?: string | null,
        ) => {
          const workspaceId =
            workspaceIdHint ??
            (sub.metadata?.workspace_id as string | undefined) ??
            null;
          if (!workspaceId) return;
          const priceId = sub.items.data[0]?.price?.id ?? null;
          await sb.from("subscriptions").upsert(
            {
              workspace_id: workspaceId,
              plan: planFromPrice(priceId),
              status: sub.status,
              stripe_customer_id:
                typeof sub.customer === "string" ? sub.customer : sub.customer?.id ?? null,
              stripe_subscription_id: sub.id,
              stripe_price_id: priceId,
              current_period_end: sub.items.data[0]?.current_period_end
                ? new Date(sub.items.data[0].current_period_end * 1000).toISOString()
                : null,
              cancel_at_period_end: sub.cancel_at_period_end ?? false,
              metadata: (sub.metadata as unknown) as never,
            },
            { onConflict: "workspace_id" },
          );
          // Mirror plan on workspaces for cheap client-side gating.
          await sb.from("workspaces").update({ plan: planFromPrice(priceId) }).eq("id", workspaceId);
        };

        try {
          switch (event.type) {
            case "checkout.session.completed": {
              const s = event.data.object as Stripe.Checkout.Session;
              const workspaceId =
                (s.metadata?.workspace_id as string | undefined) ??
                (s.client_reference_id ?? null);
              if (s.subscription && workspaceId) {
                const sub = await stripe.subscriptions.retrieve(
                  typeof s.subscription === "string" ? s.subscription : s.subscription.id,
                );
                await upsertFromSubscription(sub, workspaceId);
              }
              break;
            }
            case "customer.subscription.created":
            case "customer.subscription.updated":
            case "customer.subscription.deleted": {
              const sub = event.data.object as Stripe.Subscription;
              await upsertFromSubscription(sub);
              break;
            }
            default:
              // ignore unrelated events
              break;
          }

          await auditLog({
            workspaceId: null,
            actorId: null,
            event: `stripe.${event.type}`,
            targetTable: "subscriptions",
            targetId: event.id,
            metadata: { livemode: event.livemode },
          });

          return new Response("ok", { status: 200 });
        } catch (e) {
          const msg = e instanceof Error ? e.message : "webhook_failed";
          console.error("[stripe webhook]", msg);
          return new Response(msg, { status: 500 });
        }
      },
    },
  },
});
