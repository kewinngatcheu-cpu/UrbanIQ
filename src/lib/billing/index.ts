import "server-only";
import { env } from "@/lib/config/env";
import { systemDb } from "@/lib/db";
import { PLANS, isPlanId, type PlanId } from "@/lib/config/plans";
import type { BillingCheckout, Profile, Subscription } from "@/lib/db/types";
import { audit } from "@/lib/audit";
import { getStripe, priceIdFor } from "./stripe";

/**
 * Billing service.
 *
 * A paid plan is ONLY activated by `activatePlan()`, reachable through:
 *  - `confirmDemoCheckout()` — demo mode, explicit confirmation of a pending server-side checkout
 *  - the Stripe webhook (`/api/billing/stripe-webhook`, signature-verified) — stripe mode
 *  - an owner admin grant (audited)
 * The client can never set a plan directly, and a Stripe redirect alone never activates anything.
 */
export class BillingError extends Error {}

export interface CheckoutStart {
  checkout: BillingCheckout;
  /** Where to send the browser: demo checkout page, or the hosted Stripe Checkout URL. */
  url: string;
}

export async function createCheckout(user: Profile, plan: PlanId): Promise<CheckoutStart> {
  if (plan === "free") throw new BillingError("The Free plan needs no checkout.");
  const db = systemDb();
  await db.update("billing_checkouts", { user_id: user.id, status: "pending" }, { status: "canceled" });

  if (env.billingMode === "stripe") {
    const stripe = getStripe();
    const price = priceIdFor(plan);
    const sub = await db.selectOne("subscriptions", { user_id: user.id });
    if (sub?.provider === "stripe" && sub.provider_ref && sub.plan !== "free") {
      throw new BillingError("You already have an active subscription. Use “Manage billing” to change it.");
    }
    const checkout = await db.insert("billing_checkouts", {
      user_id: user.id, plan, provider: "stripe", status: "pending",
      amount_eur: PLANS[plan].priceMonthlyEur,
      expires_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(), // Stripe sessions live 24h
      confirmed_at: null,
    });
    const meta = { user_id: user.id, plan, checkout_id: checkout.id };
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price, quantity: 1 }],
      client_reference_id: user.id,
      ...(sub?.stripe_customer_id ? { customer: sub.stripe_customer_id } : { customer_email: user.email }),
      metadata: meta,
      subscription_data: { metadata: meta },
      allow_promotion_codes: true,
      success_url: `${env.appUrl}/checkout/${checkout.id}?status=success`,
      cancel_url: `${env.appUrl}/app/settings/billing?checkout=canceled`,
    });
    if (!session.url) throw new BillingError("Stripe did not return a checkout URL.");
    await audit(user.id, "billing.checkout_created", { type: "checkout", id: checkout.id }, { plan, provider: "stripe", session: session.id });
    return { checkout, url: session.url };
  }

  const checkout = await db.insert("billing_checkouts", {
    user_id: user.id,
    plan,
    provider: "demo",
    status: "pending",
    amount_eur: PLANS[plan].priceMonthlyEur,
    expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    confirmed_at: null,
  });
  await audit(user.id, "billing.checkout_created", { type: "checkout", id: checkout.id }, { plan, provider: "demo" });
  return { checkout, url: `/checkout/${checkout.id}` };
}

export async function getCheckout(user: Profile, id: string) {
  return systemDb().selectOne("billing_checkouts", { id, user_id: user.id });
}

/** Demo mode: the server validates the pending checkout before activating anything. */
export async function confirmDemoCheckout(user: Profile, checkoutId: string) {
  if (env.billingMode !== "demo") throw new BillingError("Demo payments are disabled.");
  const db = systemDb();
  const co = await db.selectOne("billing_checkouts", { id: checkoutId, user_id: user.id });
  if (!co || co.provider !== "demo") throw new BillingError("Checkout not found.");
  if (co.status !== "pending") throw new BillingError("This checkout is no longer open.");
  if (Date.parse(co.expires_at) < Date.now()) {
    await db.update("billing_checkouts", { id: co.id }, { status: "expired" });
    throw new BillingError("This checkout has expired. Please start again.");
  }
  await db.update("billing_checkouts", { id: co.id }, { status: "paid", confirmed_at: new Date().toISOString() });
  await activatePlan(user.id, co.plan, "demo", co.id, user.id);
}

