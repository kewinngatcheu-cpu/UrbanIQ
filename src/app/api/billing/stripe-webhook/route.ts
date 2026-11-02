import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/config/env";
import { verifyWebhook, getStripe } from "@/lib/billing/stripe";
import { claimBillingEvent, completeStripeCheckout, syncStripeSubscription, type StripeLikeSubscription } from "@/lib/billing";

/**
 * Stripe webhook. Configure in the Stripe dashboard with these events:
 *   checkout.session.completed, customer.subscription.created,
 *   customer.subscription.updated, customer.subscription.deleted
 * Only signature-verified events can change a plan. Processing is idempotent.
 */
export async function POST(req: NextRequest) {
  if (env.billingMode !== "stripe") return NextResponse.json({ error: "Stripe billing is disabled" }, { status: 404 });
  const raw = await req.text();
  let event;
  try {
    event = verifyWebhook(raw, req.headers.get("stripe-signature"));
  } catch (e) {
    console.warn("[stripe-webhook] rejected:", (e as Error).message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (!(await claimBillingEvent(event.id, event.type))) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as unknown as { id: string; metadata?: Record<string, string> | null; customer?: string | null; subscription?: string | { id: string } | null };
        await completeStripeCheckout(session);
        const subId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
        if (subId && env.stripeSecretKey) {
          const sub = await getStripe().subscriptions.retrieve(subId);
          await syncStripeSubscription(sub as unknown as StripeLikeSubscription);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await syncStripeSubscription(event.data.object as unknown as StripeLikeSubscription);
        break;
      default:
        break; // acknowledged but not needed
    }
  } catch (e) {
    console.error("[stripe-webhook] processing failed", event.type, e);
    // 500 → Stripe retries. Release the idempotency claim so the retry is processed.
    const { systemDb } = await import("@/lib/db");
    await systemDb().remove("billing_events", { id: event.id });
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
