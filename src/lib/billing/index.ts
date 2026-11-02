import "server-only";
import { env } from "@/lib/config/env";
import { systemDb } from "@/lib/db";
import { PLANS, type PlanId } from "@/lib/config/plans";
import type { BillingCheckout, Profile } from "@/lib/db/types";
import { audit } from "@/lib/audit";

/**
 * Billing service.
 *
 * Plans are ONLY activated by `activatePlan()`, which is only reachable through:
 *  - `confirmDemoCheckout()` — demo mode, explicit user confirmation of a pending server-side checkout
 *  - the Stripe webhook (to be implemented: /api/billing/stripe-webhook, verifies signature)
 *  - an owner admin grant (audited)
 * The client can never set a plan directly.
 */
export class BillingError extends Error {}

export async function createCheckout(user: Profile, plan: PlanId): Promise<BillingCheckout> {
  if (plan === "free") throw new BillingError("The Free plan needs no checkout.");
  if (env.billingMode === "stripe") {
    // Architecture hook: create a Stripe Checkout Session here (price ids per plan),
    // store its id in billing_checkouts.provider ref and redirect to session.url.
    throw new BillingError("Stripe billing is not configured yet. Set ONE_BILLING_MODE=demo or finish the Stripe integration (see README).");
  }
  const db = systemDb();
  // Expire older pending checkouts of this user.
  await db.update("billing_checkouts", { user_id: user.id, status: "pending" }, { status: "canceled" });
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
  return checkout;
}

export async function getCheckout(user: Profile, id: string) {
  return systemDb().selectOne("billing_checkouts", { id, user_id: user.id });
}

/** Demo mode: the server validates the pending checkout before activating anything. */
export async function confirmDemoCheckout(user: Profile, checkoutId: string) {
  if (env.billingMode !== "demo") throw new BillingError("Demo payments are disabled.");
  const db = systemDb();
  const co = await db.selectOne("billing_checkouts", { id: checkoutId, user_id: user.id });
  if (!co) throw new BillingError("Checkout not found.");
  if (co.status !== "pending") throw new BillingError("This checkout is no longer open.");
  if (Date.parse(co.expires_at) < Date.now()) {
    await db.update("billing_checkouts", { id: co.id }, { status: "expired" });
    throw new BillingError("This checkout has expired. Please start again.");
  }
  await db.update("billing_checkouts", { id: co.id }, { status: "paid", confirmed_at: new Date().toISOString() });
  await activatePlan(user.id, co.plan, "demo", co.id, user.id);
}

export async function activatePlan(userId: string, plan: PlanId, provider: "demo" | "stripe" | "admin_grant" | "none", ref: string | null, actorId: string | null) {
  const db = systemDb();
  const periodEnd = plan === "free" ? null : new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();
  const sub = await db.selectOne("subscriptions", { user_id: userId });
  const patch = {
    plan,
    status: "active" as const,
    provider,
    provider_ref: ref,
    price_monthly_eur: provider === "admin_grant" ? 0 : PLANS[plan].priceMonthlyEur,
    current_period_end: periodEnd,
    canceled_at: null,
  };
  if (sub) await db.update("subscriptions", { user_id: userId }, patch);
  else await db.insert("subscriptions", { user_id: userId, ...patch });
  await db.update("profiles", { id: userId }, { plan });
  await audit(actorId, "subscription.plan_changed", { type: "user", id: userId }, { plan, provider, previous: sub?.plan ?? null });
}

/** Cancel → back to Free immediately (demo). With Stripe this would cancel at period end via webhook. */
export async function cancelSubscription(user: Profile) {
  const db = systemDb();
  const sub = await db.selectOne("subscriptions", { user_id: user.id });
  if (!sub || sub.plan === "free") return;
  await db.update("subscriptions", { user_id: user.id }, {
    plan: "free", status: "active", provider: "none", provider_ref: null, price_monthly_eur: 0,
    current_period_end: null, canceled_at: new Date().toISOString(),
  });
  await db.update("profiles", { id: user.id }, { plan: "free" });
  await audit(user.id, "subscription.canceled", { type: "user", id: user.id }, { previous: sub.plan });
}
