import "server-only";
import Stripe from "stripe";
import { env } from "@/lib/config/env";
import type { PlanId } from "@/lib/config/plans";

let client: Stripe | null = null;

export function getStripe(): Stripe {
  if (!env.stripeSecretKey) throw new Error("STRIPE_SECRET_KEY is not configured.");
  client ??= new Stripe(env.stripeSecretKey, { appInfo: { name: "ONE" }, maxNetworkRetries: 2 });
  return client;
}

/** Stripe price id for a plan: env STRIPE_PRICE_<PLAN_ID> (e.g. STRIPE_PRICE_PREMIUM, STRIPE_PRICE_GROWTH). */
export function priceIdFor(plan: PlanId): string {
  const key = `STRIPE_PRICE_${plan.toUpperCase().replace(/[^A-Z0-9]/g, "_")}`;
  const id = process.env[key]?.trim();
  if (!id) throw new Error(`${key} is not configured.`);
  return id;
}

/** Reverse lookup used by the webhook. */
export function planIdForPrice(priceId: string): PlanId | null {
  for (const [k, v] of Object.entries(process.env)) {
    if (k.startsWith("STRIPE_PRICE_") && v?.trim() === priceId) return k.slice("STRIPE_PRICE_".length).toLowerCase();
  }
  return null;
}

/** Verifies the Stripe-Signature header against the raw body. Throws on mismatch. */
export function verifyWebhook(rawBody: string, signature: string | null): Stripe.Event {
  if (!env.stripeWebhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET is not configured.");
  if (!signature) throw new Error("Missing Stripe-Signature header.");
  // constructEvent is local (HMAC) — no API call; the client only needs a key to exist.
  const s = client ?? new Stripe(env.stripeSecretKey ?? "sk_unused");
  return s.webhooks.constructEvent(rawBody, signature, env.stripeWebhookSecret);
}

export function stripeConfigured() {
  return !!(env.stripeSecretKey && env.stripeWebhookSecret && env.stripePricePremium && env.stripePriceExclusive);
}
