import "server-only";
import { env } from "@/lib/config/env";
import { systemDb } from "@/lib/db";
import { type PlanId } from "@/lib/config/plans";
import { findPlan } from "@/lib/plans-store";
import type { BillingCheckout, Profile, Subscription } from "@/lib/db/types";
import { audit } from "@/lib/audit";
import { getStripe, priceIdFor, planIdForPrice } from "./stripe";

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

/**
 * Starts a checkout for a personal plan (orgId omitted) or a business plan (orgId = the company,
 * caller must have verified the `org.billing` permission). Prices always come from the server catalogue.
 */
export async function createCheckout(user: Profile, plan: PlanId, orgId: string | null = null): Promise<CheckoutStart> {
  const def = await findPlan(plan);
  const world = orgId ? "business" : "personal";
  if (!def || def.world !== world || !def.active) throw new BillingError("This plan is not available.");
  if (def.priceMonthlyEur === null) throw new BillingError("The price for this plan hasn't been set yet. Please contact us.");
  if (def.priceMonthlyEur === 0) throw new BillingError("The Free plan needs no checkout.");
  const amount = def.priceMonthlyEur;
  const db = systemDb();
  await db.update("billing_checkouts", { user_id: user.id, status: "pending" }, { status: "canceled" });

  if (env.billingMode === "stripe") {
    const stripe = getStripe();
    const price = priceIdFor(plan);
    const sub = orgId ? null : await db.selectOne("subscriptions", { user_id: user.id });
    const org = orgId ? await db.selectOne("organizations", { id: orgId }) : null;
    if ((sub?.provider === "stripe" && sub.provider_ref && sub.plan !== "free") || (org?.provider === "stripe" && org.provider_ref && org.subscription_status === "active")) {
      throw new BillingError("You already have an active subscription. Use “Manage billing” to change it.");
    }
    const checkout = await db.insert("billing_checkouts", {
      user_id: user.id, org_id: orgId, plan, provider: "stripe", status: "pending",
      amount_eur: amount,
      expires_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(), // Stripe sessions live 24h
      confirmed_at: null,
    });
    const meta: Record<string, string> = { user_id: user.id, plan, checkout_id: checkout.id, ...(orgId ? { org_id: orgId } : {}) };
    const customer = orgId ? org?.stripe_customer_id : sub?.stripe_customer_id;
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price, quantity: 1 }],
      client_reference_id: user.id,
      ...(customer ? { customer } : { customer_email: user.email }),
      metadata: meta,
      subscription_data: { metadata: meta },
      allow_promotion_codes: true,
      success_url: `${env.appUrl}/checkout/${checkout.id}?status=success`,
      cancel_url: `${env.appUrl}${orgId ? "/business/settings/billing" : "/app/settings/billing"}?checkout=canceled`,
    });
    if (!session.url) throw new BillingError("Stripe did not return a checkout URL.");
    await audit(user.id, "billing.checkout_created", { type: "checkout", id: checkout.id }, { plan, provider: "stripe", session: session.id });
    return { checkout, url: session.url };
  }

  const checkout = await db.insert("billing_checkouts", {
    user_id: user.id,
    org_id: orgId,
    plan,
    provider: "demo",
    status: "pending",
    amount_eur: amount,
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
  if (co.org_id) await activateOrgPlan(co.org_id, co.plan, "demo", co.id, user.id);
  else await activatePlan(user.id, co.plan, "demo", co.id, user.id);
  return co;
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
    price_monthly_eur: provider === "admin_grant" || plan === "free" ? 0 : ((await findPlan(plan))?.priceMonthlyEur ?? 0),
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

/** Business: activates (or changes) the plan of an organization. */
export async function activateOrgPlan(
  orgId: string,
  plan: PlanId,
  provider: "demo" | "stripe" | "admin_grant" | "none",
  ref: string | null,
  actorId: string | null,
  extra: { stripeCustomerId?: string | null; periodEnd?: string | null; status?: "active" | "trial" | "past_due" | "canceled" } = {},
) {
  const db = systemDb();
  const org = await db.selectOne("organizations", { id: orgId });
  if (!org) throw new BillingError("Company not found.");
  const def = await findPlan(plan);
  if (!def || def.world !== "business") throw new BillingError("Not a business plan.");
  await db.update("organizations", { id: orgId }, {
    plan,
    subscription_status: extra.status ?? "active",
    provider,
    provider_ref: ref,
    stripe_customer_id: extra.stripeCustomerId ?? org.stripe_customer_id ?? null,
    price_monthly_eur: provider === "admin_grant" ? 0 : def.priceMonthlyEur ?? 0,
    current_period_end: extra.periodEnd ?? new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
    canceled_at: null,
  });
  if (org.plan !== plan || org.subscription_status !== (extra.status ?? "active")) {
    await audit(actorId, "subscription.plan_changed", { type: "org", id: orgId }, { plan, provider, previous: org.plan, world: "business" });
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
export async function createPortalUrl(user: Profile, orgId: string | null = null): Promise<string> {
  if (env.billingMode !== "stripe") throw new BillingError("The billing portal is available once Stripe is connected.");
  const customer = orgId
    ? (await systemDb().selectOne("organizations", { id: orgId }))?.stripe_customer_id
    : (await systemDb().selectOne("subscriptions", { user_id: user.id }))?.stripe_customer_id;
  if (!customer) throw new BillingError("No Stripe customer yet — choose a plan first.");
  const session = await getStripe().billingPortal.sessions.create({
    customer,
    return_url: `${env.appUrl}${orgId ? "/business/settings/billing" : "/app/settings/billing"}`,
  });
  return session.url;
}

/** Business: cancel the company plan (Stripe: at period end; otherwise immediately back to trial-expired state). */
export async function cancelOrgSubscription(orgId: string, actorId: string): Promise<"immediately" | "period_end"> {
  const db = systemDb();
  const org = await db.selectOne("organizations", { id: orgId });
  if (!org) throw new BillingError("Company not found.");
  if (org.provider === "stripe" && org.provider_ref) {
    await getStripe().subscriptions.update(org.provider_ref, { cancel_at_period_end: true });
    await audit(actorId, "subscription.cancel_scheduled", { type: "org", id: orgId }, { plan: org.plan, world: "business" });
    return "period_end";
  }
  await db.update("organizations", { id: orgId }, { subscription_status: "canceled", provider: "none", provider_ref: null, price_monthly_eur: 0, canceled_at: new Date().toISOString() });
  await audit(actorId, "subscription.canceled", { type: "org", id: orgId }, { previous: org.plan, world: "business" });
  return "immediately";
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

async function planFromSubscription(s: StripeLikeSubscription): Promise<PlanId | null> {
  const priceId = s.items?.data?.[0]?.price?.id;
  if (priceId) {
    const byPrice = planIdForPrice(priceId);
    if (byPrice) return byPrice;
  }
  const meta = s.metadata?.plan;
  const def = meta ? await findPlan(meta) : null;
  return def && def.priceMonthlyEur !== 0 ? def.id : null;
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
  // Business subscriptions are attached to an organization.
  const db0 = systemDb();
  const orgId = s.metadata?.org_id && (await db0.selectOne("organizations", { id: s.metadata.org_id }))
    ? s.metadata.org_id
    : (await db0.selectOne("organizations", { stripe_customer_id: customerId(s.customer) }))?.id;
  if (orgId) return syncOrgSubscription(orgId, s);
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
    const plan = await planFromSubscription(s);
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

async function syncOrgSubscription(orgId: string, s: StripeLikeSubscription) {
  const db = systemDb();
  const org = await db.selectOne("organizations", { id: orgId });
  if (!org) return;
  if (org.provider === "stripe" && org.provider_ref && org.provider_ref !== s.id && s.status !== "active" && s.status !== "trialing") return;
  if (s.status === "active" || s.status === "trialing") {
    const plan = await planFromSubscription(s);
    if (!plan) return console.warn("[billing] could not map business subscription to a plan", s.id);
    await activateOrgPlan(orgId, plan, "stripe", s.id, null, { stripeCustomerId: customerId(s.customer), periodEnd: periodEndOf(s) });
  } else if (s.status === "past_due" || s.status === "incomplete") {
    await db.update("organizations", { id: orgId }, { subscription_status: "past_due" });
  } else if (org.provider === "stripe") {
    await db.update("organizations", { id: orgId }, { subscription_status: "canceled", provider: "none", provider_ref: null, price_monthly_eur: 0, canceled_at: new Date().toISOString() });
    await audit(null, "subscription.canceled", { type: "org", id: orgId }, { previous: org.plan, reason: `stripe_${s.status}`, world: "business" });
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
    if (session.metadata?.org_id) await db.update("organizations", { id: session.metadata.org_id }, { stripe_customer_id: cust });
    else await db.update("subscriptions", { user_id: userId }, { stripe_customer_id: cust });
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