export async function activatePlan(
  userId: string,
  plan: PlanId,
  provider: Subscription["provider"],
  ref: string | null,
  actorId: string | null,
  extra: { stripeCustomerId?: string | null; periodEnd?: string | null; cancelAtPeriodEnd?: boolean } = {},
) {
  const db = systemDb();
  const periodEnd = plan === "free" ? null : (extra.periodEnd ?? new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString());
  const sub = await db.selectOne("subscriptions", { user_id: userId });
  const patch = {
    plan,
    status: "active" as const,
    provider,
    provider_ref: ref,
    stripe_customer_id: extra.stripeCustomerId ?? sub?.stripe_customer_id ?? null,
    cancel_at_period_end: extra.cancelAtPeriodEnd ?? false,
    price_monthly_eur: provider === "admin_grant" || plan === "free" ? 0 : PLANS[plan].priceMonthlyEur,
    current_period_end: periodEnd,
    canceled_at: null,
  };
  if (sub) await db.update("subscriptions", { user_id: userId }, patch);
  else await db.insert("subscriptions", { user_id: userId, ...patch });
  await db.update("profiles", { id: userId }, { plan });
  if (sub?.plan !== plan || sub?.provider !== provider) {
    await audit(actorId, "subscription.plan_changed", { type: "user", id: userId }, { plan, provider, previous: sub?.plan ?? null });
  }
}

/** Ends a paid plan now and returns the user to Free. */
async function downgradeToFree(userId: string, actorId: string | null, reason: string) {
  const db = systemDb();
  const sub = await db.selectOne("subscriptions", { user_id: userId });
  if (!sub) return;
  await db.update("subscriptions", { user_id: userId }, {
    plan: "free", status: "active", provider: "none", provider_ref: null, price_monthly_eur: 0,
    current_period_end: null, cancel_at_period_end: false, canceled_at: new Date().toISOString(),
  });
  await db.update("profiles", { id: userId }, { plan: "free" });
  await audit(actorId, "subscription.canceled", { type: "user", id: userId }, { previous: sub.plan, reason });
}

/**
 * Demo / admin grants: back to Free immediately.
 * Stripe: cancel at the end of the paid period (the webhook downgrades when it ends).
 */
export async function cancelSubscription(user: Profile): Promise<"immediately" | "period_end"> {
  const db = systemDb();
  const sub = await db.selectOne("subscriptions", { user_id: user.id });
  if (!sub || sub.plan === "free") return "immediately";
  if (sub.provider === "stripe" && sub.provider_ref) {
    await getStripe().subscriptions.update(sub.provider_ref, { cancel_at_period_end: true });
    await db.update("subscriptions", { user_id: user.id }, { cancel_at_period_end: true });
    await audit(user.id, "subscription.cancel_scheduled", { type: "user", id: user.id }, { plan: sub.plan });
    return "period_end";
  }
  await downgradeToFree(user.id, user.id, "user_canceled");
  return "immediately";
}

/** Stripe Customer Portal (payment methods, invoices, plan changes). */
export async function createPortalUrl(user: Profile): Promise<string> {
  if (env.billingMode !== "stripe") throw new BillingError("The billing portal is available once Stripe is connected.");
  const sub = await systemDb().selectOne("subscriptions", { user_id: user.id });
  if (!sub?.stripe_customer_id) throw new BillingError("No Stripe customer yet — choose a plan first.");
  const session = await getStripe().billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: `${env.appUrl}/app/settings/billing`,
  });
  return session.url;
}

// ───────────────────────── Stripe webhook handling ─────────────────────────

export interface StripeLikeSubscription {
  id: string;
  status: string;
  customer: string | { id: string };
  cancel_at_period_end?: boolean | null;
  current_period_end?: number | null;
  metadata?: Record<string, string> | null;
  items?: { data: { current_period_end?: number | null; price?: { id: string } | null }[] } | null;
}

function planFromSubscription(s: StripeLikeSubscription): PlanId | null {
  const priceId = s.items?.data?.[0]?.price?.id;
  if (priceId && priceId === env.stripePricePremium) return "premium";
  if (priceId && priceId === env.stripePriceExclusive) return "exclusive";
  const meta = s.metadata?.plan;
  return isPlanId(meta) && meta !== "free" ? meta : null;
}

function periodEndOf(s: StripeLikeSubscription): string | null {
  const ts = s.items?.data?.[0]?.current_period_end ?? s.current_period_end; // newer API versions: on the item
  return ts ? new Date(ts * 1000).toISOString() : null;
}

const customerId = (c: StripeLikeSubscription["customer"]) => (typeof c === "string" ? c : c.id);

/** Finds the ONE user for a Stripe subscription (metadata first, then stored customer id). */
async function userIdFor(s: StripeLikeSubscription): Promise<string | null> {
  const db = systemDb();
  const metaUser = s.metadata?.user_id;
  if (metaUser && (await db.selectOne("profiles", { id: metaUser }))) return metaUser;
  const sub = await db.selectOne("subscriptions", { stripe_customer_id: customerId(s.customer) });
  return sub?.user_id ?? null;
}

/** Applies the state of a Stripe subscription to ONE. Idempotent. */
export async function syncStripeSubscription(s: StripeLikeSubscription) {
  const userId = await userIdFor(s);
  if (!userId) {
    console.warn("[billing] subscription for unknown user", s.id);
    return;
  }
  const db = systemDb();
  const current = await db.selectOne("subscriptions", { user_id: userId });
  // Ignore events for an older subscription the user no longer has.
  if (current?.provider === "stripe" && current.provider_ref && current.provider_ref !== s.id && s.status !== "active" && s.status !== "trialing") return;

  if (s.status === "active" || s.status === "trialing") {
    const plan = planFromSubscription(s);
    if (!plan) {
      console.warn("[billing] could not map subscription to a plan", s.id);
      return;
    }
    await activatePlan(userId, plan, "stripe", s.id, null, {
      stripeCustomerId: customerId(s.customer),
      periodEnd: periodEndOf(s),
      cancelAtPeriodEnd: !!s.cancel_at_period_end,
    });
  } else if (s.status === "past_due" || s.status === "incomplete") {
    // Keep access during Stripe's retry window, but flag it.
    await db.update("subscriptions", { user_id: userId }, { status: s.status === "past_due" ? "past_due" : "pending" });
  } else {
    // canceled, unpaid, incomplete_expired, paused
    if (current?.provider === "stripe") await downgradeToFree(userId, null, `stripe_${s.status}`);
  }
}

/** Checkout completed: mark our checkout record paid. The plan itself comes from the subscription. */
export async function completeStripeCheckout(session: { id: string; metadata?: Record<string, string> | null; customer?: string | { id: string } | null }) {
  const db = systemDb();
  const checkoutId = session.metadata?.checkout_id;
  const userId = session.metadata?.user_id;
  if (checkoutId && userId) {
    await db.update("billing_checkouts", { id: checkoutId, user_id: userId }, { status: "paid", confirmed_at: new Date().toISOString() });
  }
  if (userId && session.customer) {
    const cust = typeof session.customer === "string" ? session.customer : session.customer.id;
    await db.update("subscriptions", { user_id: userId }, { stripe_customer_id: cust });
  }
}

/** Returns false if this event was processed before. */
export async function claimBillingEvent(id: string, type: string): Promise<boolean> {
  const db = systemDb();
  if (await db.selectOne("billing_events", { id })) return false;
  try {
    await db.insert("billing_events", { id, type });
    return true;
  } catch {
    return false; // concurrent delivery (unique violation)
  }
}
